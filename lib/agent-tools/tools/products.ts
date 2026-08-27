import { createSimilarityExpression, createSimplifiedEqualityCondition, createSimplifiedSearchCondition } from "@/lib/search";
import { db } from "@/services/drizzle";
import { products } from "@/services/drizzle/schema";
import { and, asc, count, desc, eq, or, type SQL } from "drizzle-orm";
import z from "zod";
import { resolveOrganizationScope } from "../organization-scope";
import { roundForModel } from "../serialization";
import { defineAgentTool } from "../types";

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

const SearchProductsInputSchema = z.object({
	termo: z.string({ invalid_type_error: "Tipo inválido para o termo de busca." }).optional().nullable(),
	codigo: z.string({ invalid_type_error: "Tipo inválido para o código." }).optional().nullable(),
	grupo: z.string({ invalid_type_error: "Tipo inválido para o grupo." }).optional().nullable(),
	apenasAtivos: z.boolean({ invalid_type_error: "Tipo inválido para apenas ativos." }).optional().nullable(),
	limite: z.number({ invalid_type_error: "Tipo inválido para o limite." }).int().positive().max(MAX_LIMIT).optional().nullable(),
	organizacaoId: z.string({ invalid_type_error: "Tipo inválido para o id da organização." }).optional().nullable(),
});

export const searchProductsTool = defineAgentTool({
	name: "search_products",
	title: "Buscar produtos",
	scopes: ["agent:products:read"],
	modes: ["ORG", "PLATAFORMA"],
	inputSchema: SearchProductsInputSchema,
	describe: (actor) =>
		[
			"Consulta o catálogo da organização por nome, código ou grupo. A busca por `termo` tolera acento e erro de digitação,",
			"e o resultado vem ordenado por semelhança com o termo.",
			"Preço e quantidade em estoque são **omitidos** quando a organização não os controla — campo ausente significa 'não sei',",
			"nunca zero: não afirme que um produto está sem estoque ou é gratuito com base na ausência do campo.",
			`Devolve no máximo ${MAX_LIMIT} produtos por chamada, acompanhados do total encontrado.`,
			actor.mode === "PLATAFORMA" ? "Informe `organizacaoId` (id ou slug) para escolher a organização." : "",
		]
			.filter(Boolean)
			.join(" "),
	execute: async (input, actor) => {
		const organizacaoId = await resolveOrganizationScope(actor, input.organizacaoId);
		const limite = input.limite ?? DEFAULT_LIMIT;

		const conditions: SQL[] = [eq(products.organizacaoId, organizacaoId)];

		const codigo = input.codigo?.trim();
		if (codigo) conditions.push(createSimplifiedEqualityCondition(products.codigo, codigo));

		const grupo = input.grupo?.trim();
		if (grupo) conditions.push(createSimplifiedEqualityCondition(products.grupo, grupo));

		if (input.apenasAtivos !== false) conditions.push(eq(products.ativo, true));

		const termo = input.termo?.trim();
		if (termo && termo.length >= 2) {
			const termCondition = or(
				createSimplifiedSearchCondition(products.nome, termo),
				createSimplifiedSearchCondition(products.descricao, termo),
				createSimplifiedEqualityCondition(products.codigo, termo),
			);
			if (termCondition) conditions.push(termCondition);
		}

		const where = and(...conditions);
		// Com termo, ordena por semelhança (índice trigram em `nome`); sem termo, ordem estável por nome.
		const orderBy = termo && termo.length >= 2 ? [desc(createSimilarityExpression(products.nome, termo))] : [asc(products.nome)];

		const [rows, totalResult] = await Promise.all([
			db.query.products.findMany({
				where,
				orderBy,
				limit: limite,
				columns: {
					id: true,
					nome: true,
					codigo: true,
					grupo: true,
					unidade: true,
					descricao: true,
					precoVenda: true,
					quantidade: true,
					ativo: true,
					rastreamentoEstoqueAtivo: true,
				},
			}),
			db.select({ total: count() }).from(products).where(where),
		]);

		const total = totalResult[0]?.total ?? 0;

		return {
			total,
			exibindo: rows.length,
			truncado: total > rows.length,
			produtos: rows.map((product) => ({
				id: product.id,
				nome: product.nome,
				codigo: product.codigo,
				grupo: product.grupo,
				unidade: product.unidade,
				descricao: product.descricao,
				ativo: product.ativo,
				precoVenda: roundForModel(product.precoVenda),
				// Estoque só é informação quando a organização rastreia estoque deste produto.
				// Fora disso o número guardado é resíduo, e um resíduo vira alucinação.
				quantidadeEstoque: product.rastreamentoEstoqueAtivo ? roundForModel(product.quantidade, 3) : undefined,
			})),
		};
	},
});
