import "@/utils/scripts/load-next-env";

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { connection, db } from "@/services/drizzle";
import { integrations, productAddOnOptions, productAddOnReferences, productAddOns, saleItemModifiers } from "@/services/drizzle/schema";
import { and, eq, inArray, sql } from "drizzle-orm";

// TEMPORÁRIO — consolidação dos grupos "Escolha seu gelato" da Congelatte.
//
// Contexto: o fluxo antigo (um grupo por produto) espalhou a MESMA lista de sabores por 6 grupos
// que diferem só na regra de quantas escolhas o produto permite (1, 2 ou 3 sabores conforme o
// tamanho). Com o override de regra por vínculo (drizzle/0091), a regra deixa de justificar
// grupos separados: um único grupo de sabores atende todos os produtos, e cada vínculo carrega
// seu próprio máximo. Mudar um sabor passa a ser UMA edição.
//
// O que faz, por organização:
//   1. Escolhe o sobrevivente (mais vínculos; empate pelo maior número de opções ativas).
//   2. Lista canônica = UNIÃO das opções ativas de todos os grupos, por nome normalizado. As que
//      faltam no sobrevivente são inseridas nele; conflitos de preço/vínculo de estoque mantêm a
//      versão do sobrevivente e são REPORTADOS.
//   3. Re-aponta os vínculos dos perdedores para o sobrevivente, gravando o override de regra a
//      partir do grupo de origem (origem 1/1 -> max 1; 1/3 -> max 3; igual ao sobrevivente -> null).
//   4. Exceção explícita: produtos cujo nome contém "3 sabores" recebem max 3 (corrige a
//      "Gelato na Cestinha - até 3 sabores", hoje presa num grupo 1/2).
//   5. Re-aponta sale_item_modifiers das opções perdedoras para a opção canônica de mesmo nome
//      ANTES de qualquer delete (o FK é set-null: sem isso o histórico perde o vínculo).
//   6. Zera id_externo do sobrevivente e das suas opções: a org saiu do cardápio-web e o catalog
//      sync faz upsert por id_externo — sem isso, uma reconexão sobrescreveria o grupo canônico.
//   7. Deleta os grupos perdedores (cascade limpa opções e vínculos remanescentes).
//
// Guardas: aborta se a migração 0091 não estiver aplicada, ou se a integração CARDAPIO-WEB da org
// ainda estiver ativa (nesse caso o sync desfaria tudo no próximo cron).
//
// Uso: npx tsx ./scripts/tmp-congelatte-consolidate-gelato.ts --org=<id> [--keep-milkshake] [--apply]
//   --keep-milkshake  preserva o grupo dos milk shakes como grupo próprio (não mescla).
//
// Apagar este arquivo depois de rodar nas duas orgs da Congelatte.

const GELATO_GROUP_NAMES = ["escolha seu gelato", "escolha seu gelato:"];
/** Grupo cujos sabores são exclusivos de milk shake — separável via --keep-milkshake. */
const MILKSHAKE_GROUP_HINT = "milk shake";

type TArgs = { apply: boolean; keepMilkshake: boolean; organizationId: string };

function getArgValue(name: string) {
	const prefix = `--${name}=`;
	return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? null;
}

function parseArgs(): TArgs {
	const organizationId = getArgValue("org") ?? getArgValue("orgId");
	if (!organizationId) throw new Error("Informe a organização: --org=<organizationId>");
	return {
		apply: process.argv.includes("--apply"),
		keepMilkshake: process.argv.includes("--keep-milkshake"),
		organizationId,
	};
}

