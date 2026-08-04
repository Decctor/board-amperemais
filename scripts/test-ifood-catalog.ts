import "@/utils/scripts/load-next-env";

import { createIfoodClient, getValidIfoodConfig } from "@/lib/data-connectors/ifood/client";
import { IfoodConfigSchema, type TIfoodConfig } from "@/lib/data-connectors/ifood/types";
import { getActiveDataSourceIntegrations } from "@/lib/integrations/data-sources";
import { IfoodCatalogContextEnum, type TIfoodCatalogContextEnum } from "@/schemas/enums";
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
import { deleteIfoodProductsInventory, getIfoodProductInventory, setIfoodProductInventory } from "@/lib/integrations/ifood/inventory";
import { getIfoodMerchantsList } from "@/lib/integrations/ifood/merchant";
import { connection, db } from "@/services/drizzle";
import type { AxiosInstance } from "axios";

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
  --probe-item Manda variantes do PUT /items cru e imprime a resposta de erro INTEIRA do iFood (o
              mapeamento normal descarta os \`details\`, que é justamente onde estão os campos
              recusados). Encerra depois das variantes, sem rodar o roteiro completo.

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
	const rows = await getActiveDataSourceIntegrations({ executor: db, organizationId, types: ["IFOOD"] });
	console.log("\nDiagnóstico das conexões iFood:");
	if (!rows.length) {
		console.log("  Nenhuma conexão iFood ativa.");
		return;
	}
	for (const row of rows) {
		const config = row.configuracao as Record<string, unknown>;
		console.log(`  conexão ${row.id}${row.apelido ? ` (${row.apelido})` : ""} — status ${row.status}`);
		console.log(`    expiresAt:   ${String(config?.expiresAt)}`);
		console.log(`    tokenType:   ${String(config?.tokenType)}`);
		console.log(`    merchantIds: ${JSON.stringify(config?.merchantIds)}`);
		console.log(`    scope:       ${JSON.stringify(config?.scope)}`);
	}
}

/**
 * A conexão mora em `integrations` (uma linha por conta conectada), não mais nos campos inline da
 * organização. O refresh de token é row-scoped, então o `integrationId` precisa viajar junto.
 */
async function resolveContext(organizationId: string): Promise<{ client: AxiosInstance; merchantId: string }> {
	const rows = await getActiveDataSourceIntegrations({ executor: db, organizationId, types: ["IFOOD"] });
	if (!rows.length) throw new Error(`Organização não tem conexão iFood ativa: ${organizationId}`);
	if (rows.length > 1) {
		throw new Error(`Organização tem ${rows.length} conexões iFood ativas — o script não escolhe sozinho. Desative as extras antes de testar.`);
	}

	const integration = rows[0];
	const parsedConfig = IfoodConfigSchema.safeParse(integration.configuracao);
	if (!parsedConfig.success) throw new Error(`Configuração iFood inválida na conexão ${integration.id}.`);

	const config: TIfoodConfig = await getValidIfoodConfig({ integrationId: integration.id, config: parsedConfig.data });
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

/**
 * Cria uma PIZZA com os quatro grupos obrigatórios e confere a releitura.
 *
 * Opt-in porque a loja aceita no MÁXIMO UMA categoria PIZZA: se ela já vender pizza de verdade,
 * criar outra atrapalha o cardápio real. A categoria criada é sempre removida no fim.
 */
async function runPizzaScenario({ client, merchantId, keep }: { client: AxiosInstance; merchantId: string; keep: boolean }) {
	const sufixo = new Date().toISOString().slice(11, 19).replaceAll(":", "");
	console.log("\n[PIZZA] Criando item type=PIZZA com SIZE/CRUST/EDGE/TOPPING");

	// Os ids dos TAMANHOS precisam existir antes dos sabores: o iFood exige que cada sabor esteja
	// ligado a TODOS os tamanhos ("Pizza topping option must be linked with all sizes in all
	// contexts"), o que faz a lista de sabores ser a matriz sabor × tamanho, não a lista de sabores.
	const tamanhos = [
		{ id: crypto.randomUUID(), nome: "Pequena", preco: 25, fatias: 6, fracoes: [1, 2] },
		{ id: crypto.randomUUID(), nome: "Grande", preco: 42, fatias: 12, fracoes: [1, 2, 3, 4] },
	];
	const sabores = [
		{ produtoId: crypto.randomUUID(), nome: "Calabresa", precoPorTamanho: [0, 0] },
		{ produtoId: crypto.randomUUID(), nome: "Margherita", precoPorTamanho: [2, 4] },
	];

	// Sem `categoriaId`: o iFood cria a categoria PIZZA sozinho.
	const { itemId } = await upsertIfoodItem(client, merchantId, {
		tipo: "PIZZA",
		status: "AVAILABLE",
		preco: 0,
		codigoExterno: `TESTE_PIZZA_${sufixo}`,
		produto: { nome: `[TESTE] Pizza ${sufixo}`, descricao: "Pizza criada pelo script de homologação." },
		gruposComplementos: [
			{
				nome: "Tamanho",
				tipo: "SIZE",
				min: 1,
				max: 1,
				opcoes: tamanhos.map((tamanho) => ({
					id: tamanho.id,
					nome: tamanho.nome,
					preco: tamanho.preco,
					fatias: tamanho.fatias,
					fracoes: tamanho.fracoes,
				})),
			},
			{
				nome: "Massa",
				tipo: "CRUST",
				min: 1,
				max: 1,
				opcoes: [
					{ nome: "Tradicional", preco: 0 },
					{ nome: "Fina", preco: 2 },
				],
			},
			{
				nome: "Borda",
				tipo: "EDGE",
				min: 0,
				max: 1,
				opcoes: [
					{ nome: "Sem borda", preco: 0 },
					{ nome: "Recheada", preco: 8 },
				],
			},
			{
				nome: "Sabor",
				tipo: "TOPPING",
				min: 1,
				max: 1,
				// Matriz: um registro por (sabor, tamanho), todos apontando para o mesmo produto do
				// sabor e amarrados ao tamanho por `opcaoPaiId`.
				opcoes: sabores.flatMap((sabor) =>
					tamanhos.map((tamanho, indiceTamanho) => ({
						produtoId: sabor.produtoId,
						nome: sabor.nome,
						preco: sabor.precoPorTamanho[indiceTamanho],
						opcaoPaiId: tamanho.id,
					})),
				),
			},
		],
	});
	check("PUT /items type=PIZZA aceito", !!itemId, `itemId ${itemId}`);

	const flat = await getIfoodItemFlat(client, merchantId, itemId);
	checkEqual("pizza voltou com 4 grupos", 4, flat.gruposComplementos.length);
	for (const tipoEsperado of ["SIZE", "CRUST", "EDGE", "TOPPING"]) {
		const grupo = flat.gruposComplementos.find((candidato) => candidato.tipo?.toUpperCase() === tipoEsperado);
		check(`grupo ${tipoEsperado} presente`, !!grupo, grupo ? `"${grupo.nome}" com ${grupo.opcoes.length} opção(ões)` : "ausente");
	}
	const tamanho = flat.gruposComplementos.find((grupo) => grupo.tipo?.toUpperCase() === "SIZE");
	checkEqual("  min do grupo SIZE", 1, tamanho?.min ?? null);
	checkEqual("  max do grupo SIZE", 1, tamanho?.max ?? null);

	if (keep) {
		console.log(`[PIZZA] Mantida (--keep): item ${itemId}, categoria ${flat.categoriaId}.`);
		return;
	}
	if (flat.categoriaId) {
		await deleteIfoodCategory(client, merchantId, flat.categoriaId).catch(() => undefined);
		check("categoria PIZZA removida", true);
	}
}

async function run({
	organizationId,
	confirm,
	keep,
	cleanup,
	pizza,
}: { organizationId: string; confirm: boolean; keep: boolean; cleanup: boolean; pizza: boolean }) {
	await printTokenDiagnostics(organizationId);
	const { client, merchantId } = await resolveContext(organizationId);
	console.log(`\n[IFOOD_CATALOG_TEST] Loja: ${merchantId}\n`);

	if (cleanup) {
		const catalogosParaLimpar = await getIfoodCatalogs(client, merchantId);
		console.log("Limpeza de resíduos de execuções anteriores");
		for (const alvo of catalogosParaLimpar) await cleanupTestCategories({ client, merchantId, catalogId: alvo.id });
		return;
	}

	if (pizza) {
		if (!confirm) {
			console.log("\nModo leitura: --pizza precisa de --confirm para criar a pizza de teste.\n");
			return;
		}
		await runPizzaScenario({ client, merchantId, keep });
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

	const contextosDaLoja = catalogos
		.flatMap((item) => item.contextos)
		.map((contexto) => contexto.toUpperCase())
		.filter((contexto): contexto is TIfoodCatalogContextEnum => IfoodCatalogContextEnum.safeParse(contexto).success);

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

	// `--probe-item` isola só o FullItemDto e encerra; `--probe` segue o roteiro normal ligando os
	// probes embutidos (inventário, por ora), que precisam de um item criado para existir.
	if (hasFlag("probe-item")) {
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
		const precoCanal = 39.9;
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

		// Canais: sobrescrevemos o preço em CADA contexto que a loja realmente tem. Mandar um
		// contexto que a loja não possui não dá erro — o iFood aceita e descarta em silêncio —, então
		// testar contra os contextos reais é a única asserção que significa alguma coisa.
		const canais = contextosDaLoja.map((contexto, indice) => ({
			contexto,
			preco: indice === 0 ? precoCanal : precoCanal - 5,
			status: "AVAILABLE" as const,
			codigoExterno: null,
		}));

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
		console.log(`\n4b. Canais de venda (contextModifiers) — a loja tem: ${contextosDaLoja.join(", ") || "nenhum"}`);
		for (const canalEnviado of canais) {
			const canalLido = flat.canais.find((canal) => canal.contexto?.toUpperCase() === canalEnviado.contexto);
			check(`canal ${canalEnviado.contexto} voltou na releitura`, !!canalLido, canalLido ? undefined : `veio: ${JSON.stringify(flat.canais)}`);
			if (canalLido) {
				checkEqual(`  preço em ${canalEnviado.contexto}`, canalEnviado.preco, canalLido.preco);
				checkEqual(`  status em ${canalEnviado.contexto}`, canalEnviado.status, canalLido.status?.toUpperCase() ?? null);
			}
		}

		// Comportamento conhecido, não bug: contexto que a loja não tem é aceito e sumido. Fixamos
		// aqui para que uma mudança futura do iFood apareça como falha em vez de passar batido.
		const contextoInexistente = (["INDOOR", "WHITELABEL", "DEFAULT"] as const).find((contexto) => !contextosDaLoja.includes(contexto));
		if (contextoInexistente) {
			const vazou = flat.canais.some((canal) => canal.contexto?.toUpperCase() === contextoInexistente);
			check(`contexto ${contextoInexistente} (que a loja não tem) segue ausente na releitura`, !vazou);
		}

		// -- 4c. Inventário -------------------------------------------------------
		console.log("\n4c. Inventário (estoque do produto)");
		const semEstoque = await getIfoodProductInventory(client, merchantId, productId);
		checkEqual("produto novo nasce sem controle de estoque", null, semEstoque.quantidade);

		// A leitura do inventário é eventualmente consistente — logo após o POST ela ainda devolve o
		// valor anterior. Relemos até bater ou estourar o teto.
		async function lerEstoqueAte(esperado: number | null) {
			let lido: number | null = null;
			for (let tentativa = 1; tentativa <= 8; tentativa++) {
				lido = (await getIfoodProductInventory(client, merchantId, productId)).quantidade;
				if (lido === esperado) return { lido, tentativas: tentativa };
				await sleep(2000);
			}
			return { lido, tentativas: 8 };
		}

		await setIfoodProductInventory(client, merchantId, { produtoId: productId, quantidade: 7 });
		const comEstoque = await lerEstoqueAte(7);
		check("estoque definido volta na leitura", comEstoque.lido === 7, `veio ${comEstoque.lido} após ${comEstoque.tentativas} leitura(s)`);

		await deleteIfoodProductsInventory(client, merchantId, [productId]);
		const estoqueRemovido = await lerEstoqueAte(null);
		check(
			"estoque removido volta a ser sem limite",
			estoqueRemovido.lido === null,
			`veio ${estoqueRemovido.lido} após ${estoqueRemovido.tentativas} leitura(s)`,
		);

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

	const pizza = hasFlag("pizza");

	console.log("[IFOOD_CATALOG_TEST] Iniciando", { organizationId, confirm, keep, cleanup, pizza, probeItem: hasFlag("probe-item") });
	await run({ organizationId, confirm, keep, cleanup, pizza });

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
