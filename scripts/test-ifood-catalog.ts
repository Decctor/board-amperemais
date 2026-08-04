import "@/utils/scripts/load-next-env";

import { createIfoodClient, getValidIfoodConfig } from "@/lib/data-connectors/ifood/client";
import type { TIfoodConfig } from "@/lib/data-connectors/ifood/types";
import {
	batchUpdateIfoodProductsPrice,
	createIfoodCategory,
	deleteIfoodCategory,
	getIfoodBatch,
	getIfoodCatalogVersion,
	getIfoodCatalogs,
	getIfoodItemFlat,
	listIfoodCategories,
} from "@/lib/integrations/ifood/catalog";
import { deleteIfoodItemFromCategory, upsertIfoodItem } from "@/lib/integrations/ifood/catalog-items";
import { getIfoodMerchantsList } from "@/lib/integrations/ifood/merchant";
import { connection, db } from "@/services/drizzle";
import { organizations } from "@/services/drizzle/schema";
import type { AxiosInstance } from "axios";
import { eq } from "drizzle-orm";

/**
 * Exercita a Catalog API v2.0 de ponta a ponta contra uma loja real, para descobrir erro de payload
 * ANTES da reunião de homologação — e não durante.
 *
 * O roteiro segue o checklist do iFood: cria categoria, cria item com dois grupos de complementos e
 * min/max, RELÊ pelo `/flat` conferindo o que voltou, dispara um lote de preço e acompanha o
 * `batchId` até o estado terminal. No fim, apaga o que criou.
 *
 * A releitura é o coração do script: `PUT /items` responder 200 não prova nada — o iFood aceita o
 * corpo e descarta em silêncio o que não entendeu. Só o `/flat` diz o que de fato foi gravado.
 */

const DEFAULT_ORGANIZATION_ID = "59c2b238-bc21-4710-b47b-db6e2a380079";
const BATCH_POLL_ATTEMPTS = 10;
const BATCH_POLL_INTERVAL_MS = 2000;

function getArgValue(name: string) {
	const prefix = `--${name}=`;
	const arg = process.argv.find((value) => value.startsWith(prefix));
	return arg ? arg.slice(prefix.length) : null;
}

function hasFlag(name: string) {
	return process.argv.includes(`--${name}`);
}

