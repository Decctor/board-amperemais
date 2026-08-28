import { getIfoodCatalogs, listIfoodCategories } from "@/lib/integrations/ifood/catalog";
import { resolveIfoodManagementContext } from "@/lib/integrations/ifood/context";
import type { TIfoodItemDTO } from "@/lib/integrations/ifood/catalog-types";
import type { TCatalogLinkDivergence } from "@/schemas/catalog-links";
import { db } from "@/services/drizzle";
import { catalogLinks, productChannelSettings, type TCatalogLinkEntity } from "@/services/drizzle/schema";
import { and, eq, ne } from "drizzle-orm";
import { resolvePublishNodes, type TPublishNode } from "./publish";

/** Tolerância de centavos: serialização de float não pode virar divergência falsa. */
const PRICE_TOLERANCE = 0.01;

/**
 * O catálogo do iFood é eventualmente consistente: medido ao vivo, um `PATCH /items` bem-sucedido
 * ainda devolvia o preço ANTIGO numa leitura imediata, e o novo alguns segundos depois. Sem esta
 * janela, uma reconciliação logo após um push marcaria DIVERGENTE por atraso de propagação —
 * e a UI ofereceria "adotar o preço do iFood", que gravaria de volta o valor velho.
 */
const PROPAGATION_GRACE_MS = 2 * 60 * 1000;

function priceDiverges(a: number | null | undefined, b: number | null | undefined) {
	if (a == null || b == null) return a !== b;
	return Math.abs(a - b) > PRICE_TOLERANCE + 1e-9;
}

/**
 * O iFood NORMALIZA texto ao salvar: enviamos "Lasanha bolonhesa GN 2,5kg" e ele devolve
 * "Lasanha bolonhesa Gn 2,5kg" (title case por palavra). Comparar byte a byte marcaria esses
 * vínculos como DIVERGENTE para sempre, e a UI ofereceria "aplicar o nosso" num loop infinito
 * que nunca converge. A comparação ignora caixa e espaços de borda — diferença real de conteúdo
 * continua sendo detectada.
 */
function textDiverges(a: string | null | undefined, b: string | null | undefined) {
	const normalize = (value: string | null | undefined) => (value ?? "").trim().toLocaleLowerCase("pt-BR");
	return normalize(a) !== normalize(b);
}

/**
 * Compara o estado desejado (interno) com o observado no iFood.
 *
 * Campos SINCRONIZADOS divergentes viram ação (re-push); campos NÃO sincronizados divergentes são
 * apenas registrados — é assim que "preço gerido no Portal" fica visível sem ser sobrescrito.
 */
export function computeDivergences({
	link,
	node,
	remote,
}: {
	link: TCatalogLinkEntity;
	node: TPublishNode;
	remote: TIfoodItemDTO;
}): TCatalogLinkDivergence[] {
	const divergences: TCatalogLinkDivergence[] = [];

	if (textDiverges(remote.nome, node.nome)) {
		divergences.push({ campo: "nome", valorInterno: node.nome, valorExterno: remote.nome, sincronizado: link.sincronizar.nome });
	}
	if (textDiverges(remote.descricao, node.descricao)) {
		divergences.push({ campo: "descricao", valorInterno: node.descricao, valorExterno: remote.descricao, sincronizado: link.sincronizar.descricao });
	}
	if (priceDiverges(remote.preco, node.preco)) {
		divergences.push({ campo: "preco", valorInterno: node.preco, valorExterno: remote.preco, sincronizado: link.sincronizar.preco });
	}
	const remoteDisponivel = remote.status === "AVAILABLE";
	if (remoteDisponivel !== node.disponivel) {
		divergences.push({
			campo: "disponibilidade",
			valorInterno: node.disponivel,
			valorExterno: remoteDisponivel,
			sincronizado: link.sincronizar.disponibilidade,
		});
	}
	return divergences;
}

/**
 * Reconcilia uma loja: lê o catálogo remoto UMA vez (a listagem por categoria já traz os itens) e
 * confronta com o estado desejado de cada vínculo.
 *
 * Não re-empurra automaticamente: marca DIVERGENTE e deixa a decisão para a UI ("aplicar o nosso"
 * ou "adotar o do iFood"). Push automático aqui transformaria uma edição legítima no Portal numa
 * briga silenciosa entre os dois sistemas.
 */
