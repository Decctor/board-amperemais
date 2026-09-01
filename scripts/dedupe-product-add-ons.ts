import "@/utils/scripts/load-next-env";

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { connection, db } from "@/services/drizzle";
import { catalogLinks, productAddOnOptions, productAddOnReferences, productAddOns, saleItemModifiers } from "@/services/drizzle/schema";
import { and, eq, inArray, sql } from "drizzle-orm";

// Mescla grupos de adicionais duplicados criados pelo fluxo antigo (um grupo por produto).
//
// Contexto: até a criação do registry de adicionais, todo grupo era criado atrelado a um único
// produto — orgs que repetiam "Borda", "Extras" etc. em vários produtos acumularam N grupos de
// conteúdo idêntico. Este script agrupa os grupos ATIVOS de cada organização por assinatura de
// conteúdo (nome, nome interno, min/max e o conjunto de opções ativas) e mescla cada cluster em
// um único sobrevivente, re-apontando vínculos e histórico.
//
// Regras de mesclagem por cluster:
//   - Identidade externa (id_externo no grupo/opção ou linha em catalog_links) é preservada:
//     0 membros externos -> sobrevivente é o grupo com mais produtos vinculados (empate: menor id);
//     1 membro externo   -> ele é o sobrevivente;
//     2+ membros externos -> cluster PULADO (mesclar quebraria o mapeamento dos conectores).
//   - Referências (produto/variante) dos perdedores são re-apontadas para o sobrevivente;
//     duplicatas exatas de escopo são removidas.
//   - sale_item_modifiers.opcao_id é re-apontado para a opção equivalente do sobrevivente antes
//     de qualquer delete (o FK é set-null: sem re-apontar, o histórico perderia o vínculo).
//   - Opções sem equivalente no sobrevivente (soft-deletadas, ativo=false) são MOVIDAS para o
//     sobrevivente em vez de deletadas, preservando o histórico de vendas que aponta para elas.
//   - Por fim o grupo perdedor é deletado (cascade limpa opções re-apontadas e refs restantes).
//
// Em modo --apply, um snapshot JSON completo dos clusters mesclados é gravado em
// tmp/dedupe-product-add-ons/ antes de qualquer mutação, para permitir reversão manual.
//
// Modo --delete-orphans: remove grupos ATIVOS descartáveis — sem nenhum produto vinculado, sem
// identidade externa (id_externo/catalog_links) e sem nenhum modificador de venda apontando para
// suas opções. São as cópias manuais que o fluxo antigo deixou para trás: não há o que mesclar,
// pois nada aponta para elas. Grupos que falham em qualquer um desses testes são BLOQUEADOS e
// listados com o motivo. Nunca toca em grupos que participam de um cluster de mesclagem.
//
// Uso: npx tsx ./scripts/dedupe-product-add-ons.ts [--org=<id>] [--explain] [--delete-orphans] [--apply]
//   --explain         detalha, por família de mesmo nome, o que difere entre os grupos.
//   --delete-orphans  inclui a limpeza de grupos órfãos descartáveis na análise/execução.

type TArgs = { apply: boolean; explain: boolean; deleteOrphans: boolean; organizationId: string | null };

function getArgValue(name: string) {
	const prefix = `--${name}=`;
	return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? null;
}

function parseArgs(): TArgs {
	return {
		apply: process.argv.includes("--apply"),
		explain: process.argv.includes("--explain"),
		deleteOrphans: process.argv.includes("--delete-orphans"),
		organizationId: getArgValue("org") ?? getArgValue("orgId"),
	};
}

