import { products } from "@/services/drizzle/schema";
import { and, asc, count, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import z from "zod";
import { defineAgentTool } from "./define-tool";

/**
 * Consulta unificada do catálogo da organização.
 *
 * Substitui `search_products`, `get_products_by_group`, `get_product_by_code` e
 * `get_available_product_groups` — todas variações da mesma consulta.
 *
 * Corrige o furo multi-tenant do módulo antigo: as consultas de produto rodavam sem filtro de
 * organização e podiam devolver o catálogo de outra empresa. Aqui `organizacaoId` vem do
 * contexto e entra em todos os `where`.
 */
export const produtosConsultarTool = defineAgentTool({
	name: "produtos.consultar",
	description: `Consulta o catálogo de produtos da empresa.

Use visao="LISTA" (padrão) para ver produtos com nome, código, grupo, preço e variações.
Use visao="GRUPOS" para descobrir quais categorias de produto existem, com a contagem de cada
uma — útil quando o cliente pergunta "o que vocês vendem?".

Filtros disponíveis (combináveis, todos opcionais):
- termo: busca por nome (parcial) ou código do produto.
- grupo: restringe a uma categoria (use visao="GRUPOS" antes para descobrir os nomes válidos).
- precoMin / precoMax: faixa de preço de venda.
- apenasAtivos: por padrão true; use false apenas para consultar itens desativados.
- limite: quantos produtos retornar (máximo 50).

A resposta traz "totalEncontrado" — se for maior que o limite, refine os filtros em vez de
pedir mais páginas. Nunca invente preços ou disponibilidade: informe apenas o que vier daqui.`,
	inputSchema: z.object({
		termo: z.string().min(2).optional().describe("Busca pelo nome (parcial) ou código do produto."),
		grupo: z.string().min(1).optional().describe("Restringe a uma categoria/grupo de produtos."),
		precoMin: z.number().min(0).optional().describe("Preço de venda mínimo."),
		precoMax: z.number().min(0).optional().describe("Preço de venda máximo."),
		apenasAtivos: z.boolean().optional().describe("Considerar apenas produtos ativos. Padrão: true."),
		limite: z.number().int().min(1).max(50).optional().describe("Máximo de produtos retornados. Padrão: 10."),
		visao: z.enum(["LISTA", "GRUPOS"]).optional().describe("LISTA para produtos, GRUPOS para as categorias disponíveis."),
	}),
	async execute(input, context) {
		const { db, organizacaoId } = context;
		const limite = input.limite ?? 10;
		const visao = input.visao ?? "LISTA";
		const apenasAtivos = input.apenasAtivos ?? true;

		const conditions = [eq(products.organizacaoId, organizacaoId)];
		if (apenasAtivos) conditions.push(eq(products.ativo, true));
		if (input.grupo) conditions.push(eq(products.grupo, input.grupo));
		if (typeof input.precoMin === "number") conditions.push(gte(products.precoVenda, input.precoMin));
		if (typeof input.precoMax === "number") conditions.push(lte(products.precoVenda, input.precoMax));

		// O termo casa nome parcial OU código — o cliente tanto descreve quanto informa o código.
		if (input.termo) {
			const termo = `%${input.termo}%`;
			const termoCondition = or(ilike(products.nome, termo), ilike(products.codigo, termo));
			if (termoCondition) conditions.push(termoCondition);
		}

		const where = and(...conditions);

		if (visao === "GRUPOS") {
			const grupos = await db
				.select({ grupo: products.grupo, quantidade: count() })
				.from(products)
				.where(where)
				.groupBy(products.grupo)
				.orderBy(desc(sql`count(*)`))
				.limit(50);

			if (grupos.length === 0) {
				return { success: true, message: "Nenhuma categoria de produto encontrada com os filtros informados.", result: { grupos: [] } };
			}

			return {
				success: true,
				message: `${grupos.length} categoria(s) de produto encontrada(s).`,
				result: { grupos: grupos.map((g) => ({ grupo: g.grupo, quantidadeProdutos: Number(g.quantidade) })) },
			};
		}

		const [totalRow] = await db.select({ total: count() }).from(products).where(where);
		const totalEncontrado = Number(totalRow?.total ?? 0);

		if (totalEncontrado === 0) {
			return {
				success: true,
				message: "Nenhum produto encontrado com os filtros informados.",
				result: { totalEncontrado: 0, produtos: [] },
			};
		}

		const encontrados = await db.query.products.findMany({
			where,
			orderBy: [asc(products.nome)],
			limit: limite,
			columns: { nome: true, codigo: true, grupo: true, unidade: true, precoVenda: true, descricao: true },
			with: {
				variantes: {
					where: apenasAtivos ? (variante, { eq: equals }) => equals(variante.ativo, true) : undefined,
					columns: { nome: true, codigo: true, precoVenda: true },
					limit: 20,
				},
			},
		});

		return {
			success: true,
			message: `${encontrados.length} de ${totalEncontrado} produto(s) retornado(s).`,
			result: {
				totalEncontrado,
				produtos: encontrados.map((produto) => ({
					nome: produto.nome,
					codigo: produto.codigo,
					grupo: produto.grupo,
					unidade: produto.unidade,
					precoVenda: produto.precoVenda,
					descricao: produto.descricao,
					variacoes: produto.variantes.map((variante) => ({
						nome: variante.nome,
						codigo: variante.codigo,
						precoVenda: variante.precoVenda,
					})),
				})),
			},
		};
	},
});