export async function reconcileMerchantCatalog({ orgId, merchantId }: { orgId: string; merchantId: string }) {
	const links = await db.query.catalogLinks.findMany({
		where: and(
			eq(catalogLinks.organizacaoId, orgId),
			eq(catalogLinks.provider, "IFOOD"),
			eq(catalogLinks.merchantId, merchantId),
			ne(catalogLinks.status, "DESVINCULADO"),
		),
	});
	if (links.length === 0) return { verificados: 0, sincronizados: 0, divergentes: 0, ausentes: 0, propagando: 0 };

	const context = await resolveIfoodManagementContext({ organizacaoId: orgId, merchantId });
	const catalogs = await getIfoodCatalogs(context.client, merchantId);
	const remoteItems = new Map<string, TIfoodItemDTO>();
	for (const catalog of catalogs) {
		const categorias = await listIfoodCategories(context.client, merchantId, { catalogId: catalog.id });
		for (const categoria of categorias) {
			for (const item of categoria.itens) if (item.id) remoteItems.set(item.id, item);
		}
	}

	// Um resolve por produto, reaproveitado pelos vínculos de suas variantes.
	const nodesByProduct = new Map<string, TPublishNode[]>();
	async function nodesFor(produtoId: string) {
		const cached = nodesByProduct.get(produtoId);
		if (cached) return cached;
		const nodes = await resolvePublishNodes({ orgId, merchantId, produtoId }).catch(() => [] as TPublishNode[]);
		nodesByProduct.set(produtoId, nodes);
		return nodes;
	}

	let sincronizados = 0;
	let divergentes = 0;
	let ausentes = 0;
	let propagando = 0;

	for (const link of links) {
		const remote = link.externoItemId ? remoteItems.get(link.externoItemId) : undefined;
		if (!remote) {
			// Item apagado no Portal: o vínculo aponta para o nada. ERRO (e não DESVINCULADO) porque
			// exige decisão — republicar ou desvincular.
			await db
				.update(catalogLinks)
				.set({ status: "ERRO", ultimoErro: "O item não existe mais no catálogo do iFood.", dataAtualizacao: new Date() })
				.where(eq(catalogLinks.id, link.id));
			ausentes += 1;
			continue;
		}

		const nodes = link.produtoId ? await nodesFor(link.produtoId) : [];
		const node = nodes.find((candidate) => candidate.produtoVarianteId === (link.produtoVarianteId ?? null));
		if (!node) {
			await db
				.update(catalogLinks)
				.set({ status: "ERRO", ultimoErro: "O nó interno deste vínculo não existe mais ou está sem preço.", dataAtualizacao: new Date() })
				.where(eq(catalogLinks.id, link.id));
			ausentes += 1;
			continue;
		}

		const divergences = computeDivergences({ link, node, remote });
		// Push recente: o remoto pode simplesmente ainda não ter propagado. Não marca divergência
		// (nem limpa a anterior) — a próxima passada decide com dado estável.
		const pushRecente = link.dataUltimaSincronizacao != null && Date.now() - link.dataUltimaSincronizacao.getTime() < PROPAGATION_GRACE_MS;
		if (pushRecente && divergences.some((divergence) => divergence.sincronizado)) {
			propagando += 1;
			continue;
		}
		const acionaveis = divergences.filter((divergence) => divergence.sincronizado);
		if (acionaveis.length === 0) {
			await db
				.update(catalogLinks)
				.set({ status: "SINCRONIZADO", divergencias: divergences.length ? divergences : null, dataAtualizacao: new Date() })
				.where(eq(catalogLinks.id, link.id));
			sincronizados += 1;
		} else {
			await db
				.update(catalogLinks)
				.set({ status: "DIVERGENTE", divergencias: divergences, dataAtualizacao: new Date() })
				.where(eq(catalogLinks.id, link.id));
			divergentes += 1;
		}
	}

	return { verificados: links.length, sincronizados, divergentes, ausentes, propagando };
}

/**
 * "Adotar o preço do iFood": grava o valor observado como override do canal daquela loja.
 *
 * É o que faz a matriz de canais refletir a realidade independentemente de onde o preço foi
 * editado — e, de quebra, torna o relatório de margem por canal honesto. O preço base nunca é
 * tocado: ele pertence aos canais internos.
 */
export async function adoptRemotePrice({ orgId, linkId }: { orgId: string; linkId: string }) {
	const link = await db.query.catalogLinks.findFirst({ where: and(eq(catalogLinks.id, linkId), eq(catalogLinks.organizacaoId, orgId)) });
	if (!link) throw new Error("Vínculo não encontrado.");

	const divergence = link.divergencias?.find((candidate) => candidate.campo === "preco");
	if (!divergence || typeof divergence.valorExterno !== "number") throw new Error("Não há divergência de preço registrada neste vínculo.");

	const channel = await db.query.salesChannels.findFirst({
		where: (fields, { and: andOp, eq: eqOp }) =>
			andOp(eqOp(fields.organizacaoId, orgId), eqOp(fields.canal, "IFOOD"), eqOp(fields.refExterno, link.merchantId)),
	});
	if (!channel || !link.produtoId) throw new Error("Canal do iFood não encontrado para esta loja.");

	await db
		.insert(productChannelSettings)
		.values({
			organizacaoId: orgId,
			canalVendaId: channel.id,
			produtoId: link.produtoId,
			produtoVarianteId: link.produtoVarianteId,
			precoVenda: divergence.valorExterno,
		})
		.onConflictDoUpdate({
			target: [productChannelSettings.canalVendaId, productChannelSettings.produtoId, productChannelSettings.produtoVarianteId],
			set: { precoVenda: divergence.valorExterno, dataAtualizacao: new Date() },
		});

	// O snapshot passa a refletir o novo desejado, senão o próximo push tentaria "corrigir" o
	// preço que acabamos de adotar.
	await db
		.update(catalogLinks)
		.set({
			status: "SINCRONIZADO",
			ultimoSnapshot: { ...link.ultimoSnapshot, preco: divergence.valorExterno },
			divergencias: null,
			dataUltimaSincronizacao: new Date(),
		})
		.where(eq(catalogLinks.id, link.id));

	return { precoAdotado: divergence.valorExterno };
}
