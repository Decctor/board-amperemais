import {
	createSimilarityExpression,
	createSimplifiedEqualityCondition,
	createSimplifiedSearchCondition,
	createWordSimilarityExpression,
	extractSearchTokens,
} from "@/lib/search";
import { products, productVariants } from "@/services/drizzle/schema";
import { and, asc, count, desc, eq, exists, gte, ilike, inArray, lte, or, sql, type SQL } from "drizzle-orm";
import z from "zod";
import { findProductGroupByName, listActiveProductGroups } from "../shared/product-groups";
import { defineAgentTool } from "./define-tool";
import type { TAgentToolContext } from "./types";

/**
 * Consulta unificada do catálogo da organização.
 *
 * Substitui `search_products`, `get_products_by_group`, `get_product_by_code` e
 * `get_available_product_groups` — todas variações da mesma consulta.
 *
 * Corrige o furo multi-tenant do módulo antigo: as consultas de produto rodavam sem filtro de
 * organização e podiam devolver o catálogo de outra empresa. Aqui `organizacaoId` vem do
 * contexto e entra em todos os `where`.
 *
 * A busca por `termo` segue o mesmo padrão da conciliação de notas fiscais
 * (`lib/purchase/match-products.ts`): tokens sem acento sobre o índice trigram de
 * `products.nome`, ranking por `similarity`, e — quando nada casa — uma passada de
 * aproximação por `word_similarity` que devolve os mais parecidos em vez de um vazio seco.
 */

/**
 * Limiar de "parecido o suficiente" para a passada de aproximação. Baixo de propósito: ela só
 * roda quando a busca normal deu vazio, o resultado é ranqueado e o agente é instruído a
 * confirmar com o cliente antes de assumir o produto.
 */
const APPROXIMATE_MATCH_MIN_WORD_SIMILARITY = 0.35;

type TFoundProduct = {
	id: string;
	nome: string;
	codigo: string;
	grupo: string;
	unidade: string;
	precoVenda: number | null;
	descricao: string | null;
	variantes: Array<{ id: string; nome: string; codigo: string | null; precoVenda: number }>;
};

function formatProducts(found: TFoundProduct[], pricesVisible: boolean) {
	return found.map((product) => ({
		produtoId: product.id,
		nome: product.nome,
		codigo: product.codigo,
		grupo: product.grupo,
		unidade: product.unidade,
		...(pricesVisible ? { preco: product.precoVenda } : {}),
		descricao: product.descricao,
		variacoes: product.variantes.map((variant) => ({
			produtoVarianteId: variant.id,
			nome: variant.nome,
			codigo: variant.codigo,
			...(pricesVisible ? { preco: variant.precoVenda } : {}),
		})),
	}));
}

/**
 * Condição do termo: cada token precisa casar em algum lugar visível do produto — nome do
 * produto, nome/código de uma variação ativa, ou o código do produto por prefixo. O OR entre
 * tokens é deliberado (o padrão da conciliação de notas): recall alto, e o ranking por
 * similaridade coloca os melhores no topo.
 */
function buildTermCondition({
	db,
	organizacaoId,
	termo,
	activeOnly,
}: {
	db: TAgentToolContext["db"];
	organizacaoId: string;
	termo: string;
	activeOnly: boolean;
}): SQL | undefined {
	const tokens = extractSearchTokens(termo);
	// Termo sem token aproveitável (ex.: "a b"): cai para a substring do termo inteiro.
	const nameTerms = tokens.length > 0 ? tokens : [termo];
	const codePrefix = `${termo}%`;

	const variantConditions = [eq(productVariants.produtoId, products.id), eq(productVariants.organizacaoId, organizacaoId)];
	if (activeOnly) variantConditions.push(eq(productVariants.ativo, true));
	const variantTermCondition = or(
		...nameTerms.map((term) => createSimplifiedSearchCondition(productVariants.nome, term)),
		ilike(productVariants.codigo, codePrefix),
	);
	if (variantTermCondition) variantConditions.push(variantTermCondition);
	const variantMatch = exists(
		db
			.select({ id: productVariants.id })
			.from(productVariants)
			.where(and(...variantConditions)),
	);

	return or(...nameTerms.map((term) => createSimplifiedSearchCondition(products.nome, term)), ilike(products.codigo, codePrefix), variantMatch);
}

