import * as XLSX from "xlsx";

export type TStockPositionField = "codigo" | "descricao" | "quantidade" | "custoUnitario" | "precoVenda" | "quantidadeEmTransito" | "fornecedorNome";

export type TStockPositionParseResult = {
	origem: "PLANILHA" | "PDF";
	colunas: string[];
	linhas: Record<string, string | null>[];
	// Palpite do parser para cada campo interno. A tela mostra como sugestão editável: adivinhar
	// errado uma coluna de custo e gravar em silêncio é pior do que pedir uma conferência.
	mapeamentoSugerido: Partial<Record<TStockPositionField, string>>;
	avisos: string[];
};

// Sinônimos que aparecem nos relatórios dos ERPs regionais. A ordem importa: o primeiro padrão que
// casar vence, então os termos mais específicos vêm antes dos genéricos.
const FIELD_SYNONYMS: Record<TStockPositionField, string[]> = {
	codigo: ["codigo", "cod", "sku", "referencia", "ref", "codigointerno", "codprod"],
	descricao: ["descricao", "produto", "nome", "item", "mercadoria"],
	quantidade: ["estoqueatual", "saldoatual", "estoque", "saldo", "quantidade", "qtde", "qtd", "disponivel"],
	custoUnitario: ["custounitario", "customedio", "precocusto", "custo", "valorcusto"],
	precoVenda: ["precovenda", "valorvenda", "precodevenda", "venda", "preco"],
	quantidadeEmTransito: ["emtransito", "transito", "pedidopendente", "acaminho", "encomendado"],
	fornecedorNome: ["fornecedor", "fabricante", "marca"],
};

function normalizeHeader(value: string) {
	return value
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]/g, "");
}

export function suggestColumnMapping(columns: string[]): Partial<Record<TStockPositionField, string>> {
	const normalized = columns.map((column) => ({ original: column, normalized: normalizeHeader(column) }));
	const mapping: Partial<Record<TStockPositionField, string>> = {};
	const taken = new Set<string>();

	for (const [field, synonyms] of Object.entries(FIELD_SYNONYMS) as [TStockPositionField, string[]][]) {
		for (const synonym of synonyms) {
			const exact = normalized.find((column) => !taken.has(column.original) && column.normalized === synonym);
			if (exact) {
				mapping[field] = exact.original;
				taken.add(exact.original);
				break;
			}
			const partial = normalized.find((column) => !taken.has(column.original) && column.normalized.includes(synonym));
			if (partial) {
				mapping[field] = partial.original;
				taken.add(partial.original);
				break;
			}
		}
	}

	return mapping;
}

// Relatórios brasileiros escrevem 1.234,56; planilhas exportadas em inglês escrevem 1,234.56.
// Quando os dois separadores aparecem, o último é o decimal. Quando aparece só um, a desambiguação
// é pelo tamanho do grupo à direita: exatamente três dígitos é separador de milhar ("1.234" é mil
// duzentos e trinta e quatro), qualquer outro tamanho é decimal ("4,83"). Ler 1.234 como 1,234
// dividiria a posição de estoque por mil sem produzir nenhum erro visível.
export function parseNumericValue(raw: string | number | null | undefined): number | null {
	if (raw == null) return null;
	if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;

	const cleaned = raw.replace(/[^\d.,-]/g, "").trim();
	if (!cleaned || cleaned === "-") return null;

	const commaCount = (cleaned.match(/,/g) ?? []).length;
	const dotCount = (cleaned.match(/\./g) ?? []).length;

	let normalized: string;
	if (commaCount > 0 && dotCount > 0) {
		const decimalSeparator = cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".") ? "," : ".";
		const thousandSeparator = decimalSeparator === "," ? "." : ",";
		normalized = cleaned.split(thousandSeparator).join("").replace(decimalSeparator, ".");
	} else if (commaCount + dotCount === 0) {
		normalized = cleaned;
	} else {
		const separator = commaCount > 0 ? "," : ".";
		const groups = cleaned.split(separator);
		const isThousandSeparator = groups.length > 2 || groups[groups.length - 1].length === 3;
		normalized = isThousandSeparator ? groups.join("") : `${groups[0]}.${groups[1]}`;
	}

	const value = Number(normalized);
	return Number.isFinite(value) ? value : null;
}

