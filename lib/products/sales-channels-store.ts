import type { TShopSettingsConfiguration } from "@/schemas/shop";
import { db } from "@/services/drizzle";
import { productChannelSettings, products, salesChannels, type TSalesChannelEntity } from "@/services/drizzle/schema";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { DEFAULT_SALES_CHANNELS, type TChannel } from "./sales-channels";

function findInternalChannel(rows: TSalesChannelEntity[], canal: TChannel["canal"]) {
	return rows.find((row) => row.canal === canal && !row.integracaoId && !row.refExterno);
}

/**
 * Traduz o bloco `produtos.{modo, produtoIds}` do jsonb da loja para o estado do canal SHOP:
 * ATIVOS → TODOS sem linhas; INCLUIR → SELECIONADOS + linhas disponivel=true; EXCLUIR → TODOS +
 * linhas disponivel=false. `destaqueIds` fica de fora — é merchandising, não disponibilidade.
 */
export function mapShopProductsConfigToChannelState(produtos: TShopSettingsConfiguration["produtos"]) {
	if (produtos.modo === "INCLUIR") {
		return { catalogoModo: "SELECIONADOS" as const, disponivel: true, produtoIds: produtos.produtoIds };
	}
	if (produtos.modo === "EXCLUIR") {
		return { catalogoModo: "TODOS" as const, disponivel: false, produtoIds: produtos.produtoIds };
	}
	return { catalogoModo: "TODOS" as const, disponivel: true, produtoIds: [] as string[] };
}

/**
 * Sincroniza o canal SHOP (linha + overrides de disponibilidade nível-produto) a partir do bloco
 * de produtos do jsonb da loja. Enquanto o jsonb existir (dual-write), ele é a fonte da verdade
 * da disponibilidade no SHOP; este sync reescreve `disponivel` das linhas nível-produto mas
 * PRESERVA `preco_venda` — um override de preço não pode ser destruído por um save do painel.
 */
export async function syncShopSalesChannel({ orgId, produtos }: { orgId: string; produtos: TShopSettingsConfiguration["produtos"] }) {
	const desired = mapShopProductsConfigToChannelState(produtos);

	// Ids do jsonb podem apontar para produtos já excluídos — o insert com FK falharia.
	const validIds = desired.produtoIds.length
		? (
				await db
					.select({ id: products.id })
					.from(products)
					.where(and(eq(products.organizacaoId, orgId), inArray(products.id, desired.produtoIds)))
			).map((row) => row.id)
		: [];

	return db.transaction(async (tx) => {
		const [channel] = await tx
			.insert(salesChannels)
			.values({ organizacaoId: orgId, canal: "SHOP", catalogoModo: desired.catalogoModo })
			.onConflictDoUpdate({
				target: [salesChannels.organizacaoId, salesChannels.canal, salesChannels.integracaoId, salesChannels.refExterno],
				set: { catalogoModo: desired.catalogoModo, dataAtualizacao: new Date() },
			})
			.returning();

		const existingRows = await tx.query.productChannelSettings.findMany({
			where: and(eq(productChannelSettings.canalVendaId, channel.id), isNull(productChannelSettings.produtoVarianteId)),
			columns: { id: true, produtoId: true, precoVenda: true },
		});

		const desiredIds = new Set(validIds);
		const staleRows = existingRows.filter((row) => !desiredIds.has(row.produtoId));
		const staleToDelete = staleRows.filter((row) => row.precoVenda == null).map((row) => row.id);
		const staleToClear = staleRows.filter((row) => row.precoVenda != null).map((row) => row.id);

		if (staleToDelete.length) await tx.delete(productChannelSettings).where(inArray(productChannelSettings.id, staleToDelete));
		if (staleToClear.length) {
			await tx
				.update(productChannelSettings)
				.set({ disponivel: null, dataAtualizacao: new Date() })
				.where(inArray(productChannelSettings.id, staleToClear));
		}
		if (validIds.length) {
			await tx
				.insert(productChannelSettings)
				.values(validIds.map((produtoId) => ({ organizacaoId: orgId, canalVendaId: channel.id, produtoId, disponivel: desired.disponivel })))
				.onConflictDoUpdate({
					target: [productChannelSettings.canalVendaId, productChannelSettings.produtoId, productChannelSettings.produtoVarianteId],
					set: { disponivel: desired.disponivel, dataAtualizacao: new Date() },
				});
		}

		return channel;
	});
}

/**
 * Estado de um canal interno para leitura de catálogo: a linha do canal + mapas esparsos de
 * disponibilidade por produto e por variante. Nulo quando a organização ainda não tem a linha
 * (migração não aplicada / org não materializada) — o chamador decide o fallback.
 * Nesta fase só a DISPONIBILIDADE é consumida; preço por canal entra na fase 3.
 */