function normalizeText(value: string | null | undefined) {
	return (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

type TGroupRow = typeof productAddOns.$inferSelect & {
	opcoes: (typeof productAddOnOptions.$inferSelect)[];
	produtos: (typeof productAddOnReferences.$inferSelect)[];
};

// `codigo` fica de fora de propósito: cópias manuais de grupos sincronizados por conector têm as
// mesmas opções sem os códigos — conteúdo/comportamento idênticos ainda são o mesmo adicional.
function optionSignature(option: typeof productAddOnOptions.$inferSelect) {
	return [
		normalizeText(option.nome),
		option.precoDelta ?? 0,
		option.maxQtdePorItem ?? 1,
		option.produtoId ?? "",
		option.produtoVarianteId ?? "",
		option.quantidadeConsumo ?? 1,
	].join("|");
}

function groupSignature(group: TGroupRow) {
	const activeOptionSignatures = group.opcoes
		.filter((option) => option.ativo)
		.map(optionSignature)
		.sort();
	return [normalizeText(group.nome), normalizeText(group.internoNome), group.minOpcoes, group.maxOpcoes, ...activeOptionSignatures].join("::");
}

function chunk<T>(items: T[], size: number): T[][] {
	const chunks: T[][] = [];
	for (let index = 0; index < items.length; index += size) {
		chunks.push(items.slice(index, index + size));
	}
	return chunks;
}

type TClusterPlan = {
	organizacaoId: string;
	signaturePreview: string;
	survivor: TGroupRow;
	losers: TGroupRow[];
	skippedReason: string | null;
	// Por perdedor: o que acontece com cada referência e cada opção.
	referencesToRepoint: { referenceId: string; loserId: string; produtoId: string; produtoVarianteId: string | null }[];
	referencesToDelete: { referenceId: string; loserId: string; produtoId: string; produtoVarianteId: string | null }[];
	optionsToRepointModifiers: { loserOptionId: string; survivorOptionId: string; modifierCount: number }[];
	optionsToMove: { loserOptionId: string; loserId: string }[];
};

type TOrphanPlan = { group: TGroupRow; blockedReason: string | null };

function hasExternalIdentity(group: TGroupRow, externallyLinkedGroupIds: Set<string>, externallyLinkedOptionIds: Set<string>) {
	if (group.idExterno) return true;
	if (externallyLinkedGroupIds.has(group.id)) return true;
	return group.opcoes.some((option) => option.idExterno || externallyLinkedOptionIds.has(option.id));
}

function planCluster({
	members,
	externallyLinkedGroupIds,
	externallyLinkedOptionIds,
	modifierCountByOptionId,
}: {
	members: TGroupRow[];
	externallyLinkedGroupIds: Set<string>;
	externallyLinkedOptionIds: Set<string>;
	modifierCountByOptionId: Map<string, number>;
}): TClusterPlan {
	const [first] = members;
	const base: Omit<TClusterPlan, "survivor" | "losers"> = {
		organizacaoId: first.organizacaoId,
		signaturePreview: `${first.nome}${first.internoNome ? ` (${first.internoNome})` : ""}`,
		skippedReason: null,
		referencesToRepoint: [],
		referencesToDelete: [],
		optionsToRepointModifiers: [],
		optionsToMove: [],
	};

	const externalMembers = members.filter((group) => hasExternalIdentity(group, externallyLinkedGroupIds, externallyLinkedOptionIds));
	if (externalMembers.length > 1) {
		return {
			...base,
			survivor: first,
			losers: [],
			skippedReason: `${externalMembers.length} membros com identidade externa (id_externo/catalog_links) — mesclar quebraria o mapeamento dos conectores`,
		};
	}

	const survivor =
		externalMembers[0] ??
		[...members].sort((a, b) => b.produtos.length - a.produtos.length || a.id.localeCompare(b.id))[0];
	const losers = members.filter((group) => group.id !== survivor.id);

	// Fila de opções do sobrevivente por assinatura: perdedores com opções duplicadas internamente
	// consomem sobreviventes distintos na ordem, sem re-apontar duas opções para o mesmo destino.
	const survivorOptionQueues = new Map<string, string[]>();
	for (const option of survivor.opcoes.filter((item) => item.ativo)) {
		const signature = optionSignature(option);
		survivorOptionQueues.set(signature, [...(survivorOptionQueues.get(signature) ?? []), option.id]);
	}

	const plan: TClusterPlan = { ...base, survivor, losers };

	const survivorScopes = new Set(survivor.produtos.map((reference) => `${reference.produtoId}|${reference.produtoVarianteId ?? ""}`));

	for (const loser of losers) {
		for (const reference of loser.produtos) {
			const scope = `${reference.produtoId}|${reference.produtoVarianteId ?? ""}`;
			const target = { referenceId: reference.id, loserId: loser.id, produtoId: reference.produtoId, produtoVarianteId: reference.produtoVarianteId };
			if (survivorScopes.has(scope)) {
				plan.referencesToDelete.push(target);
			} else {
				survivorScopes.add(scope);
				plan.referencesToRepoint.push(target);
			}
		}

		const queues = new Map([...survivorOptionQueues.entries()].map(([signature, ids]) => [signature, [...ids]]));
		for (const option of loser.opcoes) {
			const survivorOptionId = option.ativo ? queues.get(optionSignature(option))?.shift() : undefined;
			if (survivorOptionId) {
				const modifierCount = modifierCountByOptionId.get(option.id) ?? 0;
				if (modifierCount > 0) {
					plan.optionsToRepointModifiers.push({ loserOptionId: option.id, survivorOptionId, modifierCount });
				}
			} else {
				// Sem equivalente (opção soft-deletada, ou ativa sem par por corrida): mover para o
				// sobrevivente preserva o histórico de vendas apontando para ela.
				plan.optionsToMove.push({ loserOptionId: option.id, loserId: loser.id });
			}
		}
	}

	return plan;
}

async function applyCluster(plan: TClusterPlan) {
	await db.transaction(async (tx) => {
		for (const repoint of plan.optionsToRepointModifiers) {
			await tx.update(saleItemModifiers).set({ opcaoId: repoint.survivorOptionId }).where(eq(saleItemModifiers.opcaoId, repoint.loserOptionId));
		}

		for (const move of plan.optionsToMove) {
			await tx
				.update(productAddOnOptions)
				.set({ produtoAddOnId: plan.survivor.id, ativo: false })
				.where(eq(productAddOnOptions.id, move.loserOptionId));
		}

		for (const reference of plan.referencesToDelete) {
			await tx.delete(productAddOnReferences).where(eq(productAddOnReferences.id, reference.referenceId));
		}

		for (const reference of plan.referencesToRepoint) {
			await tx.update(productAddOnReferences).set({ produtoAddOnId: plan.survivor.id }).where(eq(productAddOnReferences.id, reference.referenceId));
		}

		const loserIds = plan.losers.map((loser) => loser.id);
		if (loserIds.length > 0) {
			await tx.delete(productAddOns).where(inArray(productAddOns.id, loserIds));
		}
	});
}

const MEMBER_LETTERS = "ABCDEFGH";

/** Detalha uma família de mesmo nome: membros, vínculos e a matriz de opções divergentes. */
function explainFamily(members: TGroupRow[]) {
	const [first] = members;
	const sorted = [...members].sort((a, b) => b.produtos.length - a.produtos.length || a.id.localeCompare(b.id));
	console.log(`${"=".repeat(96)}
org ${first.organizacaoId.slice(0, 8)} | "${first.nome}" | ${sorted.length} grupos`);

	sorted.forEach((group, index) => {
		const activeOptions = group.opcoes.filter((option) => option.ativo);
		const external = group.idExterno
			? `ext:${group.idExterno}`
			: activeOptions.some((option) => option.idExterno)
				? "ext:opções"
				: "SEM ext";
		console.log(
			`  ${MEMBER_LETTERS[index]} ${group.id.slice(0, 8)} | regra ${group.minOpcoes}/${group.maxOpcoes} | ${group.produtos.length} produtos | ` +
				`${activeOptions.length} opções | ${external}${group.internoNome ? ` | interno: ${group.internoNome}` : ""}`,
		);
	});

	const optionNames = [
		...new Set(sorted.flatMap((group) => group.opcoes.filter((option) => option.ativo).map((option) => normalizeText(option.nome)))),
	].sort();
	const divergent: string[] = [];
	let identical = 0;
	for (const name of optionNames) {
		const cells = sorted.map((group) => group.opcoes.find((option) => option.ativo && normalizeText(option.nome) === name));
		const found = cells.filter((cell): cell is NonNullable<typeof cell> => Boolean(cell));
		const prices = [...new Set(found.map((cell) => cell.precoDelta ?? 0))];
		const links = [...new Set(found.map((cell) => `${cell.produtoId ?? ""}|${cell.produtoVarianteId ?? ""}`))];
		if (cells.every(Boolean) && prices.length === 1 && links.length === 1) {
			identical += 1;
			continue;
		}
		const presence = cells.map((cell) => (cell ? "x" : "-")).join(" ");
		const priceNote =
			prices.length > 1
				? ` PREÇOS DIVERGEM: ${cells.map((cell, i) => (cell ? `${MEMBER_LETTERS[i]}=${(cell.precoDelta ?? 0).toFixed(2)}` : "")).filter(Boolean).join(" ")}`
				: ` ${(prices[0] ?? 0).toFixed(2)}`;
		const linkNote = links.length > 1 ? " | vínculo de estoque divergente" : "";
		divergent.push(`    ${presence}  ${found[0].nome}${priceNote}${linkNote}`);
	}
	console.log(
		`  Opções (${MEMBER_LETTERS.slice(0, sorted.length).split("").join(" ")}): ${identical} idênticas` +
			`${divergent.length ? `, ${divergent.length} divergentes:` : ""}`,
	);
	for (const row of divergent.slice(0, 20)) console.log(row);
	if (divergent.length > 20) console.log(`    ... +${divergent.length - 20} linhas`);
	console.log("");
}

async function main() {
	const args = parseArgs();
	console.log(`Modo: ${args.apply ? "APPLY" : "DRY-RUN"}${args.organizationId ? ` | org: ${args.organizationId}` : ""}\n`);

	const groups = (await db.query.productAddOns.findMany({
		where: and(eq(productAddOns.ativo, true), args.organizationId ? eq(productAddOns.organizacaoId, args.organizationId) : undefined),
		with: {
			opcoes: true,
			produtos: true,
		},
	})) as TGroupRow[];

	console.log(`Grupos ativos carregados: ${groups.length}`);

	const clusters = new Map<string, TGroupRow[]>();
	for (const group of groups) {
		const key = `${group.organizacaoId}::${groupSignature(group)}`;
		clusters.set(key, [...(clusters.get(key) ?? []), group]);
	}
	const duplicateClusters = [...clusters.values()].filter((members) => members.length > 1);
	console.log(`Clusters com duplicatas exatas: ${duplicateClusters.length}\n`);

	// Informativo: grupos de mesmo nome na mesma org que NÃO são duplicatas exatas (regras ou
	// opções divergem). Não são mesclados — servem de guia para revisão manual no registry.
	const sameNameIndex = new Map<string, TGroupRow[]>();
	for (const group of groups) {
		const key = `${group.organizacaoId}::${normalizeText(group.nome)}`;
		sameNameIndex.set(key, [...(sameNameIndex.get(key) ?? []), group]);
	}
	const nearDuplicates = [...sameNameIndex.values()].filter((members) => {
		if (members.length < 2) return false;
		const signatures = new Set(members.map(groupSignature));
		return signatures.size > 1;
	});
	if (nearDuplicates.length > 0) {
		console.log(`Quase-duplicatas (mesmo nome, conteúdo diferente — revisão manual): ${nearDuplicates.length}`);
		if (args.explain) {
			console.log("");
			for (const members of nearDuplicates) explainFamily(members);
		} else {
			for (const members of nearDuplicates) {
				const [first] = members;
				const rules = [...new Set(members.map((group) => `${group.minOpcoes}/${group.maxOpcoes}`))];
				const reason = rules.length > 1 ? `regras divergem (${rules.join(", ")})` : "opções divergem";
				console.log(`  - org ${first.organizacaoId} | "${first.nome}" | ${members.length} grupos | ${reason}`);
			}
			console.log("  (rode com --explain para ver a matriz de opções de cada família)");
		}
		console.log("");
	}

	if (duplicateClusters.length === 0 && !args.deleteOrphans) {
		console.log("Nada a mesclar. (rode com --delete-orphans para avaliar grupos órfãos descartáveis)");
		return;
	}

	// Candidatos a órfão: sem produtos, sem id_externo próprio ou nas opções, e fora de qualquer
	// cluster de mesclagem (para os dois caminhos nunca disputarem o mesmo grupo).
	const clusteredGroupIds = new Set(duplicateClusters.flat().map((group) => group.id));
	const orphanCandidates = args.deleteOrphans
		? groups.filter(
				(group) =>
					!clusteredGroupIds.has(group.id) &&
					group.produtos.length === 0 &&
					!group.idExterno &&
					!group.opcoes.some((option) => option.idExterno),
			)
		: [];

	const analyzedGroups = [...duplicateClusters.flat(), ...orphanCandidates];
	const involvedGroupIds = analyzedGroups.map((group) => group.id);
	const involvedOptionIds = analyzedGroups.flatMap((group) => group.opcoes.map((option) => option.id));

	const externallyLinkedGroupIds = new Set<string>();
	const externallyLinkedOptionIds = new Set<string>();
	for (const groupIdChunk of chunk(involvedGroupIds, 500)) {
		const rows = await db
			.select({ produtoAddOnId: catalogLinks.produtoAddOnId })
			.from(catalogLinks)
			.where(inArray(catalogLinks.produtoAddOnId, groupIdChunk));
		for (const row of rows) {
			if (row.produtoAddOnId) externallyLinkedGroupIds.add(row.produtoAddOnId);
		}
	}
	for (const optionIdChunk of chunk(involvedOptionIds, 500)) {
		const rows = await db
			.select({ produtoAddOnOpcaoId: catalogLinks.produtoAddOnOpcaoId })
			.from(catalogLinks)
			.where(inArray(catalogLinks.produtoAddOnOpcaoId, optionIdChunk));
		for (const row of rows) {
			if (row.produtoAddOnOpcaoId) externallyLinkedOptionIds.add(row.produtoAddOnOpcaoId);
		}
	}

	const modifierCountByOptionId = new Map<string, number>();
	for (const optionIdChunk of chunk(involvedOptionIds, 500)) {
		const rows = await db
			.select({ opcaoId: saleItemModifiers.opcaoId, total: sql<number>`count(*)::int` })
			.from(saleItemModifiers)
			.where(inArray(saleItemModifiers.opcaoId, optionIdChunk))
			.groupBy(saleItemModifiers.opcaoId);
		for (const row of rows) {
			if (row.opcaoId) modifierCountByOptionId.set(row.opcaoId, row.total);
		}
	}

	const plans = duplicateClusters.map((members) =>
		planCluster({ members, externallyLinkedGroupIds, externallyLinkedOptionIds, modifierCountByOptionId }),
	);

	const mergeablePlans = plans.filter((plan) => !plan.skippedReason);
	const skippedPlans = plans.filter((plan) => plan.skippedReason);

	let clusterIndex = 0;
	for (const plan of mergeablePlans) {
		clusterIndex += 1;
		const totalModifiers = plan.optionsToRepointModifiers.reduce((sum, item) => sum + item.modifierCount, 0);
		console.log(
			`[${clusterIndex}] org ${plan.organizacaoId} | "${plan.signaturePreview}" | ${plan.losers.length + 1} grupos -> sobrevivente ${plan.survivor.id}`,
		);
		console.log(
			`    perdedores: ${plan.losers.map((loser) => loser.id).join(", ")}`,
		);
		console.log(
			`    refs re-apontadas: ${plan.referencesToRepoint.length} | refs duplicadas removidas: ${plan.referencesToDelete.length} | modificadores de venda re-apontados: ${totalModifiers} | opções movidas (soft-deletadas): ${plan.optionsToMove.length}`,
		);
	}

	if (skippedPlans.length > 0) {
		console.log(`\nClusters pulados (${skippedPlans.length}):`);
		for (const plan of skippedPlans) {
			console.log(`  - org ${plan.organizacaoId} | "${plan.signaturePreview}": ${plan.skippedReason}`);
		}
	}

	const orphanPlans: TOrphanPlan[] = orphanCandidates.map((group) => {
		const externalOption = group.opcoes.find((option) => externallyLinkedOptionIds.has(option.id));
		const soldOption = group.opcoes.find((option) => (modifierCountByOptionId.get(option.id) ?? 0) > 0);
		if (externallyLinkedGroupIds.has(group.id)) return { group, blockedReason: "possui vínculo em catalog_links" };
		if (externalOption) return { group, blockedReason: `opção ${externalOption.id} possui vínculo em catalog_links` };
		if (soldOption) {
			const total = modifierCountByOptionId.get(soldOption.id) ?? 0;
			return { group, blockedReason: `opção "${soldOption.nome}" tem ${total} modificador(es) de venda no histórico` };
		}
		return { group, blockedReason: null };
	});
	const orphansToDelete = orphanPlans.filter((plan) => !plan.blockedReason).map((plan) => plan.group);
	const orphansBlocked = orphanPlans.filter((plan) => plan.blockedReason);

	if (args.deleteOrphans) {
		console.log(`\nGrupos órfãos descartáveis (sem produtos, sem identidade externa, sem histórico): ${orphansToDelete.length}`);
		for (const group of orphansToDelete) {
			const activeOptions = group.opcoes.filter((option) => option.ativo).length;
			console.log(
				`  - org ${group.organizacaoId.slice(0, 8)} | ${group.id} | "${group.nome}" | regra ${group.minOpcoes}/${group.maxOpcoes} | ${activeOptions} opções`,
			);
		}
		if (orphansBlocked.length > 0) {
			console.log(`\nÓrfãos BLOQUEADOS (${orphansBlocked.length}):`);
			for (const plan of orphansBlocked) {
				console.log(`  - ${plan.group.id} | "${plan.group.nome}": ${plan.blockedReason}`);
			}
		}
	}

	const totals = {
		clustersMergeable: mergeablePlans.length,
		clustersSkipped: skippedPlans.length,
		groupsToDelete: mergeablePlans.reduce((sum, plan) => sum + plan.losers.length, 0),
		referencesToRepoint: mergeablePlans.reduce((sum, plan) => sum + plan.referencesToRepoint.length, 0),
		referencesToDelete: mergeablePlans.reduce((sum, plan) => sum + plan.referencesToDelete.length, 0),
		saleModifiersToRepoint: mergeablePlans.reduce(
			(sum, plan) => sum + plan.optionsToRepointModifiers.reduce((inner, item) => inner + item.modifierCount, 0),
			0,
		),
		optionsToMove: mergeablePlans.reduce((sum, plan) => sum + plan.optionsToMove.length, 0),
		orphansToDelete: orphansToDelete.length,
		orphansBlocked: orphansBlocked.length,
	};
	console.log(`\nResumo: ${JSON.stringify(totals, null, 2)}`);

	if (!args.apply) {
		console.log("\nDry-run: nenhuma alteração aplicada. Rode com --apply para executar.");
		return;
	}

	if (mergeablePlans.length === 0 && orphansToDelete.length === 0) {
		console.log("\nNada a aplicar.");
		return;
	}

	const snapshotDir = join(process.cwd(), "tmp", "dedupe-product-add-ons");
	mkdirSync(snapshotDir, { recursive: true });
	const snapshotPath = join(snapshotDir, `${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
	writeFileSync(snapshotPath, JSON.stringify({ args, totals, plans: mergeablePlans, orphansToDelete }, null, 2), "utf-8");
	console.log(`\nSnapshot gravado em ${snapshotPath}`);

	let applied = 0;
	let failed = 0;
	for (const plan of mergeablePlans) {
		try {
			await applyCluster(plan);
			applied += 1;
		} catch (error) {
			failed += 1;
			console.error(`ERRO ao mesclar cluster "${plan.signaturePreview}" (org ${plan.organizacaoId}, sobrevivente ${plan.survivor.id}):`, error);
		}
	}

	console.log(`\nAplicado: ${applied}/${mergeablePlans.length} clusters | Falhas: ${failed}`);

	if (orphansToDelete.length > 0) {
		let deleted = 0;
		for (const orphanChunk of chunk(
			orphansToDelete.map((group) => group.id),
			100,
		)) {
			try {
				const removed = await db.delete(productAddOns).where(inArray(productAddOns.id, orphanChunk)).returning({ id: productAddOns.id });
				deleted += removed.length;
			} catch (error) {
				failed += 1;
				console.error("ERRO ao remover lote de grupos órfãos:", error);
			}
		}
		console.log(`Órfãos removidos: ${deleted}/${orphansToDelete.length}`);
	}

	if (failed > 0) process.exitCode = 1;
}

main()
	.catch((error) => {
		console.error(error);
		process.exitCode = 1;
	})
	.finally(() => connection.end());
