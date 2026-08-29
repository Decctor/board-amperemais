import * as XLSX from "xlsx";
import type { TReplenishmentSettings } from "@/schemas/replenishment";
import type { TReplenishmentItem, TReplenishmentSummary } from "./types";

const STATUS_LABELS: Record<TReplenishmentItem["status"], string> = {
	RUPTURA: "RUPTURA",
	CRITICO: "CRÍTICO",
	ATENCAO: "ATENÇÃO",
	SAUDAVEL: "SAUDÁVEL",
	EXCESSO: "EXCESSO",
	SEM_GIRO: "SEM GIRO",
};

// Cabeçalho fixo, na ordem em que a compradora lê a linha: identificação, situação, números que
// justificam a compra e, por último, a quantidade — que é a única coluna da esquerda que ela edita.
const BASE_COLUMNS = [
	"CÓDIGO",
	"DESCRIÇÃO",
	"UNID.",
	"GRUPO",
	"FORNECEDOR ATUAL",
	"CURVA",
	"SITUAÇÃO",
	"ESTOQUE",
	"EM TRÂNSITO",
	"FLUXO NO PERÍODO",
	"DEMANDA/MÊS",
	"COBERTURA (DIAS)",
	"PONTO DE PEDIDO",
	"QUANTIDADE",
	"PREÇO VENDA",
	"CUSTO MÉDIO",
	"MARGEM %",
] as const;

const QUANTITY_COLUMN_INDEX = BASE_COLUMNS.indexOf("QUANTIDADE");
const SUPPLIER_BLOCK_WIDTH = 2;

export type TQuotationSpreadsheetInput = {
	items: TReplenishmentItem[];
	resumo: TReplenishmentSummary;
	settings: TReplenishmentSettings;
	periodo: { inicio: Date; fim: Date; janelaDias: number };
	// Nomes dos fornecedores que vão receber a cotação. Cada um ganha um par de colunas
	// (preço unitário e total) para ser preenchido na negociação.
	fornecedores: string[];
};

function cellRef(row: number, column: number) {
	return XLSX.utils.encode_cell({ r: row, c: column });
}

function formatDate(date: Date) {
	return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Sao_Paulo" }).format(date);
}

