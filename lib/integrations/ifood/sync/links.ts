import { DEFAULT_CATALOG_LINK_SYNC_POLICY, type TCatalogLinkSyncPolicy } from "@/schemas/catalog-links";
import type { TCatalogLinkTypeEnum } from "@/schemas/enums";
import { db } from "@/services/drizzle";
import { catalogLinks, products, productVariants, type TCatalogLinkEntity } from "@/services/drizzle/schema";
import { and, eq, inArray } from "drizzle-orm";
import createHttpError from "http-errors";

export type TCatalogLinkNode = {
	tipo: TCatalogLinkTypeEnum;
	produtoId?: string | null;
	produtoVarianteId?: string | null;
	produtoAddOnId?: string | null;
	produtoAddOnOpcaoId?: string | null;
	grupoInterno?: string | null;
};

export type TCatalogLinkExternalRefs = {
	externoProdutoId?: string | null;
	externoItemId?: string | null;
	externoCategoriaId?: string | null;
	externoOptionGroupId?: string | null;
	externoOptionId?: string | null;
};

/** Chave do nó interno, para casar vínculos com produtos/variantes em memória. */
export function catalogLinkNodeKey(link: Pick<TCatalogLinkEntity, "tipo" | "produtoId" | "produtoVarianteId">) {
	return `${link.tipo}:${link.produtoVarianteId ?? link.produtoId ?? ""}`;
}

export async function listCatalogLinks({
	orgId,
	merchantId,
	produtoIds,
}: {
	orgId: string;
	merchantId?: string | null;
	produtoIds?: string[];
}): Promise<TCatalogLinkEntity[]> {
	const conditions = [eq(catalogLinks.organizacaoId, orgId), eq(catalogLinks.provider, "IFOOD")];
	if (merchantId) conditions.push(eq(catalogLinks.merchantId, merchantId));
	if (produtoIds) {
		if (produtoIds.length === 0) return [];
		conditions.push(inArray(catalogLinks.produtoId, produtoIds));
	}
	return db.query.catalogLinks.findMany({ where: and(...conditions) });
}

/**
 * Valida que o nó interno pertence à organização E é elegível a vínculo. Matéria-prima nunca é
 * vinculada: `vendavel = false` é o gate declarado do design, aplicado aqui como regra e não
 * como convenção.
 */
async function assertNodeIsLinkable({ orgId, node }: { orgId: string; node: TCatalogLinkNode }) {
	if (node.tipo === "PRODUTO" || node.tipo === "VARIANTE") {
		if (!node.produtoId) throw new createHttpError.BadRequest("Produto do vínculo não informado.");
		const product = await db.query.products.findFirst({
			where: and(eq(products.id, node.produtoId), eq(products.organizacaoId, orgId)),
			columns: { id: true, vendavel: true, ativo: true },
		});
		if (!product) throw new createHttpError.NotFound("Produto não encontrado.");
		if (!product.vendavel) throw new createHttpError.BadRequest("Produtos não vendáveis (matéria-prima) não podem ser vinculados ao iFood.");

		if (node.tipo === "VARIANTE") {
			if (!node.produtoVarianteId) throw new createHttpError.BadRequest("Variante do vínculo não informada.");
			const variant = await db.query.productVariants.findFirst({
				where: and(eq(productVariants.id, node.produtoVarianteId), eq(productVariants.organizacaoId, orgId)),
				columns: { id: true, produtoId: true },
			});
			if (!variant || variant.produtoId !== node.produtoId) throw new createHttpError.BadRequest("A variante não pertence ao produto informado.");
		}
	}
}

/**
 * Cria (ou revive) um vínculo. O unique de identidade é NULLS NOT DISTINCT, então o mesmo nó na
 * mesma loja nunca duplica — uma segunda tentativa reaproveita a linha, o que também é o caminho
 * de "revincular" algo que estava DESVINCULADO.
 */
export async function upsertCatalogLink({
	orgId,
	merchantId,
	node,
	externalRefs,
	sincronizar,
	autorId,
}: {
	orgId: string;
	merchantId: string;
	node: TCatalogLinkNode;
	externalRefs: TCatalogLinkExternalRefs;
	sincronizar?: Partial<TCatalogLinkSyncPolicy>;
	autorId?: string | null;
}): Promise<TCatalogLinkEntity> {
	await assertNodeIsLinkable({ orgId, node });

	const policy: TCatalogLinkSyncPolicy = { ...DEFAULT_CATALOG_LINK_SYNC_POLICY, ...sincronizar };
	const [link] = await db
		.insert(catalogLinks)
		.values({
			organizacaoId: orgId,
			provider: "IFOOD",
			merchantId,
			tipo: node.tipo,
			produtoId: node.produtoId ?? null,
			produtoVarianteId: node.produtoVarianteId ?? null,
			produtoAddOnId: node.produtoAddOnId ?? null,
			produtoAddOnOpcaoId: node.produtoAddOnOpcaoId ?? null,
			grupoInterno: node.grupoInterno ?? null,
			...externalRefs,
			sincronizar: policy,
			status: "PENDENTE",
			autorId: autorId ?? null,
		})
		.onConflictDoUpdate({
			target: [
				catalogLinks.organizacaoId,
				catalogLinks.provider,
				catalogLinks.merchantId,
				catalogLinks.tipo,
				catalogLinks.produtoId,
				catalogLinks.produtoVarianteId,
				catalogLinks.produtoAddOnId,
				catalogLinks.produtoAddOnOpcaoId,
			],
			set: {
				...externalRefs,
				sincronizar: policy,
				status: "PENDENTE",
				ultimoErro: null,
				dataAtualizacao: new Date(),
			},
		})
		.returning();
	return link;
}

export async function updateCatalogLinkPolicy({
	orgId,
	linkId,
	sincronizar,
}: {
	orgId: string;
	linkId: string;
	sincronizar: Partial<TCatalogLinkSyncPolicy>;
}): Promise<TCatalogLinkEntity> {
	const existing = await db.query.catalogLinks.findFirst({ where: and(eq(catalogLinks.id, linkId), eq(catalogLinks.organizacaoId, orgId)) });
	if (!existing) throw new createHttpError.NotFound("Vínculo não encontrado.");

	const [link] = await db
		.update(catalogLinks)
		.set({ sincronizar: { ...existing.sincronizar, ...sincronizar }, dataAtualizacao: new Date() })
		.where(eq(catalogLinks.id, linkId))
		.returning();
	return link;
}

/**
 * Desvincula. NUNCA remove nada no iFood (decisão D3 do doc de sync): o item remoto continua lá,
 * apenas deixa de ser gerido por aqui — deletar catálogo alheio por engano é irreversível.
 */
export async function unlinkCatalogLink({ orgId, linkId }: { orgId: string; linkId: string }): Promise<TCatalogLinkEntity> {
	const existing = await db.query.catalogLinks.findFirst({ where: and(eq(catalogLinks.id, linkId), eq(catalogLinks.organizacaoId, orgId)) });
	if (!existing) throw new createHttpError.NotFound("Vínculo não encontrado.");

	const [link] = await db
		.update(catalogLinks)
		.set({ status: "DESVINCULADO", divergencias: null, ultimoErro: null, dataAtualizacao: new Date() })
		.where(eq(catalogLinks.id, linkId))
		.returning();
	return link;
}

export async function markCatalogLinkError({ linkId, erro }: { linkId: string; erro: string }) {
	await db.update(catalogLinks).set({ status: "ERRO", ultimoErro: erro, dataAtualizacao: new Date() }).where(eq(catalogLinks.id, linkId));
}
