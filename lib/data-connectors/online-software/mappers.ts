import { formatPhoneAsBase, formatToCPForCNPJ, formatToPhone } from "@/lib/formatting";
import dayjs from "dayjs";
import dayjsCustomParseFormat from "dayjs/plugin/customParseFormat";
import type { TCanonicalClient, TCanonicalImportBatch, TCanonicalImportWindow, TCanonicalPartner, TCanonicalProduct, TCanonicalSale, TCanonicalSaleItem, TCanonicalSeller } from "../types";
import type { TOnlineSoftwareSaleImportation, TOnlineSoftwareSaleItemImportation } from "./types";

dayjs.extend(dayjsCustomParseFormat);

export function computeOnlineSoftwareSaleDate(sale: TOnlineSoftwareSaleImportation) {
	const saleDateTime = sale.datahora ? dayjs(sale.datahora, ["DD/MM/YYYY HH:mm:ss", "DD/MM/YYYY HH:mm"], true) : null;
	const baseSaleDate = saleDateTime?.isValid() ? saleDateTime : dayjs(sale.data, "DD/MM/YYYY", true);

	if (!baseSaleDate.isValid()) {
		throw new Error(`Data inválida recebida da Online Software. data="${sale.data}" datahora="${sale.datahora ?? ""}"`);
	}

	return saleDateTime?.isValid() ? saleDateTime.toDate() : dayjs().isSame(baseSaleDate, "day") ? dayjs().toDate() : baseSaleDate.add(3, "hours").toDate();
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
	const isValidSale = sale.natureza === "SN01";
	const isCanceled = sale.natureza !== "SN01" || Number(sale.valor) === 0;

	return {
		sourceSaleId: sale.id,
		totalValue: Number(sale.valor),
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
}): TCanonicalImportBatch {
	const canonicalSales = sales.map(mapOnlineSoftwareSale);
	const products = uniqueBy(
		sales.flatMap((sale) => sale.itens.map(mapOnlineSoftwareProduct)),
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

