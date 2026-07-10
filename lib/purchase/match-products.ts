import { db } from "@/services/drizzle";
import { products } from "@/services/drizzle/schema";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import { gateway, generateText, Output } from "ai";
import { z } from "zod";
import type { TExtractedCompositionItem } from "./import";

export type TCompositionMatchType = "MAPEADO" | "CODIGO" | "SUGERIDO" | "NAO_MAPEADO";

export type TMatchedProductInfo = {
	id: string;
	nome: string;
	codigo: string;
	unidade: string | null;
	imagemCapaUrl: string | null;
};

export type TMatchedCompositionItem = TExtractedCompositionItem & {
	matchTipo: TCompositionMatchType;
	confianca: number | null;
	produto: TMatchedProductInfo | null;
	produtoVarianteId: string | null;
};

const PRODUCT_INFO_COLUMNS = {
	id: products.id,
	nome: products.nome,
	codigo: products.codigo,
	unidade: products.unidade,
	imagemCapaUrl: products.imagemCapaUrl,
};

const AI_MATCH_MODEL = "anthropic/claude-haiku-4.5";
const AI_MATCH_MIN_CONFIDENCE = 0.5;
const CANDIDATES_PER_LINE = 5;

const AIMatchOutputSchema = z.object({
	matches: z.array(
		z.object({
			itemIndex: z.number(),
			produtoId: z.string().nullable(),
			confianca: z.number().min(0).max(1).nullable(),
		}),
	),
});

function extractSearchTokens(descricao: string) {
	return descricao
		.split(/[^\p{L}\p{N}]+/u)
		.map((token) => token.trim())
		.filter((token) => token.length >= 3)
		.slice(0, 4);
}