export function parseStockPositionSpreadsheet(buffer: ArrayBuffer | Buffer): TStockPositionParseResult {
	const workbook = XLSX.read(buffer, { type: "buffer" });
	const sheetName = workbook.SheetNames[0];
	if (!sheetName) return { origem: "PLANILHA", colunas: [], linhas: [], mapeamentoSugerido: {}, avisos: ["A planilha não tem nenhuma aba."] };

	const matrix = XLSX.utils.sheet_to_json<(string | number | null)[]>(workbook.Sheets[sheetName], { header: 1, blankrows: false, raw: false });
	if (matrix.length === 0) return { origem: "PLANILHA", colunas: [], linhas: [], mapeamentoSugerido: {}, avisos: ["A planilha está vazia."] };

	// O cabeçalho raramente está na primeira linha: relatórios de ERP começam com nome da empresa,
	// período e filtros. Procuramos a primeira linha que pareça um cabeçalho de verdade.
	const headerIndex = matrix.findIndex((row) => {
		const filled = row.filter((cell) => String(cell ?? "").trim().length > 0);
		if (filled.length < 2) return false;
		const mapping = suggestColumnMapping(filled.map((cell) => String(cell)));
		return mapping.codigo != null && mapping.quantidade != null;
	});

	const avisos: string[] = [];
	const resolvedHeaderIndex = headerIndex >= 0 ? headerIndex : 0;
	if (headerIndex < 0) avisos.push("Não foi possível identificar o cabeçalho automaticamente — confira o vínculo das colunas.");

	const headerRow = matrix[resolvedHeaderIndex] ?? [];
	const colunas = headerRow.map((cell, index) => {
		const label = String(cell ?? "").trim();
		return label.length > 0 ? label : `COLUNA ${index + 1}`;
	});

	const linhas = matrix
		.slice(resolvedHeaderIndex + 1)
		.map((row) => {
			const entry: Record<string, string | null> = {};
			colunas.forEach((column, index) => {
				const value = row[index];
				entry[column] = value == null || String(value).trim().length === 0 ? null : String(value).trim();
			});
			return entry;
		})
		.filter((row) => Object.values(row).some((value) => value != null));

	return { origem: "PLANILHA", colunas, linhas, mapeamentoSugerido: suggestColumnMapping(colunas), avisos };
}

type PdfTextItem = { text: string; x: number; y: number };

// Os itens de texto de um PDF chegam soltos, com coordenadas. Agrupar por Y reconstrói a linha
// visual; o X de cada título do cabeçalho reconstrói a coluna. É o que separa "extrair o texto"
// de "ler a tabela" — sem as coordenadas, descrição e quantidade viram uma string só.
function groupItemsIntoLines(items: PdfTextItem[], tolerance = 2): PdfTextItem[][] {
	const lines: { y: number; items: PdfTextItem[] }[] = [];
	for (const item of items) {
		const line = lines.find((candidate) => Math.abs(candidate.y - item.y) <= tolerance);
		if (line) line.items.push(item);
		else lines.push({ y: item.y, items: [item] });
	}
	return lines.sort((a, b) => b.y - a.y).map((line) => line.items.sort((a, b) => a.x - b.x));
}