// A planilha sai com fórmulas vivas, não com números congelados: quem preenche o preço vê o total
// da linha e o total do pedido mudarem na hora, que é como a negociação acontece na prática.
export function buildQuotationWorkbook(input: TQuotationSpreadsheetInput) {
	const fornecedores = input.fornecedores.length > 0 ? input.fornecedores : ["FORNECEDOR 1", "FORNECEDOR 2", "FORNECEDOR 3"];
	const headerRow = 1;
	const firstDataRow = 2;

	const supplierColumnStart = BASE_COLUMNS.length;
	const comparisonColumnStart = supplierColumnStart + fornecedores.length * SUPPLIER_BLOCK_WIDTH;
	const totalColumns = comparisonColumnStart + 3;

	const sheet: XLSX.WorkSheet = {};
	const merges: XLSX.Range[] = [];

	function setCell(row: number, column: number, cell: XLSX.CellObject) {
		sheet[cellRef(row, column)] = cell;
	}

	// Linha 0: faixa com o nome de cada fornecedor sobre o seu par de colunas.
	fornecedores.forEach((fornecedor, index) => {
		const start = supplierColumnStart + index * SUPPLIER_BLOCK_WIDTH;
		setCell(0, start, { t: "s", v: fornecedor.toUpperCase() });
		merges.push({ s: { r: 0, c: start }, e: { r: 0, c: start + SUPPLIER_BLOCK_WIDTH - 1 } });
	});
	setCell(0, comparisonColumnStart, { t: "s", v: "MELHOR OFERTA" });
	merges.push({ s: { r: 0, c: comparisonColumnStart }, e: { r: 0, c: comparisonColumnStart + 2 } });

	// O rótulo vai na âncora da mesclagem (a célula superior esquerda): num intervalo mesclado o
	// Excel só preserva o valor da âncora e descarta o resto, então escrever na segunda linha faria
	// o cabeçalho inteiro sumir da planilha entregue ao fornecedor.
	BASE_COLUMNS.forEach((label, index) => {
		setCell(0, index, { t: "s", v: label });
		// As colunas fixas ocupam as duas primeiras linhas para alinhar com a faixa dos fornecedores.
		merges.push({ s: { r: 0, c: index }, e: { r: headerRow, c: index } });
	});
	fornecedores.forEach((_, index) => {
		const start = supplierColumnStart + index * SUPPLIER_BLOCK_WIDTH;
		setCell(headerRow, start, { t: "s", v: "PREÇO UNITÁRIO" });
		setCell(headerRow, start + 1, { t: "s", v: "PREÇO TOTAL" });
	});
	setCell(headerRow, comparisonColumnStart, { t: "s", v: "MENOR PREÇO UNIT." });
	setCell(headerRow, comparisonColumnStart + 1, { t: "s", v: "FORNECEDOR VENCEDOR" });
	setCell(headerRow, comparisonColumnStart + 2, { t: "s", v: "TOTAL NA MELHOR OFERTA" });

	input.items.forEach((item, index) => {
		const row = firstDataRow + index;
		const excelRow = row + 1;
		const quantityCell = `${XLSX.utils.encode_col(QUANTITY_COLUMN_INDEX)}${excelRow}`;

		const values: XLSX.CellObject[] = [
			{ t: "s", v: item.codigo },
			{ t: "s", v: item.nome },
			{ t: "s", v: item.unidade },
			{ t: "s", v: item.grupo },
			{ t: "s", v: item.fornecedor.nome ?? "" },
			{ t: "s", v: `${item.classeAbc}${item.demanda.regularidade}` },
			{ t: "s", v: STATUS_LABELS[item.status] },
			{ t: "n", v: Number(item.estoqueAtual.toFixed(2)) },
			{ t: "n", v: Number(item.estoqueEmTransito.toFixed(2)) },
			{ t: "n", v: Number(item.demanda.quantidadeTotalJanela.toFixed(2)) },
			{ t: "n", v: Number(item.demanda.demandaMensal.toFixed(2)) },
			item.coberturaDias == null ? { t: "s", v: "—" } : { t: "n", v: Number(item.coberturaDias.toFixed(1)) },
			{ t: "n", v: Number(item.plano.pontoPedido.toFixed(2)) },
			{ t: "n", v: Number(item.plano.quantidadeSugerida.toFixed(2)) },
			item.valores.precoVenda == null ? { t: "s", v: "" } : { t: "n", v: item.valores.precoVenda, z: "R$ #,##0.00" },
			item.valores.custoMedio == null ? { t: "s", v: "" } : { t: "n", v: item.valores.custoMedio, z: "R$ #,##0.00" },
			item.valores.margemPercentual == null ? { t: "s", v: "" } : { t: "n", v: Number((item.valores.margemPercentual / 100).toFixed(4)), z: "0.0%" },
		];
		values.forEach((cell, columnIndex) => setCell(row, columnIndex, cell));

		const unitPriceRefs: string[] = [];
		fornecedores.forEach((_, supplierIndex) => {
			const start = supplierColumnStart + supplierIndex * SUPPLIER_BLOCK_WIDTH;
			const unitPriceRef = `${XLSX.utils.encode_col(start)}${excelRow}`;
			unitPriceRefs.push(unitPriceRef);
			// Preço unitário fica vazio de propósito: é o campo que o fornecedor responde.
			setCell(row, start, { t: "z", z: "R$ #,##0.00" });
			setCell(row, start + 1, {
				t: "n",
				f: `IF(${unitPriceRef}="","",${quantityCell}*${unitPriceRef})`,
				z: "R$ #,##0.00",
			});
		});

		// União de referências: SMALL ignora as células ainda em branco, então a comparação já
		// funciona com uma cotação só respondida e vai se ajustando conforme as outras chegam.
		const unionRef = `(${unitPriceRefs.join(",")})`;
		const bestPriceRef = `${XLSX.utils.encode_col(comparisonColumnStart)}${excelRow}`;
		setCell(row, comparisonColumnStart, { t: "n", f: `IFERROR(SMALL(${unionRef},1),"")`, z: "R$ #,##0.00" });
		const winnerFormula = unitPriceRefs.reduceRight(
			(acc, ref, supplierIndex) => `IF(AND(${ref}<>"",${ref}=${bestPriceRef}),"${fornecedores[supplierIndex].replace(/"/g, "'")}",${acc})`,
			'""',
		);
		// Um valor em cache é obrigatório numa célula de texto com fórmula: sem ele o SheetJS descarta a
		// célula na escrita e a coluna do vencedor sai vazia da planilha. O Excel recalcula ao abrir.
		setCell(row, comparisonColumnStart + 1, { t: "s", v: "", f: winnerFormula });
		setCell(row, comparisonColumnStart + 2, {
			t: "n",
			f: `IF(${bestPriceRef}="","",${quantityCell}*${bestPriceRef})`,
			z: "R$ #,##0.00",
		});
	});

	const lastDataRow = firstDataRow + Math.max(input.items.length, 1) - 1;
	const footerStart = lastDataRow + 2;

	// Rodapé de negociação: total por fornecedor somado por fórmula, mais as duas linhas que a
	// compradora preenche à mão e que decidem tanto quanto o preço.
	const footerRows: { label: string; supplierCell: (columnStart: number) => XLSX.CellObject | null }[] = [
		{
			label: "Valor final do pedido",
			supplierCell: (columnStart) => ({
				t: "n",
				f: `SUM(${XLSX.utils.encode_col(columnStart + 1)}${firstDataRow + 1}:${XLSX.utils.encode_col(columnStart + 1)}${lastDataRow + 1})`,
				z: "R$ #,##0.00",
			}),
		},
		{ label: "Forma de pagamento", supplierCell: () => ({ t: "z" }) },
		{ label: "Previsão de entrega", supplierCell: () => ({ t: "z" }) },
		{ label: "Frete / condições", supplierCell: () => ({ t: "z" }) },
	];

	footerRows.forEach((footer, footerIndex) => {
		const row = footerStart + footerIndex;
		setCell(row, 0, { t: "s", v: footer.label });
		merges.push({ s: { r: row, c: 0 }, e: { r: row, c: QUANTITY_COLUMN_INDEX - 1 } });
		fornecedores.forEach((_, supplierIndex) => {
			const start = supplierColumnStart + supplierIndex * SUPPLIER_BLOCK_WIDTH;
			const cell = footer.supplierCell(start);
			if (cell) setCell(row, start, cell);
			merges.push({ s: { r: row, c: start }, e: { r: row, c: start + SUPPLIER_BLOCK_WIDTH - 1 } });
		});
	});

	const bestOfferTotalColumn = XLSX.utils.encode_col(comparisonColumnStart + 2);
	setCell(footerStart, comparisonColumnStart + 2, {
		t: "n",
		f: `SUM(${bestOfferTotalColumn}${firstDataRow + 1}:${bestOfferTotalColumn}${lastDataRow + 1})`,
		z: "R$ #,##0.00",
	});

	sheet["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: footerStart + footerRows.length, c: totalColumns - 1 } });
	sheet["!merges"] = merges;
	sheet["!cols"] = [
		{ wch: 14 },
		{ wch: 46 },
		{ wch: 7 },
		{ wch: 18 },
		{ wch: 24 },
		{ wch: 8 },
		{ wch: 12 },
		{ wch: 10 },
		{ wch: 12 },
		{ wch: 16 },
		{ wch: 13 },
		{ wch: 16 },
		{ wch: 16 },
		{ wch: 13 },
		{ wch: 13 },
		{ wch: 13 },
		{ wch: 10 },
		...Array.from({ length: fornecedores.length * SUPPLIER_BLOCK_WIDTH }, () => ({ wch: 16 })),
		{ wch: 18 },
		{ wch: 22 },
		{ wch: 22 },
	];

	const workbook = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(workbook, sheet, "Cotação");

	// Segunda aba: os parâmetros que produziram os números. Sem ela a planilha vira um conjunto de
	// quantidades sem defesa — e a primeira pergunta de quem aprova a compra é "por que 240?".
	const parametros = [
		["PARÂMETRO", "VALOR"],
		["Período analisado", `${formatDate(input.periodo.inicio)} a ${formatDate(input.periodo.fim)}`],
		["Janela de análise (dias)", input.periodo.janelaDias],
		["Prazo de entrega padrão (dias)", input.settings.leadTimeDiasPadrao],
		["Ciclo de revisão de compra (dias)", input.settings.cicloRevisaoDias],
		["Cobertura alvo (dias)", input.settings.diasCoberturaAlvo],
		["Nível de serviço", `${(input.settings.nivelServico * 100).toFixed(1)}%`],
		["Limite de excesso (dias)", input.settings.diasExcessoLimite],
		["Demanda ajustada por ruptura", input.settings.ajustarDemandaPorRuptura ? "Sim" : "Não"],
		[],
		["RESUMO", ""],
		["Produtos na lista", input.resumo.produtosAnalisados],
		["Produtos a comprar", input.resumo.produtosParaComprar],
		["Produtos em ruptura", input.resumo.produtosEmRuptura],
		["Produtos críticos", input.resumo.produtosCriticos],
		["Valor estimado da sugestão", input.resumo.valorSugestaoTotal],
		["Perda potencial se nada for comprado", input.resumo.perdaPotencialTotal],
		["Cobertura média (dias)", input.resumo.coberturaMediaDias ?? "—"],
		[],
		["COMO LER", ""],
		["Demanda/mês", "Média ponderada dos últimos meses (o mais recente pesa 3x), descontando os dias em que o item ficou zerado."],
		["Cobertura", "Quantos dias o estoque atual dura no ritmo de saída estimado."],
		["Ponto de pedido", "Saldo a partir do qual comprar deixa de ser opcional: cobre o prazo de entrega, o ciclo de compra e o estoque de segurança."],
		["Quantidade", "Quanto falta para chegar ao nível alvo, descontando o que já está em trânsito e arredondado para a embalagem de compra."],
		["Curva", "ABC pelo faturamento no período + XYZ pela regularidade da demanda (X previsível, Z errática)."],
	];
	const parametrosSheet = XLSX.utils.aoa_to_sheet(parametros);
	parametrosSheet["!cols"] = [{ wch: 38 }, { wch: 96 }];
	XLSX.utils.book_append_sheet(workbook, parametrosSheet, "Parâmetros");

	return workbook;
}

export function buildQuotationSpreadsheetBuffer(input: TQuotationSpreadsheetInput): Buffer {
	const workbook = buildQuotationWorkbook(input);
	return XLSX.write(workbook, { bookType: "xlsx", type: "buffer" }) as Buffer;
}