export async function matchCompositionItemsToProducts({
	organizacaoId,
	fornecedorId,
	itens,
}: {
	organizacaoId: string;
	fornecedorId: string | null;
	itens: TExtractedCompositionItem[];
}): Promise<TMatchedCompositionItem[]> {
	const results: TMatchedCompositionItem[] = itens.map((item) => ({
		...item,
		matchTipo: "NAO_MAPEADO",
		confianca: null,
		produto: null,
		produtoVarianteId: null,
	}));
	if (itens.length === 0) return results;

	const productInfoById = new Map<string, TMatchedProductInfo>();
	async function loadProductInfos(productIds: string[]) {
		const missing = [...new Set(productIds)].filter((id) => !productInfoById.has(id));
		if (missing.length === 0) return;
		const rows = await db
			.select(PRODUCT_INFO_COLUMNS)
			.from(products)
			.where(and(inArray(products.id, missing), eq(products.organizacaoId, organizacaoId)));
		for (const row of rows) productInfoById.set(row.id, row);
	}

	// Stage A — learned supplier mappings (deterministic, highest trust).
	if (fornecedorId) {
		const mappings = await db.query.supplierProductMappings.findMany({
			where: (fields, { and, eq }) => and(eq(fields.fornecedorId, fornecedorId), eq(fields.organizacaoId, organizacaoId)),
			columns: { codigoFornecedor: true, ean: true, produtoId: true, produtoVarianteId: true },
		});
		const mappingByCodigo = new Map(mappings.filter((m) => m.codigoFornecedor).map((m) => [m.codigoFornecedor as string, m]));
		const mappingByEan = new Map(mappings.filter((m) => m.ean).map((m) => [m.ean as string, m]));

		const mappedProductIds: string[] = [];
		for (const result of results) {
			const mapping = (result.codigoFornecedor && mappingByCodigo.get(result.codigoFornecedor)) || (result.ean && mappingByEan.get(result.ean)) || null;
			if (!mapping) continue;
			result.matchTipo = "MAPEADO";
			result.confianca = 1;
			result.produtoVarianteId = mapping.produtoVarianteId ?? null;
			result.produto = { id: mapping.produtoId, nome: "", codigo: "", unidade: null, imagemCapaUrl: null };
			mappedProductIds.push(mapping.produtoId);
		}
		await loadProductInfos(mappedProductIds);
		for (const result of results) {
			if (result.matchTipo !== "MAPEADO" || !result.produto) continue;
			const info = productInfoById.get(result.produto.id);
			// Mapping pointing at a product that no longer exists in the org: fall back to unmatched.
			if (!info) {
				result.matchTipo = "NAO_MAPEADO";
				result.confianca = null;
				result.produto = null;
				result.produtoVarianteId = null;
			} else {
				result.produto = info;
			}
		}
	}

	// Stage B — exact match of the extracted code/EAN against the internal product code.
	const pendingAfterMappings = results.filter((result) => result.matchTipo === "NAO_MAPEADO");
	const externalCodes = [
		...new Set(pendingAfterMappings.flatMap((result) => [result.codigoFornecedor, result.ean]).filter((code): code is string => !!code?.trim())),
	];
	if (externalCodes.length > 0) {
		const codeRows = await db
			.select(PRODUCT_INFO_COLUMNS)
			.from(products)
			.where(and(inArray(products.codigo, externalCodes), eq(products.organizacaoId, organizacaoId)));
		const productByCodigo = new Map(codeRows.map((row) => [row.codigo, row]));
		for (const result of pendingAfterMappings) {
			const match = (result.codigoFornecedor && productByCodigo.get(result.codigoFornecedor)) || (result.ean && productByCodigo.get(result.ean)) || null;
			if (!match) continue;
			result.matchTipo = "CODIGO";
			result.confianca = 0.95;
			result.produto = match;
		}
	}

	// Stage C — candidate retrieval by description tokens + one AI call to pick (or refuse) per line.
	const pendingForAI = results
		.map((result, index) => ({ result, index }))
		.filter(({ result }) => result.matchTipo === "NAO_MAPEADO" && result.descricao.trim().length >= 3);
	if (pendingForAI.length === 0) return results;

	const candidatesByItemIndex = new Map<number, TMatchedProductInfo[]>();
	for (const { result, index } of pendingForAI) {
		const tokens = extractSearchTokens(result.descricao);
		if (tokens.length === 0) continue;
		const tokenConditions = tokens.map((token) => sql`unaccent(${products.nome}) ILIKE unaccent('%' || ${token} || '%')`);
		const candidates = await db
			.select(PRODUCT_INFO_COLUMNS)
			.from(products)
			.where(and(eq(products.organizacaoId, organizacaoId), or(...tokenConditions)))
			.limit(CANDIDATES_PER_LINE);
		if (candidates.length > 0) candidatesByItemIndex.set(index, candidates);
	}
	if (candidatesByItemIndex.size === 0) return results;

	const aiPromptLines = [...candidatesByItemIndex.entries()].map(([index, candidates]) => ({
		itemIndex: index,
		descricaoNota: results[index].descricao,
		unidadeNota: results[index].unidade,
		candidatos: candidates.map((candidate) => ({ produtoId: candidate.id, nome: candidate.nome, codigo: candidate.codigo, unidade: candidate.unidade })),
	}));

	try {
		const { output } = await generateText({
			model: gateway(AI_MATCH_MODEL),
			output: Output.object({ schema: AIMatchOutputSchema }),
			system:
				"Você é um especialista em conciliar itens de notas fiscais com o catálogo interno de produtos de um varejo. " +
				"Para cada item, escolha o produtoId do candidato que representa o MESMO produto (mesmo tipo, marca e apresentação quando identificáveis), ou null se nenhum candidato for o mesmo produto. " +
				"Seja conservador: em dúvida, retorne null. Responda apenas no schema JSON pedido.",
			prompt: `Concilie os itens abaixo com os candidatos do catálogo. Retorne um match por itemIndex.\n\n${JSON.stringify(aiPromptLines)}`,
		});
		const parsed = AIMatchOutputSchema.parse(output);
		for (const match of parsed.matches) {
			const candidates = candidatesByItemIndex.get(match.itemIndex);
			const result = results[match.itemIndex];
			if (!candidates || !result || !match.produtoId) continue;
			const candidate = candidates.find((item) => item.id === match.produtoId);
			if (!candidate) continue;
			const confidence = match.confianca ?? AI_MATCH_MIN_CONFIDENCE;
			if (confidence < AI_MATCH_MIN_CONFIDENCE) continue;
			result.matchTipo = "SUGERIDO";
			result.confianca = confidence;
			result.produto = candidate;
		}
	} catch (error) {
		// AI matching is best-effort: lines simply stay NAO_MAPEADO for manual resolution.
		console.error("[PURCHASE_IMPORT] Erro no matching por IA, mantendo itens não mapeados.", error);
	}

	return results;
}
