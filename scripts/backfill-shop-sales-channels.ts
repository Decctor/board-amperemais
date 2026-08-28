import "dotenv/config";
import { ensureSalesChannels } from "@/lib/products/sales-channels-store";
import { connection, db } from "@/services/drizzle";
import { productChannelSettings, products, salesChannels } from "@/services/drizzle/schema";
import { and, eq, gt, inArray, isNull, notInArray } from "drizzle-orm";

/**
 * Materializa o canal SHOP (e os demais canais internos) para toda organização com loja digital,
 * traduzindo o bloco `configuracoes.produtos.{modo, produtoIds}` do jsonb — e VERIFICA, por
 * organização, que o catálogo resolvido pela fonte nova é idêntico ao da fonte legada.
 *
 * Idempotente: reexecutar não altera organizações já migradas (o sync reescreve o mesmo estado).
 * Rodar com: npm run backfill:shop-sales-channels
 */

type TShopProductsBlock = { modo?: unknown; produtoIds?: unknown };

function readProductsBlock(configuracoes: unknown): { modo: "ATIVOS" | "INCLUIR" | "EXCLUIR"; produtoIds: string[] } {
	const block = (configuracoes as { produtos?: TShopProductsBlock } | null | undefined)?.produtos;
	const modo = block?.modo === "INCLUIR" || block?.modo === "EXCLUIR" ? block.modo : "ATIVOS";
	const produtoIds = Array.isArray(block?.produtoIds) ? block.produtoIds.filter((id): id is string => typeof id === "string") : [];
	return { modo, produtoIds };
}

// Réplica das condições de elegibilidade do catálogo (sem os gates de estoque/variante, que são
// idênticos nos dois caminhos e não dependem da fonte da configuração).
async function resolveLegacyCatalogIds(orgId: string, block: { modo: string; produtoIds: string[] }) {
	const conditions = [eq(products.organizacaoId, orgId), eq(products.ativo, true), eq(products.vendavel, true), gt(products.precoVenda, 0)];
	if (block.modo === "INCLUIR") {
		if (block.produtoIds.length === 0) return new Set<string>();
		conditions.push(inArray(products.id, block.produtoIds));
	}
	if (block.modo === "EXCLUIR" && block.produtoIds.length > 0) {
		conditions.push(notInArray(products.id, block.produtoIds));
	}
	const rows = await db
		.select({ id: products.id })
		.from(products)
		.where(and(...conditions));
	return new Set(rows.map((row) => row.id));
}

async function resolveChannelCatalogIds(orgId: string) {
	const channel = await db.query.salesChannels.findFirst({
		where: and(
			eq(salesChannels.organizacaoId, orgId),
			eq(salesChannels.canal, "SHOP"),
			isNull(salesChannels.integracaoId),
			isNull(salesChannels.refExterno),
		),
	});
	if (!channel) return null;

	const overrides = await db.query.productChannelSettings.findMany({
		where: and(eq(productChannelSettings.canalVendaId, channel.id), isNull(productChannelSettings.produtoVarianteId)),
		columns: { produtoId: true, disponivel: true },
	});

	const conditions = [eq(products.organizacaoId, orgId), eq(products.ativo, true), eq(products.vendavel, true), gt(products.precoVenda, 0)];
	if (channel.catalogoModo === "SELECIONADOS") {
		const includedIds = overrides.filter((row) => row.disponivel === true).map((row) => row.produtoId);
		if (includedIds.length === 0) return new Set<string>();
		conditions.push(inArray(products.id, includedIds));
	} else {
		const excludedIds = overrides.filter((row) => row.disponivel === false).map((row) => row.produtoId);
		if (excludedIds.length > 0) conditions.push(notInArray(products.id, excludedIds));
	}
	const rows = await db
		.select({ id: products.id })
		.from(products)
		.where(and(...conditions));
	return new Set(rows.map((row) => row.id));
}

async function main() {
	const allShopSettings = await db.query.shopSettings.findMany({
		columns: { organizacaoId: true, configuracoes: true },
	});
	console.log(`Organizações com loja digital: ${allShopSettings.length}`);

	let migrated = 0;
	let mismatches = 0;

	for (const settings of allShopSettings) {
		const orgId = settings.organizacaoId;
		const block = readProductsBlock(settings.configuracoes);

		await ensureSalesChannels({ orgId });
		migrated += 1;

		const [legacyIds, channelIds] = await Promise.all([resolveLegacyCatalogIds(orgId, block), resolveChannelCatalogIds(orgId)]);
		if (!channelIds) {
			mismatches += 1;
			console.error(`[${orgId}] ERRO: canal SHOP não materializado após ensure.`);
			continue;
		}

		const onlyLegacy = [...legacyIds].filter((id) => !channelIds.has(id));
		const onlyChannel = [...channelIds].filter((id) => !legacyIds.has(id));
		if (onlyLegacy.length || onlyChannel.length) {
			mismatches += 1;
			console.error(
				`[${orgId}] DIVERGÊNCIA (modo ${block.modo}): só no legado=${onlyLegacy.length} [${onlyLegacy.slice(0, 5).join(", ")}] | só no canal=${onlyChannel.length} [${onlyChannel.slice(0, 5).join(", ")}]`,
			);
		} else {
			console.log(`[${orgId}] OK — modo ${block.modo}, ${channelIds.size} produtos no catálogo.`);
		}
	}

	console.log(`\nMigradas: ${migrated}/${allShopSettings.length} | Divergências: ${mismatches}`);
	if (mismatches > 0) process.exitCode = 1;
}

main()
	.catch((error) => {
		console.error(error);
		process.exitCode = 1;
	})
	.finally(() => connection.end());