function sleep(milliseconds: number) {
	return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function printHelp() {
	console.log(`
Testa a escrita no catálogo do iFood de ponta a ponta (categoria → item com complementos → releitura
→ lote de preço → limpeza).

Uso:
  npm run test:ifood-catalog -- [--org=<organizationId>] [--confirm] [--keep]

Opções:
  --org       ID da organização conectada ao iFood. Padrão: ${DEFAULT_ORGANIZATION_ID}
  --confirm   Executa as ESCRITAS. Sem esta flag o script só faz as leituras e mostra o que faria.
  --keep      Não apaga a categoria e o item criados (útil para inspecionar no Portal do Parceiro).
  --cleanup   Só varre o catálogo removendo categorias [TESTE] deixadas por execuções anteriores.
  --probe     Manda o PUT /items cru e imprime a resposta de erro INTEIRA do iFood (o mapeamento
              normal descarta os \`details\`, que é justamente onde estão os campos recusados).

O que é criado leva o prefixo [TESTE] no nome, e é removido no fim salvo --keep — inclusive quando
o roteiro falha no meio.
`);
}

const TEST_PREFIX = "[TESTE]";

// ---------------------------------------------------------------------------
// Verificações
// ---------------------------------------------------------------------------

type TCheck = { nome: string; ok: boolean; detalhe?: string };
const checks: TCheck[] = [];

function check(nome: string, ok: boolean, detalhe?: string) {
	checks.push({ nome, ok, detalhe });
	console.log(`  ${ok ? "✓" : "✗"} ${nome}${detalhe ? ` — ${detalhe}` : ""}`);
}

function checkEqual(nome: string, esperado: unknown, recebido: unknown) {
	const ok = esperado === recebido;
	check(nome, ok, ok ? undefined : `esperado ${JSON.stringify(esperado)}, veio ${JSON.stringify(recebido)}`);
}

// ---------------------------------------------------------------------------
// Contexto
// ---------------------------------------------------------------------------

/** Imprime validade e escopo do token — o primeiro lugar a olhar quando a escrita dá 401 e a leitura não. */
async function printTokenDiagnostics(organizationId: string) {
	const organization = await db.query.organizations.findFirst({
		where: eq(organizations.id, organizationId),
		columns: { integracaoConfiguracao: true },
	});
	const config = organization?.integracaoConfiguracao as Record<string, unknown> | undefined;
	console.log("\nDiagnóstico do token:");
	console.log(`  expiresAt:   ${String(config?.expiresAt)}`);
	console.log(`  tokenType:   ${String(config?.tokenType)}`);
	console.log(`  merchantIds: ${JSON.stringify(config?.merchantIds)}`);
	console.log(`  scope:       ${JSON.stringify(config?.scope)}`);
}

async function resolveContext(organizationId: string): Promise<{ client: AxiosInstance; merchantId: string }> {
	const organization = await db.query.organizations.findFirst({
		where: eq(organizations.id, organizationId),
		columns: { integracaoTipo: true, integracaoConfiguracao: true },
	});

	if (!organization) throw new Error(`Organização não encontrada: ${organizationId}`);
	if (organization.integracaoTipo !== "IFOOD") throw new Error(`Organização não está conectada ao iFood: ${organizationId}`);
	if (!organization.integracaoConfiguracao || organization.integracaoConfiguracao.tipo !== "IFOOD") {
		throw new Error(`Configuração iFood inválida para organização: ${organizationId}`);
	}

	const config: TIfoodConfig = await getValidIfoodConfig({ organizationId, config: organization.integracaoConfiguracao });
	const client = createIfoodClient(config);

	const merchantId = config.merchantIds[0] ?? (await getIfoodMerchantsList(client))[0]?.id;
	if (!merchantId) throw new Error("Nenhuma loja (merchant) encontrada para esta organização.");

	return { client, merchantId };
}

// ---------------------------------------------------------------------------
// Roteiro
// ---------------------------------------------------------------------------

/** Remove categorias `[TESTE]` deixadas por execuções que falharam no meio. */
async function cleanupTestCategories({ client, merchantId, catalogId }: { client: AxiosInstance; merchantId: string; catalogId: string }) {
	const categorias = await listIfoodCategories(client, merchantId, { catalogId });
	console.log(`  Categorias no catálogo ${catalogId}:`);
	for (const categoria of categorias) console.log(`    · ${JSON.stringify(categoria.nome)} (${categoria.id})`);

	// Comparação sem caixa: o iFood reescreve o nome da categoria em title case ("[TESTE]" volta
	// como "[Teste]"), então casar a string exata deixaria o resíduo para trás.
	const residuos = categorias.filter((categoria) => categoria.nome?.toUpperCase().startsWith(TEST_PREFIX));

	if (!residuos.length) {
		console.log("  Nenhuma categoria [TESTE] no catálogo.");
		return;
	}

	for (const residuo of residuos) {
		try {
			await deleteIfoodCategory(client, merchantId, residuo.id);
			console.log(`  ✓ removida: ${residuo.nome} (${residuo.itens.length} item(ns) junto)`);
		} catch (error) {
			console.log(`  ✗ falhou ao remover ${residuo.nome}: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
}

/**
 * Manda variantes do `FullItemDto` direto no axios, sem passar pelo `mapIfoodError`, e imprime a
 * resposta crua. Existe porque "FullItemDto is not valid" não diz QUAL campo está errado — só o
 * corpo completo da resposta diz, e o mapeamento normal joga fora os `details`.
 *
 * As variantes vão do mínimo que já sabemos funcionar até o payload completo, para isolar o campo
 * que quebra em vez de adivinhar.
 */
async function probeFullItemDto({ client, merchantId, categoriaId }: { client: AxiosInstance; merchantId: string; categoriaId: string }) {
	const base = "https://merchant-api.ifood.com.br/catalog/v2.0";
	const sufixo = new Date().toISOString().slice(11, 19).replaceAll(":", "");

	// Guarda qual id é o quê, para traduzir o "not linked correctly: <uuid>" em algo legível.
	let rotulos: Record<string, string> = {};

	function buildPayload(variante: string) {
		const itemId = crypto.randomUUID();
		const productId = crypto.randomUUID();
		const optionProductId = crypto.randomUUID();
		const optionId = crypto.randomUUID();
		const groupId = crypto.randomUUID();
		rotulos = {
			[itemId]: "item.id",
			[productId]: "produto base",
			[optionProductId]: "produto DA OPÇÃO",
			[optionId]: "option.id",
			[groupId]: "optionGroup.id",
		};

		const item = {
			id: itemId,
			type: "DEFAULT",
			productId,
			categoryId: categoriaId,
			status: "AVAILABLE",
			externalCode: `PROBE_${variante}_${sufixo}`,
			price: { value: 19.9 },
		};
		const produtoBase = { id: productId, name: `[TESTE] Probe ${variante}`, description: "Probe do script." };

		if (variante === "A_SEM_GRUPOS") {
			return { item, products: [produtoBase], optionGroups: [], options: [] };
		}

		const optionProduct = { id: optionProductId, name: "Bacon extra", description: "Opção de probe." };
		const group = {
			id: groupId,
			name: "Adicionais",
			optionGroupType: "OFFER_UNIT",
			status: "AVAILABLE",
			min: 0,
			max: 1,
			optionIds: [optionId],
		};
		const option = { id: optionId, productId: optionProductId, status: "AVAILABLE", price: { value: 4.5 } };

		// Base que já sabemos válida (grupo ligado pelo produto). As variantes M..P só mudam os
		// `contextModifiers`, para descobrir qual contexto a loja aceita.
		const valido = { item, products: [{ ...produtoBase, optionGroupIds: [groupId] }, optionProduct], optionGroups: [group], options: [option] };

		if (variante === "M_SEM_CONTEXT_MODIFIERS") return valido;
		if (variante === "N_SO_DEFAULT") {
			return { ...valido, item: { ...item, contextModifiers: [{ catalogContext: "DEFAULT", price: { value: 17.9 } }] } };
		}
		if (variante === "O_SO_INDOOR") {
			return { ...valido, item: { ...item, contextModifiers: [{ catalogContext: "INDOOR", price: { value: 15.9 } }] } };
		}
		// P: WHITELABEL, o outro contexto que a loja não declara em GET /catalogs.
		return { ...valido, item: { ...item, contextModifiers: [{ catalogContext: "WHITELABEL", price: { value: 16.9 } }] } };
	}

	for (const variante of ["M_SEM_CONTEXT_MODIFIERS", "N_SO_DEFAULT", "O_SO_INDOOR", "P_SO_WHITELABEL"]) {
		const payload = buildPayload(variante);
		try {
			await client.put(`${base}/merchants/${merchantId}/items`, payload);
			console.log(`  ✓ ${variante}: aceito`);
		} catch (error) {
			const resposta = (error as { response?: { status?: number; data?: unknown } }).response;
			const corpo = JSON.stringify(resposta?.data);
			console.log(`  ✗ ${variante}: HTTP ${resposta?.status ?? "?"}`);
			console.log(`     resposta: ${corpo}`);

			// Traduz cada uuid citado no erro para o papel que ele tem no payload.
			const citados = corpo?.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g) ?? [];
			const identificados = citados.map((uuid) => `${uuid} = ${rotulos[uuid] ?? "(não é do payload — provavelmente requestId)"}`);
			if (identificados.length) console.log(`     ids citados: ${identificados.join(" | ")}`);
		}
	}
}

async function run({
	organizationId,
	confirm,
	keep,
	cleanup,
	probe,
}: {
	organizationId: string;
	confirm: boolean;
	keep: boolean;
	cleanup: boolean;
	probe: boolean;
}) {
	await printTokenDiagnostics(organizationId);
	const { client, merchantId } = await resolveContext(organizationId);
	console.log(`\n[IFOOD_CATALOG_TEST] Loja: ${merchantId}\n`);

	if (cleanup) {
		const catalogosParaLimpar = await getIfoodCatalogs(client, merchantId);
		console.log("Limpeza de resíduos de execuções anteriores");
		for (const alvo of catalogosParaLimpar) await cleanupTestCategories({ client, merchantId, catalogId: alvo.id });
		return;
	}

	console.log("1. Leitura do catálogo");
	const catalogos = await getIfoodCatalogs(client, merchantId);
	check("GET /catalogs respondeu", catalogos.length > 0, `${catalogos.length} catálogo(s): ${catalogos.map((c) => c.contextos.join("/")).join(", ")}`);
	const catalogo = catalogos[0];
	if (!catalogo) throw new Error("Nenhum catálogo na loja — nada a testar.");

	const versao = await getIfoodCatalogVersion(client, merchantId).catch(() => null);
	check("Catálogo está na versão 2", versao === "V2", `versão reportada: ${versao ?? "desconhecida"}`);
	if (versao === "V1") throw new Error("Catálogo na V1: a gestão por API exige upgrade para V2 antes de testar escrita.");

	const categoriasAntes = await listIfoodCategories(client, merchantId, { catalogId: catalogo.id });
	check(
		"GET categorias respondeu",
		true,
		`${categoriasAntes.length} categoria(s), ${categoriasAntes.reduce((total, c) => total + c.itens.length, 0)} item(ns)`,
	);

	if (!confirm) {
		console.log("\n[IFOOD_CATALOG_TEST] Modo leitura. As escritas abaixo NÃO foram executadas:");
		console.log("  · POST categoria  [TESTE] Homologação");
		console.log("  · PUT  item       [TESTE] X-Burguer + 2 grupos de complementos (min/max)");
		console.log("  · GET  /items/{id}/flat  (conferência do que foi gravado)");
		console.log("  · PATCH /products/price  (lote com resources) + polling do batchId");
		console.log("  · DELETE do item e da categoria");
		console.log("\nRode de novo com --confirm para executar.\n");
		return;
	}

	// -- 2. Categoria ---------------------------------------------------------
	const sufixo = new Date().toISOString().slice(11, 19).replaceAll(":", "");
	const nomeCategoria = `[TESTE] Homologação ${sufixo}`;
	console.log("\n2. Criação de categoria");
	const categoria = await createIfoodCategory(client, merchantId, {
		catalogId: catalogo.id,
		categoria: { nome: nomeCategoria, status: "AVAILABLE", codigoExterno: `TESTE_CAT_${sufixo}` },
	});
	check("POST categoria devolveu id", !!categoria?.id, categoria?.id ?? "sem id");
	if (!categoria?.id) throw new Error("Categoria não foi criada — interrompendo.");

	if (probe) {
		console.log("\n[PROBE] Variantes do FullItemDto (resposta crua do iFood)");
		try {
			await probeFullItemDto({ client, merchantId, categoriaId: categoria.id });
		} finally {
			await deleteIfoodCategory(client, merchantId, categoria.id).catch(() => undefined);
			console.log("\n[PROBE] Categoria de probe removida.");
		}
		return;
	}

	// A partir daqui existe lixo no catálogo real da loja. Tudo o que vem a seguir roda dentro de um
	// try/finally: uma falha no meio não pode deixar categoria de teste no cardápio do cliente.
	let produtoCriadoId: string | null = null;
	try {
		// -- 3. Item com complementos ------------------------------------------
		console.log("\n3. Criação de item com dois grupos de complementos");
		const codigoExternoItem = `TESTE_ITEM_${sufixo}`;
		const precoInicial = 49.9;
		const precoIndoor = 39.9;
		const precoWhitelabel = 44.9;
		const grupos = [
			{
				nome: "Ponto da carne",
				tipo: "SPECIFICATION" as const,
				min: 1,
				max: 1,
				opcoes: [
					{ nome: "Mal passado", preco: 0 },
					{ nome: "Ao ponto", preco: 0 },
					{ nome: "Bem passado", preco: 0 },
				],
			},
			{
				nome: "Adicionais",
				tipo: "OFFER_UNIT" as const,
				min: 0,
				max: 2,
				opcoes: [
					{ nome: "Bacon extra", preco: 4.5 },
					{ nome: "Cheddar extra", preco: 3.5 },
				],
			},
		];

		// Canais: um sobrescreve preço e status, outro só preço, o terceiro herda tudo — cobre os
		// três comportamentos de `contextModifiers` numa chamada só.
		const canais = [
			{ contexto: "INDOOR" as const, preco: precoIndoor, status: "UNAVAILABLE" as const, codigoExterno: null },
			{ contexto: "WHITELABEL" as const, preco: precoWhitelabel, status: null, codigoExterno: null },
			{ contexto: "DEFAULT" as const, preco: null, status: null, codigoExterno: null },
		];

		const { itemId, productId } = await upsertIfoodItem(client, merchantId, {
			categoriaId: categoria.id,
			status: "AVAILABLE",
			preco: precoInicial,
			codigoExterno: codigoExternoItem,
			produto: { nome: `[TESTE] X-Burguer ${sufixo}`, descricao: "Item criado pelo script de homologação." },
			gruposComplementos: grupos,
			contextModifiers: canais,
		});
		produtoCriadoId = productId;
		check("PUT /items respondeu sem erro", !!itemId, `itemId ${itemId}`);

		// -- 4. Releitura: a parte que realmente prova ---------------------------
		console.log("\n4. Releitura pelo /flat (conferindo o que foi gravado)");
		const flat = await getIfoodItemFlat(client, merchantId, itemId);
		checkEqual("preço do item", precoInicial, flat.preco);
		checkEqual("código externo do item", codigoExternoItem, flat.codigoExterno);
		checkEqual("status do item", "AVAILABLE", flat.status?.toUpperCase() ?? null);
		checkEqual("quantidade de grupos de complementos", 2, flat.gruposComplementos.length);

		for (const grupoEsperado of grupos) {
			const grupoLido = flat.gruposComplementos.find((candidato) => candidato.nome === grupoEsperado.nome);
			if (!grupoLido) {
				check(`grupo "${grupoEsperado.nome}" voltou na releitura`, false, "não encontrado no /flat");
				continue;
			}
			check(`grupo "${grupoEsperado.nome}" voltou na releitura`, true);
			checkEqual(`  min de "${grupoEsperado.nome}"`, grupoEsperado.min, grupoLido.min);
			checkEqual(`  max de "${grupoEsperado.nome}"`, grupoEsperado.max, grupoLido.max);
			checkEqual(`  nº de opções de "${grupoEsperado.nome}"`, grupoEsperado.opcoes.length, grupoLido.opcoes.length);

			for (const opcaoEsperada of grupoEsperado.opcoes) {
				const opcaoLida = grupoLido.opcoes.find((candidata) => candidata.nome === opcaoEsperada.nome);
				check(`  opção "${opcaoEsperada.nome}"`, !!opcaoLida, opcaoLida ? `preço ${opcaoLida.preco}` : "não encontrada — o nome vem do produto da opção");
				if (opcaoLida) checkEqual(`    preço de "${opcaoEsperada.nome}"`, opcaoEsperada.preco, opcaoLida.preco);
			}
		}

		// -- 4b. Canais (contextModifiers) ---------------------------------------
		console.log("\n4b. Canais de venda (contextModifiers)");
		const canalIndoor = flat.canais.find((canal) => canal.contexto?.toUpperCase() === "INDOOR");
		const canalWhitelabel = flat.canais.find((canal) => canal.contexto?.toUpperCase() === "WHITELABEL");

		check("canal INDOOR voltou na releitura", !!canalIndoor, canalIndoor ? JSON.stringify(canalIndoor) : `veio: ${JSON.stringify(flat.canais)}`);
		if (canalIndoor) {
			checkEqual("  preço em INDOOR", precoIndoor, canalIndoor.preco);
			checkEqual("  status em INDOOR", "UNAVAILABLE", canalIndoor.status?.toUpperCase() ?? null);
		}
		check("canal WHITELABEL voltou na releitura", !!canalWhitelabel, canalWhitelabel ? JSON.stringify(canalWhitelabel) : "não encontrado");
		if (canalWhitelabel) checkEqual("  preço em WHITELABEL", precoWhitelabel, canalWhitelabel.preco);

		// -- 5. Lote de preço -----------------------------------------------------
		console.log("\n5. Atualização de preço em lote + acompanhamento do batch");
		const precoNovo = 54.9;
		const batch = await batchUpdateIfoodProductsPrice(client, merchantId, [
			{ externalCode: codigoExternoItem, price: { value: precoNovo }, resources: ["ITEM"] },
		]);
		check("PATCH /products/price devolveu batchId", !!batch.id, batch.id ?? "sem batchId");

		if (batch.id) {
			let estadoFinal = batch;
			for (let tentativa = 1; tentativa <= BATCH_POLL_ATTEMPTS && !estadoFinal.concluido; tentativa++) {
				await sleep(BATCH_POLL_INTERVAL_MS);
				estadoFinal = await getIfoodBatch(client, merchantId, batch.id);
				console.log(`     tentativa ${tentativa}/${BATCH_POLL_ATTEMPTS}: ${estadoFinal.status ?? "sem status"}`);
			}
			check("lote chegou a um estado terminal", estadoFinal.concluido, `status final: ${estadoFinal.status ?? "desconhecido"}`);

			// `COMPLETED` não significa "aplicado": o lote pode concluir com erro por linha.
			check(
				"todas as linhas do lote com SUCCESS",
				estadoFinal.falhas.length === 0,
				`${estadoFinal.resultados.length} resultado(s), ${estadoFinal.falhas.length} falha(s)`,
			);

			// O preço propaga de forma assíncrona. Lemos pelas DUAS vias — `/flat` e a listagem da
			// categoria — porque se só uma atualizar, o problema é cache de leitura, não do lote.
			let precoFlat: number | null = null;
			let precoListagem: number | null = null;
			for (let tentativa = 1; tentativa <= 10; tentativa++) {
				precoFlat = (await getIfoodItemFlat(client, merchantId, itemId)).preco;
				const categoriasAgora = await listIfoodCategories(client, merchantId, { catalogId: catalogo.id });
				precoListagem = categoriasAgora.flatMap((c) => c.itens).find((i) => i.id === itemId)?.preco ?? null;
				if (precoFlat === precoNovo || precoListagem === precoNovo) break;
				console.log(`     propagação ${tentativa}/10: flat=${precoFlat} listagem=${precoListagem}`);
				await sleep(6000);
			}
			check(
				"preço do lote propagou em alguma leitura",
				precoFlat === precoNovo || precoListagem === precoNovo,
				`flat=${precoFlat} listagem=${precoListagem} (esperado ${precoNovo})`,
			);
		}
	} finally {
		// -- 6. Limpeza --------------------------------------------------------
		if (keep) {
			console.log(`\n6. Limpeza pulada (--keep). Categoria "${nomeCategoria}" continua no catálogo.`);
		} else {
			console.log("\n6. Limpeza");
			if (produtoCriadoId) {
				try {
					await deleteIfoodItemFromCategory(client, merchantId, categoria.id, produtoCriadoId);
					check("DELETE do item", true);
				} catch (error) {
					check("DELETE do item", false, error instanceof Error ? error.message : String(error));
				}
			}
			try {
				await deleteIfoodCategory(client, merchantId, categoria.id);
				check("DELETE da categoria", true);
			} catch (error) {
				check("DELETE da categoria", false, error instanceof Error ? error.message : String(error));
			}
		}
	}
}

async function main() {
	if (hasFlag("help")) return printHelp();

	const organizationId = getArgValue("org") ?? DEFAULT_ORGANIZATION_ID;
	const confirm = hasFlag("confirm");
	const keep = hasFlag("keep");
	const cleanup = hasFlag("cleanup");
	const probe = hasFlag("probe");

	console.log("[IFOOD_CATALOG_TEST] Iniciando", { organizationId, confirm, keep, cleanup, probe });
	await run({ organizationId, confirm, keep, cleanup, probe });

	if (!checks.length) return;
	const falhas = checks.filter((item) => !item.ok);
	console.log(`\n[IFOOD_CATALOG_TEST] ${checks.length - falhas.length}/${checks.length} verificações passaram.`);
	if (falhas.length) {
		console.log("\nFalhas:");
		for (const falha of falhas) console.log(`  ✗ ${falha.nome}${falha.detalhe ? ` — ${falha.detalhe}` : ""}`);
		process.exitCode = 1;
	}
}

main()
	.catch((error) => {
		console.error("\n[IFOOD_CATALOG_TEST] Falha na execução.");
		console.error(error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await connection.end();
	});