export async function parseStockPositionPdf(buffer: ArrayBuffer | Buffer): Promise<TStockPositionParseResult> {
	const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
	const data = buffer instanceof Buffer ? new Uint8Array(buffer) : new Uint8Array(buffer);
	// useWorkerFetch e disableFontFace desligam o que só existe no navegador: sem eles o pdf.js
	// tenta buscar fontes por rede a partir do servidor e a leitura trava no timeout.
	const loadingTask = pdfjs.getDocument({ data, useWorkerFetch: false, disableFontFace: true });

	const items: PdfTextItem[][] = [];
	try {
		const document = await loadingTask.promise;
		for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
			const page = await document.getPage(pageNumber);
			const content = await page.getTextContent();
			// getTextContent devolve itens de texto e marcações estruturais na mesma lista; só os
			// primeiros têm `str` e a matriz de transformação de onde saem as coordenadas.
			const pageItems = (content.items as { str?: unknown; transform?: unknown }[])
				.flatMap((item) => {
					if (typeof item.str !== "string" || !Array.isArray(item.transform)) return [];
					const text = item.str.trim();
					if (text.length === 0) return [];
					return [{ text, x: Number(item.transform[4]), y: Number(item.transform[5]) }];
				})
				.filter((item) => Number.isFinite(item.x) && Number.isFinite(item.y));
			items.push(...groupItemsIntoLines(pageItems));
		}
	} finally {
		await loadingTask.destroy();
	}

	const avisos: string[] = [];
	const headerLineIndex = items.findIndex((line) => {
		if (line.length < 2) return false;
		const mapping = suggestColumnMapping(line.map((item) => item.text));
		return mapping.codigo != null && mapping.quantidade != null;
	});

	if (headerLineIndex < 0) {
		avisos.push(
			"Não foi possível identificar as colunas do PDF. Se o relatório for digitalizado (imagem), exporte-o em Excel ou CSV — o texto precisa ser selecionável.",
		);
		return { origem: "PDF", colunas: [], linhas: [], mapeamentoSugerido: {}, avisos };
	}

	const headerItems = items[headerLineIndex];
	const colunas = headerItems.map((item) => item.text);
	// Fronteira entre duas colunas: o ponto médio entre os títulos. Cada célula cai na coluna cujo
	// título está mais próximo à esquerda dela.
	const boundaries = headerItems.map((item, index) => {
		const next = headerItems[index + 1];
		return next ? (item.x + next.x) / 2 : Number.POSITIVE_INFINITY;
	});

	const linhas = items
		.slice(headerLineIndex + 1)
		.map((line) => {
			const entry: Record<string, string | null> = {};
			for (const coluna of colunas) entry[coluna] = null;
			for (const item of line) {
				const columnIndex = boundaries.findIndex((boundary) => item.x < boundary);
				const coluna = colunas[columnIndex >= 0 ? columnIndex : colunas.length - 1];
				entry[coluna] = entry[coluna] ? `${entry[coluna]} ${item.text}` : item.text;
			}
			return entry;
		})
		// Linhas de rodapé, totais e repetição do cabeçalho entre páginas não têm código utilizável.
		.filter((row) => Object.values(row).filter((value) => value != null).length >= 2);

	return { origem: "PDF", colunas, linhas, mapeamentoSugerido: suggestColumnMapping(colunas), avisos };
}

// Traduz as linhas cruas + o mapeamento confirmado na tela para os itens que serão gravados.
export function applyColumnMapping({
	linhas,
	mapeamento,
}: {
	linhas: Record<string, string | null>[];
	mapeamento: Partial<Record<TStockPositionField, string>>;
}) {
	const codigoColumn = mapeamento.codigo;
	const quantidadeColumn = mapeamento.quantidade;
	if (!codigoColumn || !quantidadeColumn) return { itens: [], descartadas: linhas.length };

	let descartadas = 0;
	const itens = linhas.flatMap((linha) => {
		const codigo = linha[codigoColumn]?.trim();
		const quantidade = parseNumericValue(linha[quantidadeColumn]);
		// Sem código ou sem quantidade numérica a linha não é uma posição de estoque — é cabeçalho
		// repetido, subtotal ou rodapé do relatório.
		if (!codigo || quantidade == null) {
			descartadas += 1;
			return [];
		}
		return [
			{
				codigo,
				descricao: mapeamento.descricao ? (linha[mapeamento.descricao] ?? null) : null,
				quantidade,
				custoUnitario: mapeamento.custoUnitario ? parseNumericValue(linha[mapeamento.custoUnitario]) : null,
				precoVenda: mapeamento.precoVenda ? parseNumericValue(linha[mapeamento.precoVenda]) : null,
				quantidadeEmTransito: mapeamento.quantidadeEmTransito ? parseNumericValue(linha[mapeamento.quantidadeEmTransito]) : null,
				fornecedorNome: mapeamento.fornecedorNome ? (linha[mapeamento.fornecedorNome] ?? null) : null,
			},
		];
	});

	return { itens, descartadas };
}