function normalizeText(value: string | null | undefined) {
	return (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

type TGroup = typeof productAddOns.$inferSelect & {
	opcoes: (typeof productAddOnOptions.$inferSelect)[];
	produtos: ((typeof productAddOnReferences.$inferSelect) & { produto: { id: string; nome: string } })[];
};

async function assertMigrationApplied() {
	const [row] = await connection.unsafe(
		`select count(*)::int as total from information_schema.columns
		 where table_name = 'ampmais_product_add_on_references' and column_name in ('min_opcoes', 'max_opcoes')`,
	);
	if (Number(row.total) !== 2) {
		throw new Error("Migração drizzle/0091_add_on_reference_rule_overrides.sql não aplicada — rode-a antes deste script.");
	}
}

async function assertCardapioWebDisconnected(organizationId: string) {
	const active = await db.query.integrations.findFirst({
		where: and(eq(integrations.organizacaoId, organizationId), eq(integrations.tipo, "CARDAPIO-WEB"), eq(integrations.ativo, true)),
		columns: { id: true },
	});
	if (active) {
		throw new Error(
			"A integração CARDAPIO-WEB desta organização está ATIVA. O catalog sync faz upsert por id_externo e recria os vínculos, desfazendo a consolidação. Desconecte-a antes de aplicar.",
		);
	}
}

/** Regra de destino do vínculo, a partir do grupo de origem e do nome do produto. */
function resolveReferenceRule({
	originGroup,
	survivor,
	productName,
}: {
	originGroup: TGroup;
	survivor: TGroup;
	productName: string;
}): { minOpcoes: number | null; maxOpcoes: number | null; reason: string } {
	const normalizedProduct = normalizeText(productName);
	if (normalizedProduct.includes("3 sabores")) {
		return { minOpcoes: null, maxOpcoes: 3, reason: 'nome do produto diz "3 sabores"' };
	}

	const minOverride = originGroup.minOpcoes === survivor.minOpcoes ? null : originGroup.minOpcoes;
	const maxOverride = originGroup.maxOpcoes === survivor.maxOpcoes ? null : originGroup.maxOpcoes;
	if (minOverride === null && maxOverride === null) return { minOpcoes: null, maxOpcoes: null, reason: "herda o grupo" };
	return { minOpcoes: minOverride, maxOpcoes: maxOverride, reason: `regra do grupo de origem (${originGroup.minOpcoes}/${originGroup.maxOpcoes})` };
}

async function main() {
	const args = parseArgs();
	console.log(`Modo: ${args.apply ? "APPLY" : "DRY-RUN"} | org: ${args.organizationId}${args.keepMilkshake ? " | mantendo grupo de milk shake" : ""}\n`);

	await assertMigrationApplied();
	await assertCardapioWebDisconnected(args.organizationId);

	const allGroups = (await db.query.productAddOns.findMany({
		where: and(eq(productAddOns.organizacaoId, args.organizationId), eq(productAddOns.ativo, true)),
		with: {
			opcoes: true,
			produtos: { with: { produto: { columns: { id: true, nome: true } } } },
		},
	})) as TGroup[];

	let groups = allGroups.filter((group) => GELATO_GROUP_NAMES.includes(normalizeText(group.nome)));
	if (groups.length < 2) {
		console.log(`Nada a consolidar: ${groups.length} grupo(s) de gelato encontrados.`);
		return;
	}

	if (args.keepMilkshake) {
		const milkshakeGroups = groups.filter((group) =>
			group.produtos.some((reference) => normalizeText(reference.produto.nome).includes(MILKSHAKE_GROUP_HINT)),
		);
		if (milkshakeGroups.length > 0) {
			console.log(`Preservados como grupo próprio (--keep-milkshake): ${milkshakeGroups.map((group) => `${group.id.slice(0, 8)} "${group.nome}"`).join(", ")}\n`);
			groups = groups.filter((group) => !milkshakeGroups.includes(group));
		}
	}

	const survivor = [...groups].sort(
		(a, b) => b.produtos.length - a.produtos.length || b.opcoes.filter((o) => o.ativo).length - a.opcoes.filter((o) => o.ativo).length || a.id.localeCompare(b.id),
	)[0];
	const losers = groups.filter((group) => group.id !== survivor.id);
	if (losers.length === 0) {
		console.log("Só um grupo restante — nada a consolidar.");
		return;
	}

	console.log(`Sobrevivente: ${survivor.id} "${survivor.nome}" | regra ${survivor.minOpcoes}/${survivor.maxOpcoes} | ${survivor.produtos.length} produtos | ${survivor.opcoes.filter((o) => o.ativo).length} opções`);
	console.log(`Perdedores: ${losers.map((group) => `${group.id.slice(0, 8)} (${group.minOpcoes}/${group.maxOpcoes}, ${group.produtos.length} prod)`).join(", ")}\n`);

	// --- Lista canônica de sabores -------------------------------------------------------------
	const survivorOptionByName = new Map(survivor.opcoes.filter((option) => option.ativo).map((option) => [normalizeText(option.nome), option]));
	const optionsToInsert: { nome: string; precoDelta: number; maxQtdePorItem: number | null; origem: string }[] = [];
	const optionConflicts: string[] = [];
	const seenNewNames = new Set<string>();

	for (const loser of losers) {
		for (const option of loser.opcoes.filter((item) => item.ativo)) {
			const key = normalizeText(option.nome);
			const existing = survivorOptionByName.get(key);
			if (existing) {
				if ((existing.precoDelta ?? 0) !== (option.precoDelta ?? 0)) {
					optionConflicts.push(
						`"${option.nome}": sobrevivente R$${(existing.precoDelta ?? 0).toFixed(2)} vs ${loser.id.slice(0, 8)} R$${(option.precoDelta ?? 0).toFixed(2)} — mantém a do sobrevivente`,
					);
				}
				continue;
			}
			if (seenNewNames.has(key)) continue;
			seenNewNames.add(key);
			optionsToInsert.push({ nome: option.nome, precoDelta: option.precoDelta ?? 0, maxQtdePorItem: option.maxQtdePorItem, origem: loser.id.slice(0, 8) });
		}
	}

	console.log(`Sabores a acrescentar ao sobrevivente: ${optionsToInsert.length}`);
	for (const option of optionsToInsert) console.log(`  + "${option.nome}" (de ${option.origem})${option.precoDelta ? ` R$${option.precoDelta.toFixed(2)}` : ""}`);
	if (optionConflicts.length > 0) {
		console.log(`\nConflitos de preço (${optionConflicts.length}):`);
		for (const conflict of optionConflicts) console.log(`  ! ${conflict}`);
	}

	// --- Vínculos --------------------------------------------------------------------------------
	const survivorScopes = new Set(survivor.produtos.map((reference) => `${reference.produtoId}|${reference.produtoVarianteId ?? ""}`));
	const referencePlans: {
		referenceId: string;
		produtoNome: string;
		minOpcoes: number | null;
		maxOpcoes: number | null;
		reason: string;
		duplicate: boolean;
	}[] = [];

	for (const loser of losers) {
		for (const reference of loser.produtos) {
			const scope = `${reference.produtoId}|${reference.produtoVarianteId ?? ""}`;
			const rule = resolveReferenceRule({ originGroup: loser, survivor, productName: reference.produto.nome });
			const duplicate = survivorScopes.has(scope);
			if (!duplicate) survivorScopes.add(scope);
			referencePlans.push({ referenceId: reference.id, produtoNome: reference.produto.nome, ...rule, duplicate });
		}
	}

	// Vínculos JÁ no sobrevivente também podem precisar de regra (ex.: cestinha de 3 sabores).
	const survivorReferencePlans: { referenceId: string; produtoNome: string; maxOpcoes: number; reason: string }[] = [];
	for (const reference of survivor.produtos) {
		if (!normalizeText(reference.produto.nome).includes("3 sabores")) continue;
		if (reference.maxOpcoes === 3) continue;
		survivorReferencePlans.push({ referenceId: reference.id, produtoNome: reference.produto.nome, maxOpcoes: 3, reason: 'nome do produto diz "3 sabores"' });
	}

	console.log(`\nVínculos a re-apontar: ${referencePlans.filter((plan) => !plan.duplicate).length} (duplicados a remover: ${referencePlans.filter((plan) => plan.duplicate).length})`);
	for (const plan of referencePlans.filter((item) => !item.duplicate)) {
		const rule = plan.maxOpcoes != null || plan.minOpcoes != null ? `min=${plan.minOpcoes ?? "herda"} max=${plan.maxOpcoes ?? "herda"}` : "herda a regra do grupo";
		console.log(`  → "${plan.produtoNome}": ${rule} (${plan.reason})`);
	}
	if (survivorReferencePlans.length > 0) {
		console.log(`\nVínculos do próprio sobrevivente a corrigir: ${survivorReferencePlans.length}`);
		for (const plan of survivorReferencePlans) console.log(`  → "${plan.produtoNome}": max=${plan.maxOpcoes} (${plan.reason})`);
	}

	// --- Histórico de vendas --------------------------------------------------------------------
	const loserOptionIds = losers.flatMap((group) => group.opcoes.map((option) => option.id));
	const modifierCounts = new Map<string, number>();
	if (loserOptionIds.length > 0) {
		const rows = await db
			.select({ opcaoId: saleItemModifiers.opcaoId, total: sql<number>`count(*)::int` })
			.from(saleItemModifiers)
			.where(inArray(saleItemModifiers.opcaoId, loserOptionIds))
			.groupBy(saleItemModifiers.opcaoId);
		for (const row of rows) if (row.opcaoId) modifierCounts.set(row.opcaoId, row.total);
	}
	const totalModifiers = [...modifierCounts.values()].reduce((sum, value) => sum + value, 0);
	console.log(`\nModificadores de venda a re-apontar: ${totalModifiers} (de ${modifierCounts.size} opções perdedoras)`);

	const externalToClear = [survivor, ...losers].filter((group) => group.idExterno).length;
	console.log(`id_externo a limpar no sobrevivente: ${survivor.idExterno ? `sim (${survivor.idExterno})` : "não"} | grupos com ext no total: ${externalToClear}`);

	if (!args.apply) {
		console.log("\nDry-run: nenhuma alteração aplicada. Rode com --apply para consolidar.");
		return;
	}

	const snapshotDir = join(process.cwd(), "tmp", "congelatte-consolidate-gelato");
	mkdirSync(snapshotDir, { recursive: true });
	const snapshotPath = join(snapshotDir, `${args.organizationId.slice(0, 8)}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
	writeFileSync(
		snapshotPath,
		JSON.stringify({ args, survivor, losers, optionsToInsert, referencePlans, survivorReferencePlans, optionConflicts }, null, 2),
		"utf-8",
	);
	console.log(`\nSnapshot gravado em ${snapshotPath}`);

	await db.transaction(async (tx) => {
		// 1. Sabores faltantes no sobrevivente.
		for (const option of optionsToInsert) {
			await tx.insert(productAddOnOptions).values({
				organizacaoId: args.organizationId,
				produtoAddOnId: survivor.id,
				nome: option.nome,
				precoDelta: option.precoDelta,
				maxQtdePorItem: option.maxQtdePorItem ?? 1,
				quantidadeConsumo: 1,
				ativo: true,
			});
		}

		// 2. Histórico: opção perdedora -> opção canônica de mesmo nome (recarregada com as novas).
		const canonicalOptions = await tx.query.productAddOnOptions.findMany({
			where: and(eq(productAddOnOptions.produtoAddOnId, survivor.id), eq(productAddOnOptions.ativo, true)),
		});
		const canonicalByName = new Map(canonicalOptions.map((option) => [normalizeText(option.nome), option.id]));
		for (const loser of losers) {
			for (const option of loser.opcoes) {
				if ((modifierCounts.get(option.id) ?? 0) === 0) continue;
				const canonicalId = canonicalByName.get(normalizeText(option.nome));
				if (!canonicalId) {
					console.warn(`  ! sem opção canônica para "${option.nome}" — modificadores ficarão órfãos (opcao_id nulo)`);
					continue;
				}
				await tx.update(saleItemModifiers).set({ opcaoId: canonicalId }).where(eq(saleItemModifiers.opcaoId, option.id));
			}
		}

		// 3. Vínculos: duplicados fora, o resto re-apontado com a regra do produto.
		for (const plan of referencePlans) {
			if (plan.duplicate) {
				await tx.delete(productAddOnReferences).where(eq(productAddOnReferences.id, plan.referenceId));
				continue;
			}
			await tx
				.update(productAddOnReferences)
				.set({ produtoAddOnId: survivor.id, minOpcoes: plan.minOpcoes, maxOpcoes: plan.maxOpcoes })
				.where(eq(productAddOnReferences.id, plan.referenceId));
		}
		for (const plan of survivorReferencePlans) {
			await tx.update(productAddOnReferences).set({ maxOpcoes: plan.maxOpcoes }).where(eq(productAddOnReferences.id, plan.referenceId));
		}

		// 4. Desacopla o grupo canônico do cardápio-web (upsert por id_externo não pode mais tocá-lo).
		await tx.update(productAddOns).set({ idExterno: null }).where(eq(productAddOns.id, survivor.id));
		await tx.update(productAddOnOptions).set({ idExterno: null }).where(eq(productAddOnOptions.produtoAddOnId, survivor.id));

		// 5. Grupos perdedores (cascade nas opções/vínculos restantes).
		await tx.delete(productAddOns).where(inArray(productAddOns.id, losers.map((group) => group.id)));
	});

	const remaining = await db.query.productAddOns.findMany({
		where: and(eq(productAddOns.organizacaoId, args.organizationId), eq(productAddOns.ativo, true)),
		with: { opcoes: true, produtos: true },
	});
	const gelato = remaining.filter((group) => GELATO_GROUP_NAMES.includes(normalizeText(group.nome)));
	console.log(`\nConsolidado. Grupos de gelato restantes: ${gelato.length}`);
	for (const group of gelato) {
		console.log(`  ${group.id.slice(0, 8)} "${group.nome}" | ${group.opcoes.filter((o) => o.ativo).length} sabores | ${group.produtos.length} produtos`);
	}
}

main()
	.catch((error) => {
		console.error(error instanceof Error ? error.message : error);
		process.exitCode = 1;
	})
	.finally(() => connection.end());
