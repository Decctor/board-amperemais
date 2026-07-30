const CATALOG_MEMORY_START = "[CATALOGO_INTERNO]";
const CATALOG_MEMORY_END = "[/CATALOGO_INTERNO]";
const MAX_CATALOG_ITEMS = 10;

type TToolResult = { toolName: string; output: unknown };
type TCatalogItem = { produtoId: string; produtoVarianteId: string | null; nome: string; preco: number | null };

function asRecord(value: unknown): Record<string, unknown> | null {
	return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function successfulToolOutput(toolResult: TToolResult): Record<string, unknown> | null {
	const output = asRecord(toolResult.output);
	return output?.success === true ? output : null;
}

function extractCatalogItems(toolResults: TToolResult[]): TCatalogItem[] {
	const latestCatalogResult = toolResults
		.slice()
		.reverse()
		.find((toolResult) => toolResult.toolName === "produtos_consultar" && successfulToolOutput(toolResult));
	if (!latestCatalogResult) return [];

	const result = asRecord(successfulToolOutput(latestCatalogResult)?.result);
	const produtos = Array.isArray(result?.produtos) ? result.produtos : [];
	const items: TCatalogItem[] = [];

	for (const rawProduct of produtos) {
		const product = asRecord(rawProduct);
		if (!product || typeof product.produtoId !== "string" || typeof product.nome !== "string") continue;
		const variations = Array.isArray(product.variacoes) ? product.variacoes : [];

		if (variations.length === 0) {
			items.push({
				produtoId: product.produtoId,
				produtoVarianteId: null,
				nome: product.nome,
				preco: typeof product.preco === "number" ? product.preco : null,
			});
			continue;
		}

		for (const rawVariation of variations) {
			const variation = asRecord(rawVariation);
			if (!variation || typeof variation.produtoVarianteId !== "string" || typeof variation.nome !== "string") continue;
			items.push({
				produtoId: product.produtoId,
				produtoVarianteId: variation.produtoVarianteId,
				nome: `${product.nome} — ${variation.nome}`,
				preco: typeof variation.preco === "number" ? variation.preco : typeof product.preco === "number" ? product.preco : null,
			});
		}
	}

	return items.slice(0, MAX_CATALOG_ITEMS);
}

function hasSuccessfulTool(toolResults: TToolResult[], toolName: string): boolean {
	return toolResults.some((toolResult) => toolResult.toolName === toolName && successfulToolOutput(toolResult));
}

export function stripCatalogMemory(summary: string): string {
	const start = summary.indexOf(CATALOG_MEMORY_START);
	if (start < 0) return summary.trim();
	const end = summary.indexOf(CATALOG_MEMORY_END, start);
	if (end < 0) return summary.slice(0, start).trim();
	return `${summary.slice(0, start)}${summary.slice(end + CATALOG_MEMORY_END.length)}`.trim();
}

export function extractCatalogMemory(summary: string): string | null {
	const start = summary.indexOf(CATALOG_MEMORY_START);
	const end = summary.indexOf(CATALOG_MEMORY_END, start);
	if (start < 0 || end < 0) return null;
	return summary.slice(start, end + CATALOG_MEMORY_END.length);
}

function formatCatalogMemory(items: TCatalogItem[]): string | null {
	if (items.length === 0) return null;
	const lines = items.map(
		(item) =>
			`- produtoId=${item.produtoId}; produtoVarianteId=${item.produtoVarianteId ?? "null"}; nome=${JSON.stringify(item.nome)}; preco=${
				item.preco ?? "null"
			}`,
	);
	return `${CATALOG_MEMORY_START}\n${lines.join("\n")}\n${CATALOG_MEMORY_END}`;
}

export function mergeRunSummary({
	modelSummary,
	previousSummary,
	toolResults,
}: {
	modelSummary: string;
	previousSummary: string | null;
	toolResults: TToolResult[];
}): string {
	const cleanSummary = stripCatalogMemory(modelSummary);
	if (hasSuccessfulTool(toolResults, "orcamentos_criar") || hasSuccessfulTool(toolResults, "atendimento_transferir_para_humano")) {
		return cleanSummary;
	}

	const memory = formatCatalogMemory(extractCatalogItems(toolResults)) ?? (previousSummary ? extractCatalogMemory(previousSummary) : null);
	return memory ? `${cleanSummary}\n\n${memory}`.trim() : cleanSummary;
}