/**
 * Busca em duas fases, e não por acaso: o `findMany` relacional apelida a tabela
 * (`FROM "ampmais_products" "products"`), e um `EXISTS` construído com `db.select()` serializa a
 * correlação pelo nome bruto (`"ampmais_products"."id"`) — que sai de escopo quando o alias
 * existe, quebrando a query. A fase 1 resolve os IDs ranqueados no select builder (tabela sem
 * alias, correlação válida); a fase 2 usa o relacional só com `IN (ids)` para montar as variações.
 */
async function fetchRankedProducts({
	db,
	organizacaoId,
	where,
	orderBy,
	limit,
	activeOnly,
}: {
	db: TAgentToolContext["db"];
	organizacaoId: string;
	where: SQL | undefined;
	orderBy: SQL[];
	limit: number;
	activeOnly: boolean;
}): Promise<TFoundProduct[]> {
	const ranked = await db
		.select({ id: products.id })
		.from(products)
		.where(where)
		.orderBy(...orderBy)
		.limit(limit);
	if (ranked.length === 0) return [];
	const ids = ranked.map((row) => row.id);

	const rows = await db.query.products.findMany({
		where: and(eq(products.organizacaoId, organizacaoId), inArray(products.id, ids)),
		columns: { id: true, nome: true, codigo: true, grupo: true, unidade: true, precoVenda: true, descricao: true },
		with: {
			variantes: {
				where: activeOnly ? (variante, { eq: equals }) => equals(variante.ativo, true) : undefined,
				columns: { id: true, nome: true, codigo: true, precoVenda: true },
				limit: 20,
			},
		},
	});

	// O IN não preserva ordem: reordena pelo ranking da fase 1.
	const rankById = new Map(ids.map((id, index) => [id, index]));
	return rows.sort((a, b) => (rankById.get(a.id) ?? 0) - (rankById.get(b.id) ?? 0));
}

