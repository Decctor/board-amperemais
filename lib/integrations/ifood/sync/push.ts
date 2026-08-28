import { updateIfoodProduct } from "@/lib/integrations/ifood/catalog";
import { patchIfoodItem } from "@/lib/integrations/ifood/catalog-items";
import { resolveIfoodManagementContext } from "@/lib/integrations/ifood/context";
import type { TCatalogLinkSnapshot } from "@/schemas/catalog-links";
import { db } from "@/services/drizzle";
import { catalogLinks, type TCatalogLinkEntity } from "@/services/drizzle/schema";
import type { AxiosInstance } from "axios";
import { and, eq, inArray, ne } from "drizzle-orm";
import { markCatalogLinkError } from "./links";
import { resolvePublishNodes, type TPublishNode } from "./publish";

export type TPushFieldChange = { campo: keyof TCatalogLinkSnapshot; de: unknown; para: unknown };

/**
 * Campos que mudaram desde o último push, filtrados pela política do vínculo. Um campo com
 * política desligada nunca entra: é assim que "preço gerido no Portal" continua possível.
 */
export function diffAgainstSnapshot(link: TCatalogLinkEntity, node: TPublishNode): TPushFieldChange[] {
	const snapshot = link.ultimoSnapshot ?? {};
	const changes: TPushFieldChange[] = [];
	const check = (campo: keyof TCatalogLinkSnapshot, atual: unknown, habilitado: boolean) => {
		if (!habilitado) return;
		if (snapshot[campo] !== atual) changes.push({ campo, de: snapshot[campo] ?? null, para: atual ?? null });
	};

	check("nome", node.nome, link.sincronizar.nome);
	check("descricao", node.descricao, link.sincronizar.descricao);
	check("imagemUrl", node.imagemCapaUrl, link.sincronizar.imagem);
	check("preco", node.preco, link.sincronizar.preco);
	check("disponivel", node.disponivel, link.sincronizar.disponibilidade);
	return changes;
}

function snapshotOf(link: TCatalogLinkEntity, node: TPublishNode): TCatalogLinkSnapshot {
	// O snapshot guarda só o que este vínculo sincroniza: um campo com política desligada não
	// pode "congelar" um valor e depois parecer divergente quando a política for religada.
	const previous = link.ultimoSnapshot ?? {};
	return {
		nome: link.sincronizar.nome ? node.nome : previous.nome,
		descricao: link.sincronizar.descricao ? node.descricao : previous.descricao,
		imagemUrl: link.sincronizar.imagem ? node.imagemCapaUrl : previous.imagemUrl,
		preco: link.sincronizar.preco ? node.preco : previous.preco,
		disponivel: link.sincronizar.disponibilidade ? node.disponivel : previous.disponivel,
	};
}

async function pushLink({
	client,
	link,
	node,
}: {
	client: AxiosInstance;
	link: TCatalogLinkEntity;
	node: TPublishNode;
}): Promise<{ linkId: string; mudancas: TPushFieldChange[]; enviado: boolean }> {
	const changes = diffAgainstSnapshot(link, node);
	if (changes.length === 0) return { linkId: link.id, mudancas: [], enviado: false };

	const touched = new Set(changes.map((change) => change.campo));

	// Preço e status vivem no ITEM; nome/descrição/imagem vivem no PRODUTO base. São dois
	// endpoints distintos — daí a separação abaixo.
	if ((touched.has("preco") || touched.has("disponivel")) && link.externoItemId) {
		await patchIfoodItem(client, link.merchantId, link.externoItemId, {
			preco: touched.has("preco") ? node.preco : undefined,
			status: touched.has("disponivel") ? (node.disponivel ? "AVAILABLE" : "UNAVAILABLE") : undefined,
		});
	}
	if ((touched.has("nome") || touched.has("descricao")) && link.externoProdutoId) {
		// A imagem não é reenviada aqui: exigiria novo upload a cada push, e o `imagePath` do
		// iFood não é derivável da URL interna. Trocar a foto é uma ação explícita (republicar).
		await updateIfoodProduct(client, link.merchantId, link.externoProdutoId, {
			nome: node.nome,
			descricao: node.descricao,
			codigoExterno: node.codigo,
		});
	}

	await db
		.update(catalogLinks)
		.set({
			status: "SINCRONIZADO",
			ultimoSnapshot: snapshotOf(link, node),
			dataUltimaSincronizacao: new Date(),
			ultimoErro: null,
			divergencias: null,
		})
		.where(eq(catalogLinks.id, link.id));

	return { linkId: link.id, mudancas: changes, enviado: true };
}

