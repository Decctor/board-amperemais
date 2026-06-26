type JsonRecord = Record<string, unknown>;

export type TFiscalDocumentTaxTotalsView = {
	vBC: number | null;
	vICMS: number | null;
	vST: number | null;
	vFCP: number | null;
	vProd: number | null;
	vDesc: number | null;
	vPIS: number | null;
	vCOFINS: number | null;
	vTotTrib: number | null;
	vNF: number | null;
};

export type TFiscalDocumentPayloadItemView = {
	numero: number;
	descricao: string;
	ncm: string | null;
	cfop: string | null;
	quantidade: number | null;
	valorUnitario: number | null;
	valorTotal: number | null;
	csosn: string | null;
};

export type TFiscalDocumentSaleItemView = {
	id: string;
	descricao: string;
	quantidade: number;
	valorUnitario: number;
	valorTotal: number;
	desconto: number;
};

export type TFiscalDocumentSaleSummaryView = {
	vendaId: string | null;
	dataVenda: Date | null;
	valorTotal: number | null;
	statusVenda: string | null;
	canal: string | null;
	clienteNome: string | null;
	clienteCpfCnpj: string | null;
	itens: TFiscalDocumentSaleItemView[];
};

function parseStoredJson(value: string | null | undefined): JsonRecord | null {
	if (!value) return null;
	try {
		const parsed = JSON.parse(value);
		return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as JsonRecord) : null;
	} catch {
		return null;
	}
}

function readNumber(value: unknown): number | null {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string" && value.trim() !== "") {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : null;
	}
	return null;
}

function readString(value: unknown): string | null {
	if (typeof value === "string" && value.trim()) return value.trim();
	return null;
}

function extractCsosnFromImposto(imposto: unknown): string | null {
	if (!imposto || typeof imposto !== "object") return null;
	const icms = (imposto as JsonRecord).ICMS;
	if (!icms || typeof icms !== "object") return null;
	for (const node of Object.values(icms as JsonRecord)) {
		if (node && typeof node === "object" && "CSOSN" in (node as JsonRecord)) {
			return readString((node as JsonRecord).CSOSN);
		}
	}
	return null;
}

function resolveItemDescription(metadados: unknown, fallback: string) {
	if (!metadados || typeof metadados !== "object") return fallback;
	const record = metadados as JsonRecord;
	return readString(record.nomeProduto) ?? readString(record.descricao) ?? fallback;
}

export function parseFiscalDocumentProviderPayload(value: string | null | undefined) {
	return parseStoredJson(value);
}

export function parseFiscalDocumentProviderResponse(value: string | null | undefined) {
	return parseStoredJson(value);
}

export function extractTaxTotalsFromPayload(payload: JsonRecord | null): TFiscalDocumentTaxTotalsView | null {
	const icmsTot = payload?.infNFe && typeof payload.infNFe === "object" ? (payload.infNFe as JsonRecord).total : null;
	const icmsTotRecord = icmsTot && typeof icmsTot === "object" ? ((icmsTot as JsonRecord).ICMSTot as JsonRecord | undefined) : undefined;
	if (!icmsTotRecord) return null;

	return {
		vBC: readNumber(icmsTotRecord.vBC),
		vICMS: readNumber(icmsTotRecord.vICMS),
		vST: readNumber(icmsTotRecord.vST),
		vFCP: readNumber(icmsTotRecord.vFCP),
		vProd: readNumber(icmsTotRecord.vProd),
		vDesc: readNumber(icmsTotRecord.vDesc),
		vPIS: readNumber(icmsTotRecord.vPIS),
		vCOFINS: readNumber(icmsTotRecord.vCOFINS),
		vTotTrib: readNumber(icmsTotRecord.vTotTrib),
		vNF: readNumber(icmsTotRecord.vNF),
	};
}