export const productsTool = defineAgentTool({
	name: "produtos.consultar",
	description: `Consulta o catálogo de produtos da empresa.

Use visao="LISTA" (padrão) para ver produtos com ID, nome, código, grupo e variações. Preços de
venda aparecem somente quando a política comercial do agente permite.
Use visao="GRUPOS" para ver as categorias de produto com a contagem de cada uma — útil quando o
cliente pergunta "o que vocês vendem?".

Filtros disponíveis (combináveis, todos opcionais):
- termo: busca por nome do produto ou das variações (ignora acentos e maiúsculas; as palavras
  podem aparecer em qualquer ordem) ou por código (prefixo). Prefira palavras-chave curtas
  ("vinho tinto") a frases inteiras.
- grupo: restringe a uma categoria. Use exatamente um dos grupos listados na seção "Grupos de
  produtos do catálogo" do seu contexto; a comparação ignora acentos e maiúsculas.
- precoMin / precoMax: faixa de preço de venda. Use somente quando o cliente pedir por faixa de
  preço — omita os dois nos demais casos.
- apenasAtivos: por padrão true; use false apenas para consultar itens desativados.
- limite: quantos produtos retornar (máximo 50).

Os resultados vêm ordenados por relevância ao termo. A resposta traz "totalEncontrado" — se for
maior que o limite, refine os filtros em vez de pedir mais páginas. Quando nada casa com o termo,
a ferramenta pode devolver os produtos mais parecidos com "correspondenciaAproximada": true —
nesse caso, confirme com o cliente antes de assumir que é o produto certo. Nunca invente preços
ou disponibilidade: informe apenas o que vier daqui.`,
	inputSchema: z.object({
		termo: z.string().min(2).optional().describe("Busca pelo nome do produto/variação ou pelo código (prefixo)."),
		grupo: z.string().min(1).optional().describe("Restringe a uma categoria/grupo de produtos (grafia da lista de grupos do contexto)."),
		precoMin: z.number().min(0).optional().describe("Preço de venda mínimo. Só envie se o cliente citou uma faixa de preço."),
		precoMax: z.number().positive("O preço máximo deve ser maior que zero.").optional().describe("Preço de venda máximo, maior que zero. Só envie se o cliente citou uma faixa de preço."),
		apenasAtivos: z.boolean().optional().describe("Considerar apenas produtos ativos. Padrão: true."),
		limite: z.number().int().min(1).max(50).optional().describe("Máximo de produtos retornados. Padrão: 10."),
		visao: z.enum(["LISTA", "GRUPOS"]).optional().describe("LISTA para produtos, GRUPOS para as categorias disponíveis."),
	}),
	async execute(input, context) {
		const { db, organizacaoId } = context;
		const pricesVisible = context.capacidades.comercial.precos.visiveis;
		if (!pricesVisible && (input.precoMin !== undefined || input.precoMax !== undefined)) {
			return {
				success: false,
				message: "A consulta por faixa de preço não está disponível para este agente.",
				result: { codigo: "PRECOS_NAO_VISIVEIS" },
			};
		}
		const limit = input.limite ?? 10;
		const view = input.visao ?? "LISTA";
		const activeOnly = input.apenasAtivos ?? true;
		const termo = input.termo?.trim();

		// Condições sem o termo: são a base da consulta principal e da passada de aproximação.
		const baseConditions = [eq(products.organizacaoId, organizacaoId)];
		if (activeOnly) baseConditions.push(eq(products.ativo, true));
		if (input.grupo) baseConditions.push(createSimplifiedEqualityCondition(products.grupo, input.grupo));
		if (typeof input.precoMin === "number") baseConditions.push(gte(products.precoVenda, input.precoMin));
		if (typeof input.precoMax === "number") baseConditions.push(lte(products.precoVenda, input.precoMax));

		const conditions = [...baseConditions];
		if (termo) {
			const termCondition = buildTermCondition({ db, organizacaoId, termo, activeOnly });
			if (termCondition) conditions.push(termCondition);
		}

		const where = and(...conditions);

		if (view === "GRUPOS") {
			const groups = await db
				.select({ grupo: products.grupo, quantidade: count() })
				.from(products)
				.where(where)
				.groupBy(products.grupo)
				.orderBy(desc(sql`count(*)`))
				.limit(50);

			if (groups.length === 0) {
				return { success: true, message: "Nenhuma categoria de produto encontrada com os filtros informados.", result: { grupos: [] } };
			}

			return {
				success: true,
				message: `${groups.length} categoria(s) de produto encontrada(s).`,
				result: { grupos: groups.map((g) => ({ grupo: g.grupo, quantidadeProdutos: Number(g.quantidade) })) },
			};
		}

		const [totalRow] = await db.select({ total: count() }).from(products).where(where);
		const totalEncontrado = Number(totalRow?.total ?? 0);

		if (totalEncontrado === 0) {
			// Grupo que não existe no catálogo: devolve a lista válida para o modelo se corrigir
			// na mesma execução, em vez de um vazio que ele não sabe interpretar.
			if (input.grupo) {
				const groups = await listActiveProductGroups(db, organizacaoId);
				if (!findProductGroupByName(groups, input.grupo)) {
					return {
						success: false,
						message: `O grupo "${input.grupo}" não existe no catálogo. Refaça a consulta usando um dos grupos disponíveis.`,
						result: { codigo: "GRUPO_INEXISTENTE", gruposDisponiveis: groups.map((group) => group.grupo) },
					};
				}
			}

			// "Você quis dizer": nada casou por substring, então tentamos por word_similarity —
			// pega erro de digitação ("vhinho" → "Vinho") sem exigir nova rodada do modelo.
			if (termo) {
				const wordSimilarity = createWordSimilarityExpression(products.nome, termo);
				const approximate = await fetchRankedProducts({
					db,
					organizacaoId,
					where: and(...baseConditions, sql`${wordSimilarity} > ${APPROXIMATE_MATCH_MIN_WORD_SIMILARITY}`),
					orderBy: [sql`${wordSimilarity} DESC`],
					limit,
					activeOnly,
				});

				if (approximate.length > 0) {
					return {
						success: true,
						message: `Nenhum produto casa exatamente com "${termo}". Retornando os ${approximate.length} mais parecidos — confirme com o cliente antes de assumir o produto.`,
						result: {
							totalEncontrado: approximate.length,
							correspondenciaAproximada: true,
							produtos: formatProducts(approximate, pricesVisible),
						},
					};
				}
			}

			return {
				success: true,
				message: termo
					? `Nenhum produto encontrado (nem por aproximação) para "${termo}". Verifique a grafia com o cliente ou consulte visao="GRUPOS" para explorar o catálogo.`
					: "Nenhum produto encontrado com os filtros informados.",
				result: { totalEncontrado: 0, produtos: [] },
			};
		}

		const found = await fetchRankedProducts({
			db,
			organizacaoId,
			where,
			// Com termo, relevância primeiro; alfabético é só critério de desempate.
			orderBy: termo ? [sql`${createSimilarityExpression(products.nome, termo)} DESC`, asc(products.nome)] : [asc(products.nome)],
			limit,
			activeOnly,
		});

		return {
			success: true,
			message: `${found.length} de ${totalEncontrado} produto(s) retornado(s).`,
			result: {
				totalEncontrado,
				produtos: formatProducts(found, pricesVisible),
			},
		};
	},
});
