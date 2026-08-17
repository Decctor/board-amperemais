import { formatPhoneAsBase, formatToCPForCNPJ, formatToPhone } from "@/lib/formatting";
import dayjs from "dayjs";
import dayjsCustomParseFormat from "dayjs/plugin/customParseFormat";
import type {
	TCanonicalClient,
	TCanonicalConnectorBatch,
	TCanonicalImportWindow,
	TCanonicalPartner,
	TCanonicalProduct,
	TCanonicalSale,
	TCanonicalSaleItem,
	TCanonicalSeller,
} from "../types";
import type { TOnlineSoftwareSaleImportation, TOnlineSoftwareSaleItemImportation } from "./types";

dayjs.extend(dayjsCustomParseFormat);

export function computeOnlineSoftwareSaleDate(sale: TOnlineSoftwareSaleImportation) {
	const saleDateTime = sale.datahora ? dayjs(sale.datahora, ["DD/MM/YYYY HH:mm:ss", "DD/MM/YYYY HH:mm"], true) : null;
	const baseSaleDate = saleDateTime?.isValid() ? saleDateTime : dayjs(sale.data, "DD/MM/YYYY", true);

	if (!baseSaleDate.isValid()) {
		throw new Error(`Data inválida recebida da Online Software. data="${sale.data}" datahora="${sale.datahora ?? ""}"`);
	}

	return saleDateTime?.isValid()
		? saleDateTime.toDate()
		: dayjs().isSame(baseSaleDate, "day")
			? dayjs().toDate()
			: baseSaleDate.add(3, "hours").toDate();
}

function isValidOnlineSoftwareClient(sale: TOnlineSoftwareSaleImportation) {
	return sale.cliente !== "AO CONSUMIDOR";
}

function isValidOnlineSoftwareSeller(sellerName?: string | null) {
	return !!sellerName && sellerName !== "N/A" && sellerName !== "0";
}

function isValidOnlineSoftwarePartner(partnerIdentifier?: string | null) {
	return !!partnerIdentifier && partnerIdentifier !== "N/A" && partnerIdentifier !== "0";
}

export function mapOnlineSoftwareClient(sale: TOnlineSoftwareSaleImportation): TCanonicalClient | null {
	if (!isValidOnlineSoftwareClient(sale)) return null;

	const phoneSource = sale.clientefone || sale.clientecelular || "";

	return {
		externalId: null,
		name: sale.cliente,
		phone: formatToPhone(phoneSource),
		basePhone: formatPhoneAsBase(phoneSource),
	};
}

export function mapOnlineSoftwareSeller(sale: TOnlineSoftwareSaleImportation): TCanonicalSeller | null {
	if (!isValidOnlineSoftwareSeller(sale.vendedor)) return null;
	return {
		identifier: sale.vendedor,
		name: sale.vendedor,
	};
}

export function mapOnlineSoftwarePartner(sale: TOnlineSoftwareSaleImportation): TCanonicalPartner | null {
	if (!isValidOnlineSoftwarePartner(sale.parceiro)) return null;

	const identifier = sale.parceiro as string;
	const cpfCnpj = formatToCPForCNPJ(identifier);

	return {
		identifier,
		name: "NÃO DEFINIDO",
		affiliateCode: identifier,
		cpfCnpj,
		clientLink: {
			name: "NÃO DEFINIDO",
			cpfCnpj,
		},
	};
}

export function mapOnlineSoftwareProduct(item: TOnlineSoftwareSaleItemImportation): TCanonicalProduct {
	return {
		externalId: null,
		code: item.codigo,
		description: item.descricao,
		unit: item.unidade,
		group: item.grupo,
		ncm: item.ncm,
		type: item.tipo,
	};
}

export function mapOnlineSoftwareSaleItem(item: TOnlineSoftwareSaleItemImportation): TCanonicalSaleItem {
	const quantity = Number(item.qtde);
	const unitSaleValue = Number(item.valorunit);
	const grossSaleValue = unitSaleValue * quantity;
	const discountValue = Number(item.vdesc);
	const netSaleValue = grossSaleValue - discountValue;
	const totalCostValue = Number(item.vcusto);

	return {
		productExternalId: null,
		productCode: item.codigo,
		quantity,
		unitSaleValue,
		unitCostValue: quantity > 0 ? totalCostValue / quantity : 0,
		grossSaleValue,
		discountValue,
		netSaleValue,
		totalCostValue,
		metadata: {
			baseicms: item.baseicms,
			percent: item.percent,
			icms: item.icms,
			cst_icms: item.cst_icms,
			csosn: item.csosn,
			cst_pis: item.cst_pis,
			cfop: item.cfop,
			vfrete: item.vfrete,
			vseg: item.vseg,
			voutro: item.voutro,
			vipi: item.vipi,
			vicmsst: item.vicmsst,
			vicms_desonera: item.vicms_desonera,
			cest: item.cest,
		},
	};
}