export function extractPayloadItems(payload: JsonRecord | null): TFiscalDocumentPayloadItemView[] {
	const infNFe = payload?.infNFe;
	if (!infNFe || typeof infNFe !== "object") return [];
	const det = (infNFe as JsonRecord).det;
	if (!Array.isArray(det)) return [];

	return det.map((entry, index) => {
		const record = entry && typeof entry === "object" ? (entry as JsonRecord) : {};
		const prod = record.prod && typeof record.prod === "object" ? (record.prod as JsonRecord) : {};
		return {
			numero: readNumber(record.nItem) ?? index + 1,
			descricao: readString(prod.xProd) ?? `Item ${index + 1}`,
			ncm: readString(prod.NCM),
			cfop: readString(prod.CFOP),
			quantidade: readNumber(prod.qCom),
			valorUnitario: readNumber(prod.vUnCom),
			valorTotal: readNumber(prod.vProd),
			csosn: extractCsosnFromImposto(record.imposto),
		};
	});
}

type SaleSnapshotInput = {
	vendaId?: string | null;
	snapshotOrigemVenda?: string | null;
	venda?: {
		id: string;
		valorTotal: number;
		dataVenda: Date | null;
		statusVenda: string | null;
		canal: string | null;
		cliente?: { nome: string; cpfCnpj: string | null } | null;
		itens?: Array<{
			id: string;
			quantidade: number;
			valorVendaUnitario: number;
			valorVendaTotalBruto: number;
			valorTotalDesconto: number;
			metadados: unknown;
		}>;
	} | null;
};

export function buildFiscalDocumentSaleSummary(input: SaleSnapshotInput): TFiscalDocumentSaleSummaryView | null {
	const snapshot = parseStoredJson(input.snapshotOrigemVenda);
	const snapshotVenda = snapshot?.venda && typeof snapshot.venda === "object" ? (snapshot.venda as JsonRecord) : null;
	const snapshotDestinatario =
		snapshot?.destinatario && typeof snapshot.destinatario === "object" ? (snapshot.destinatario as JsonRecord) : null;

	const venda = input.venda;
	const vendaId = venda?.id ?? input.vendaId ?? readString(snapshotVenda?.id);
	if (!vendaId && !snapshotVenda) return null;

	const itensFromDb =
		venda?.itens?.map((item, index) => ({
			id: item.id,
			descricao: resolveItemDescription(item.metadados, `Item ${index + 1}`),
			quantidade: item.quantidade,
			valorUnitario: item.valorVendaUnitario,
			valorTotal: item.valorVendaTotalBruto,
			desconto: item.valorTotalDesconto,
		})) ?? [];

	const snapshotItens = Array.isArray(snapshotVenda?.itens) ? snapshotVenda.itens : [];
	const itensFromSnapshot = snapshotItens.map((entry, index) => {
		const item = entry && typeof entry === "object" ? (entry as JsonRecord) : {};
		return {
			id: readString(item.id) ?? `snapshot-${index}`,
			descricao: resolveItemDescription(item.metadados, `Item ${index + 1}`),
			quantidade: readNumber(item.quantidade) ?? 0,
			valorUnitario: readNumber(item.valorVendaUnitario) ?? 0,
			valorTotal: readNumber(item.valorVendaTotalBruto) ?? 0,
			desconto: readNumber(item.valorTotalDesconto) ?? 0,
		};
	});

	const clienteFromDb = venda?.cliente;
	const dataVendaRaw = venda?.dataVenda ?? snapshotVenda?.dataVenda;

	return {
		vendaId,
		dataVenda: dataVendaRaw instanceof Date ? dataVendaRaw : dataVendaRaw ? new Date(String(dataVendaRaw)) : null,
		valorTotal: venda?.valorTotal ?? readNumber(snapshotVenda?.valorTotal),
		statusVenda: venda?.statusVenda ?? readString(snapshotVenda?.statusVenda),
		canal: venda?.canal ?? readString(snapshotVenda?.canal),
		clienteNome: clienteFromDb?.nome ?? readString(snapshotDestinatario?.nome),
		clienteCpfCnpj: clienteFromDb?.cpfCnpj ?? readString(snapshotDestinatario?.cpfCnpj),
		itens: itensFromDb.length > 0 ? itensFromDb : itensFromSnapshot,
	};
}

export function formatJsonForDisplay(value: unknown) {
	try {
		return JSON.stringify(value, null, 2);
	} catch {
		return String(value);
	}
}