export async function loadChannelState({ orgId, canal }: { orgId: string; canal: TChannel["canal"] }) {
	const channel = await db.query.salesChannels.findFirst({
		where: and(
			eq(salesChannels.organizacaoId, orgId),
			eq(salesChannels.canal, canal),
			isNull(salesChannels.integracaoId),
			isNull(salesChannels.refExterno),
		),
	});
	if (!channel) return null;

	const overrides = await db.query.productChannelSettings.findMany({
		where: eq(productChannelSettings.canalVendaId, channel.id),
		columns: { produtoId: true, produtoVarianteId: true, disponivel: true, precoVenda: true },
	});

	const productOverrides = new Map<string, { disponivel: boolean | null; precoVenda: number | null }>();
	const variantOverrides = new Map<string, { disponivel: boolean | null; precoVenda: number | null }>();
	for (const override of overrides) {
		const entry = { disponivel: override.disponivel, precoVenda: override.precoVenda };
		if (override.produtoVarianteId) variantOverrides.set(override.produtoVarianteId, entry);
		else productOverrides.set(override.produtoId, entry);
	}

	return { channel, productOverrides, variantOverrides };
}
export type TChannelState = NonNullable<Awaited<ReturnType<typeof loadChannelState>>>;

/**
 * Presença de produtos no canal, em forma de filtro para a query: em SELECIONADOS só entram os
 * ids com linha disponivel=true (lista vazia = catálogo vazio); em TODOS saem os ids com linha
 * disponivel=false. Variantes são filtradas depois, no resultado (só restringem — ver resolver).
 */
export function channelProductFilter(state: TChannelState) {
	if (state.channel.catalogoModo === "SELECIONADOS") {
		return {
			includeIds: [...state.productOverrides.entries()].filter(([, override]) => override.disponivel === true).map(([id]) => id),
			excludeIds: null,
		};
	}
	const excluded = [...state.productOverrides.entries()].filter(([, override]) => override.disponivel === false).map(([id]) => id);
	return { includeIds: null, excludeIds: excluded.length ? excluded : null };
}

/** Preço resolvido de um nó no canal (node-scoped — ver resolver): override do nó, senão o base. */
export function channelNodePrice(
	state: TChannelState | null,
	node: { produtoId: string; produtoVarianteId?: string | null; precoVenda: number | null },
) {
	if (!state) return node.precoVenda;
	const override = node.produtoVarianteId ? state.variantOverrides.get(node.produtoVarianteId) : state.productOverrides.get(node.produtoId);
	return override?.precoVenda ?? node.precoVenda;
}

/**
 * Provisiona os canais internos na primeira leitura e devolve todos os canais da organização.
 *
 * A matriz por produto grava overrides contra o id do canal, então devolver linhas sintéticas
 * (id nulo) obrigaria a UI a materializar o canal num PUT prévio — uma dependência de ordem que
 * nada garante. O canal SHOP não nasce com default cego: ele nasce já traduzindo o modo do jsonb
 * da loja (migração on-provision) — senão uma org de cardápio curado (INCLUIR) exporia o catálogo
 * inteiro no intervalo entre o provisionamento e a migração.
 *
 * Devolve as linhas persistidas SEM filtrar por canal: um canal configurado (iFood por merchant,
 * ou um POS com refExterno) precisa aparecer na gestão, senão vira override invisível.
 */
export async function ensureSalesChannels({ orgId }: { orgId: string }) {
	const existing = await db.query.salesChannels.findMany({ where: eq(salesChannels.organizacaoId, orgId) });
	const missing = DEFAULT_SALES_CHANNELS.filter((channel) => !findInternalChannel(existing, channel.canal));
	if (missing.length === 0) return existing;

	const shopMissing = missing.some((channel) => channel.canal === "SHOP");
	const plainMissing = missing.filter((channel) => channel.canal !== "SHOP");

	if (plainMissing.length) {
		await db
			.insert(salesChannels)
			.values(plainMissing.map((channel) => ({ organizacaoId: orgId, ...channel })))
			.onConflictDoNothing();
	}
	if (shopMissing) {
		const shopRow = await db.query.shopSettings.findFirst({ where: (fields, { eq: eqOp }) => eqOp(fields.organizacaoId, orgId) });
		const produtos = parseShopProductsConfig(shopRow?.configuracoes);
		await syncShopSalesChannel({ orgId, produtos });
	}

	return db.query.salesChannels.findMany({ where: eq(salesChannels.organizacaoId, orgId) });
}

// O jsonb pode estar em formato legado; para o canal só importa o bloco de produtos, então a
// leitura é tolerante: qualquer coisa fora do esperado cai no default ATIVOS (= TODOS).
function parseShopProductsConfig(configuracoes: unknown): TShopSettingsConfiguration["produtos"] {
	const produtos = (configuracoes as { produtos?: { modo?: unknown; produtoIds?: unknown; destaqueIds?: unknown } } | null | undefined)?.produtos;
	const modo = produtos?.modo === "INCLUIR" || produtos?.modo === "EXCLUIR" ? produtos.modo : "ATIVOS";
	const produtoIds = Array.isArray(produtos?.produtoIds) ? produtos.produtoIds.filter((id): id is string => typeof id === "string") : [];
	const destaqueIds = Array.isArray(produtos?.destaqueIds) ? produtos.destaqueIds.filter((id): id is string => typeof id === "string") : [];
	return { modo, produtoIds, destaqueIds };
}