export function mapOnlineSoftwareSale(sale: TOnlineSoftwareSaleImportation): TCanonicalSale {
	const totalCost = sale.itens.reduce((acc, item) => acc + Number(item.vcusto), 0);
	const totalValue = Number(sale.valor);
	const hasSaleNature = sale.natureza === "SN01" || sale.natureza === "NFCE";
	const isValidSale = hasSaleNature && totalValue > 0;
	const isCanceled = hasSaleNature && totalValue <= 0;

	return {
		sourceSaleId: sale.id,
		totalValue,
		totalCost,
		totalDiscount: sale.itens.reduce((acc, item) => acc + Number(item.vdesc), 0),
		totalSurcharge: 0,
		sellerName: sale.vendedor || "N/A",
		channel: "Loja Física",
		deliveryMode: "PRESENCIAL",
		partnerIdentifier: isValidOnlineSoftwarePartner(sale.parceiro) ? (sale.parceiro as string) : null,
		key: sale.chave || "N/A",
		document: sale.documento || "N/A",
		model: sale.modelo || "N/A",
		movement: sale.movimento || "N/A",
		nature: sale.natureza || "N/A",
		series: sale.serie || "N/A",
		statusText: sale.situacao || "N/A",
		type: sale.tipo,
		occurredAt: computeOnlineSoftwareSaleDate(sale),
		client: mapOnlineSoftwareClient(sale),
		seller: mapOnlineSoftwareSeller(sale),
		partner: mapOnlineSoftwarePartner(sale),
		items: sale.itens.map(mapOnlineSoftwareSaleItem),
		isValidSale,
		isCanceled,
		raw: sale,
	};
}

const ONLINE_SOFTWARE_VALUE_TOLERANCE = 0.011;

export function getOnlineSoftwareSaleItemsTotal(sale: TOnlineSoftwareSaleImportation) {
	return sale.itens.reduce((total, item) => total + Number(item.valorunit) * Number(item.qtde) - Number(item.vdesc), 0);
}

function valuesMatch(left: number, right: number) {
	return Math.abs(left - right) < ONLINE_SOFTWARE_VALUE_TOLERANCE;
}

/**
 * A Online Software pode repetir o mesmo lancamento para representar movimentos de caixa
 * (ex.: venda de R$ 24,25 + troco de R$ 75,75). As ocorrencias repetem itens e identidade
 * fiscal; a venda canonica e a ocorrencia cujo `valor` fecha com o total liquido dos itens.
 */
export function reconcileOnlineSoftwareSales(sales: TOnlineSoftwareSaleImportation[]) {
	const salesById = new Map<string, TOnlineSoftwareSaleImportation[]>();
	for (const sale of sales) {
		salesById.set(sale.id, [...(salesById.get(sale.id) ?? []), sale]);
	}

	const reconciled: TOnlineSoftwareSaleImportation[] = [];
	let duplicateGroupsCount = 0;
	for (const [saleId, occurrences] of salesById) {
		if (occurrences.length === 1) {
			reconciled.push(occurrences[0]);
			continue;
		}

		duplicateGroupsCount++;
		const matchingOccurrences = occurrences.filter((occurrence) =>
			valuesMatch(Number(occurrence.valor), getOnlineSoftwareSaleItemsTotal(occurrence)),
		);
		if (matchingOccurrences.length === 0) {
			throw new Error(`Venda duplicada ${saleId} da Online Software sem ocorrencia cujo valor corresponda aos itens.`);
		}

		const canceledMatches = matchingOccurrences.filter(
			(occurrence) =>
				(occurrence.natureza === "SN01" || occurrence.natureza === "NFCE") &&
				(Number(occurrence.valor) <= 0 || occurrence.situacao === "02"),
		);
		if (canceledMatches.length === 1) {
			reconciled.push(canceledMatches[0]);
			continue;
		}

		const distinctMatches = new Set(matchingOccurrences.map((occurrence) => JSON.stringify(occurrence)));
		if (distinctMatches.size > 1) {
			throw new Error(`Venda duplicada ${saleId} da Online Software possui multiplas ocorrencias validas divergentes.`);
		}

		reconciled.push(matchingOccurrences[0]);
	}

	return {
		sales: reconciled,
		receivedRowsCount: sales.length,
		duplicateGroupsCount,
		discardedOccurrencesCount: sales.length - reconciled.length,
	};
}

function uniqueBy<T>(values: T[], getKey: (value: T) => string | null | undefined) {
	const map = new Map<string, T>();
	for (const value of values) {
		const key = getKey(value);
		if (!key || map.has(key)) continue;
		map.set(key, value);
	}
	return Array.from(map.values());
}

export function toCanonicalOnlineSoftwareImportBatch({
	organizationId,
	window,
	sales,
}: {
	organizationId: string;
	window: TCanonicalImportWindow;
	sales: TOnlineSoftwareSaleImportation[];
}): TCanonicalConnectorBatch {
	const reconciliation = reconcileOnlineSoftwareSales(sales);
	if (reconciliation.duplicateGroupsCount > 0) {
		console.info(`[ONLINE-SOFTWARE] Reconciliacao de vendas repetidas`, {
			organizationId,
			receivedRowsCount: reconciliation.receivedRowsCount,
			uniqueSalesCount: reconciliation.sales.length,
			duplicateGroupsCount: reconciliation.duplicateGroupsCount,
			discardedOccurrencesCount: reconciliation.discardedOccurrencesCount,
		});
	}
	const canonicalSales = reconciliation.sales.map(mapOnlineSoftwareSale);
	const products = uniqueBy(
		reconciliation.sales.flatMap((sale) => sale.itens.map(mapOnlineSoftwareProduct)),
		(product) => product.code,
	);
	const sellers = uniqueBy(
		canonicalSales.map((sale) => sale.seller).filter((seller): seller is TCanonicalSeller => !!seller),
		(seller) => seller.identifier,
	);
	const partners = uniqueBy(
		canonicalSales.map((sale) => sale.partner).filter((partner): partner is TCanonicalPartner => !!partner),
		(partner) => partner.identifier,
	);

	return {
		source: "ONLINE-SOFTWARE",
		organizationId,
		window,
		policies: {
			saleItemRewritePolicy: "REPLACE_ON_EVERY_SYNC",
			clientResolutionStrategy: "NAME_THEN_PHONE",
		},
		sales: canonicalSales,
		products,
		sellers,
		partners,
		productAddOns: [],
		productAddOnOptions: [],
		raw: sales,
	};
}