/**
 * Empurra as mudanças de um produto para todas as lojas onde ele está vinculado.
 *
 * Best-effort por vínculo: uma loja que falha é marcada com ERRO e não impede as outras — o
 * cron de reconciliação é a rede de segurança. Nunca lança, porque o chamador é o save do
 * produto (ou dos canais) e o cadastro não pode falhar por causa do iFood.
 */
export async function pushProductToLinkedMerchants({
	orgId,
	produtoId,
}: {
	orgId: string;
	produtoId: string;
}): Promise<{ enviados: number; erros: number; semMudanca: number }> {
	const links = await db.query.catalogLinks.findMany({
		where: and(
			eq(catalogLinks.organizacaoId, orgId),
			eq(catalogLinks.provider, "IFOOD"),
			eq(catalogLinks.produtoId, produtoId),
			ne(catalogLinks.status, "DESVINCULADO"),
		),
	});
	if (links.length === 0) return { enviados: 0, erros: 0, semMudanca: 0 };

	let enviados = 0;
	let erros = 0;
	let semMudanca = 0;

	const merchantIds = [...new Set(links.map((link) => link.merchantId))];
	for (const merchantId of merchantIds) {
		const merchantLinks = links.filter((link) => link.merchantId === merchantId);
		try {
			const context = await resolveIfoodManagementContext({ organizacaoId: orgId, merchantId });
			const nodes = await resolvePublishNodes({ orgId, merchantId, produtoId });

			for (const link of merchantLinks) {
				const node = nodes.find((candidate) => candidate.produtoVarianteId === (link.produtoVarianteId ?? null));
				if (!node) {
					// Variante removida/desativada: o item remoto continua lá, mas não temos mais o que
					// empurrar. Marcar ERRO deixa isso visível em vez de silenciar.
					await markCatalogLinkError({ linkId: link.id, erro: "O nó interno deste vínculo não existe mais (variante removida ou inativa)." });
					erros += 1;
					continue;
				}
				try {
					const result = await pushLink({ client: context.client, link, node });
					if (result.enviado) enviados += 1;
					else semMudanca += 1;
				} catch (error) {
					await markCatalogLinkError({ linkId: link.id, erro: error instanceof Error ? error.message : "Falha desconhecida ao sincronizar." });
					erros += 1;
				}
			}
		} catch (error) {
			// Falha de contexto (token, conexão removida): marca todos os vínculos da loja.
			const message = error instanceof Error ? error.message : "Falha ao resolver a conexão do iFood.";
			await db
				.update(catalogLinks)
				.set({ status: "ERRO", ultimoErro: message, dataAtualizacao: new Date() })
				.where(
					inArray(
						catalogLinks.id,
						merchantLinks.map((link) => link.id),
					),
				);
			erros += merchantLinks.length;
		}
	}

	return { enviados, erros, semMudanca };
}

/**
 * Dispara o push sem bloquear o chamador. O save do produto/canais responde na hora; a
 * sincronização acontece depois e, se falhar, fica registrada no vínculo (status ERRO) e é
 * recuperada pelo cron diário. Sem isto, uma indisponibilidade do iFood derrubaria o cadastro.
 */
export function schedulePushForProduct({ orgId, produtoId }: { orgId: string; produtoId: string }) {
	void pushProductToLinkedMerchants({ orgId, produtoId }).catch((error) => {
		console.error("[IFOOD_PUSH] Falha inesperada no push assíncrono.", { orgId, produtoId, error });
	});
}
