import { formatPhoneAsBase, formatToCEP, formatToCPForCNPJ, formatToPhone } from "@/lib/formatting";
import dayjs from "dayjs";
import type {
	TCanonicalClient,
	TCanonicalDeliveryMode,
	TCanonicalImportBatch,
	TCanonicalImportWindow,
	TCanonicalProduct,
	TCanonicalSale,
	TCanonicalSaleItem,
} from "../types";
import type { TBlingContact, TBlingProduct, TBlingSale, TBlingSaleItem } from "./types";

function toStringId(value: string | number | null | undefined) {
	if (value === null || value === undefined || value === "") return null;
	return String(value);
}

function compactJoin(values: Array<string | null | undefined>, separator = " - ") {
	return values.filter((value): value is string => !!value && value.trim().length > 0).join(separator);
}

function getSaleStatusText(sale: TBlingSale) {
	return compactJoin([toStringId(sale.situacao?.nome), toStringId(sale.situacao?.valor), toStringId(sale.situacao?.id)]) || "N/A";
}

function parseSaleDate(sale: TBlingSale) {
	const rawDate = sale.dataSaida || sale.data || sale.dataPrevista;
	const parsedDate = rawDate ? dayjs(rawDate) : null;
	if (!parsedDate?.isValid()) throw new Error(`Data inválida recebida do Bling. pedido="${toStringId(sale.id) ?? "N/A"}" data="${rawDate ?? "N/A"}"`);
	return parsedDate.toDate();
}

function getStatusSearchText(status: string | number | null | undefined) {
	return String(status ?? "")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toUpperCase();
}

export function isBlingCanceledSaleStatus(status: string | number | null | undefined) {
	const value = getStatusSearchText(status);
	return value.includes("CANCEL") || value === "2";
}

export function isBlingValidSaleStatus(status: string | number | null | undefined) {
	const value = getStatusSearchText(status);
	if (!value || isBlingCanceledSaleStatus(value)) return false;
	if (value.includes("RASCUNHO") || value.includes("ORCAMENTO")) return false;
	return value.includes("CONFIRM") || value.includes("FATUR") || value.includes("ATEND") || value === "1" || value === "9";
}

export function mapBlingContactToCanonicalClient(contact: TBlingContact | null | undefined): TCanonicalClient | null {
	if (!contact) return null;

	const rawPhone = contact.celular || contact.telefone || "";
	const basePhone = formatPhoneAsBase(rawPhone);
	const externalId = toStringId(contact.id);
	const name = contact.nome || contact.fantasia || (basePhone ? `CLIENTE BLING ${basePhone}` : "CLIENTE BLING");
	const address = contact.endereco?.geral;

	if (!externalId && !basePhone && !name) return null;

	return {
		externalId,
		name,
		phone: formatToPhone(rawPhone),
		basePhone,
		cpfCnpj: formatToCPForCNPJ(contact.numeroDocumento ?? ""),
		email: contact.email,
		location: address
			? {
					cep: address.cep ? formatToCEP(address.cep) : null,
					state: address.uf,
					city: address.municipio,
					neighborhood: address.bairro,
					street: address.endereco,
					number: address.numero,
					complement: address.complemento,
				}
			: undefined,
	};
}

function getProductCode(product: TBlingProduct) {
	return product.codigo || toStringId(product.id) || "PRODUTO-BLING";
}

export function mapBlingProductToCanonicalProduct(product: TBlingProduct): TCanonicalProduct {
	const code = getProductCode(product);
	return {
		externalId: toStringId(product.id),
		code,
		description: product.nome || product.descricaoCurta || code,
		unit: product.unidade || "UN",
		group: product.categoria?.descricao || "Bling",
		ncm: product.tributacao?.ncm || "N/A",
		type: product.tipo || "PRODUTO",
	};
}

function getItemProductCode(item: TBlingSaleItem) {
	return item.codigo || toStringId(item.produto?.id) || toStringId(item.id) || "PRODUTO-BLING";
}

export function mapBlingSaleItemToCanonicalSaleItem(item: TBlingSaleItem): TCanonicalSaleItem {
	const quantity = item.quantidade;
	const unitSaleValue = item.valor;
	const grossSaleValue = unitSaleValue * quantity;
	const discountValue = item.desconto > 0 && item.desconto <= 100 ? grossSaleValue * (item.desconto / 100) : item.desconto;
	const netSaleValue = Math.max(grossSaleValue - discountValue, 0);

	return {
		productExternalId: toStringId(item.produto?.id),
		productCode: getItemProductCode(item),
		quantity,
		unitSaleValue,
		unitCostValue: 0,
		grossSaleValue,
		discountValue,
		netSaleValue,
		totalCostValue: 0,
		notes: item.descricaoDetalhada,
		metadata: {
			itemId: toStringId(item.id),
			unit: item.unidade,
			description: item.descricao,
		},
	};
}

function mapDeliveryMode(sale: TBlingSale): TCanonicalDeliveryMode {
	if ((sale.transporte?.frete ?? 0) > 0) return "ENTREGA";
	return null;
}

export function mapBlingSaleToCanonicalSale({ sale }: { sale: TBlingSale }): TCanonicalSale {
	const sourceSaleId = toStringId(sale.id);
	if (!sourceSaleId) throw new Error("[BLING_MAPPER] Pedido de venda recebido sem ID.");

	const statusText = getSaleStatusText(sale);
	const canceled = isBlingCanceledSaleStatus(statusText);
	const validSale = isBlingValidSaleStatus(statusText);
	const itemDiscount = sale.itens.reduce((acc, item) => acc + mapBlingSaleItemToCanonicalSaleItem(item).discountValue, 0);
	const explicitDiscount = sale.desconto?.valor ?? 0;
	const totalSurcharge = (sale.transporte?.frete ?? 0) + sale.outrasDespesas;

	return {
		sourceSaleId,
		displayId: sale.numero || sale.numeroLoja,
		totalValue: sale.total || sale.totalProdutos + totalSurcharge - explicitDiscount,
		totalCost: 0,
		totalDiscount: explicitDiscount || itemDiscount,
		totalSurcharge,
		sellerName: sale.vendedor?.nome || "BLING",
		channel: "Bling",
		deliveryMode: mapDeliveryMode(sale),
		partnerIdentifier: null,
		key: sourceSaleId,
		document: sale.numero || sourceSaleId,
		model: "BLING",
		movement: "VENDA",
		nature: validSale ? "SN01" : "SN99",
		series: "N/A",
		statusText,
		type: "VENDA",
		notes: sale.observacoes,
		occurredAt: parseSaleDate(sale),
		client: mapBlingContactToCanonicalClient(sale.contato),
		seller: sale.vendedor?.nome
			? {
					identifier: toStringId(sale.vendedor.id) || sale.vendedor.nome,
					name: sale.vendedor.nome,
				}
			: null,
		partner: null,
		items: sale.itens.map(mapBlingSaleItemToCanonicalSaleItem),
		isValidSale: validSale,
		isCanceled: canceled,
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

export function toCanonicalBlingImportBatch({
	organizationId,
	window,
	sales,
	contacts,
	products,
}: {
	organizationId: string;
	window: TCanonicalImportWindow;
	sales: TBlingSale[];
	contacts: TBlingContact[];
	products: TBlingProduct[];
}): TCanonicalImportBatch {
	const contactsById = new Map(
		contacts.map((contact) => [toStringId(contact.id), contact]).filter((entry): entry is [string, TBlingContact] => !!entry[0]),
	);
	const canonicalSales = sales.map((sale) =>
		mapBlingSaleToCanonicalSale({
			sale: {
				...sale,
				contato: (sale.contato?.id ? contactsById.get(String(sale.contato.id)) : null) ?? sale.contato,
			},
		}),
	);
	const itemProducts = sales.flatMap((sale) =>
		sale.itens.map<TCanonicalProduct>((item) => ({
			externalId: toStringId(item.produto?.id),
			code: getItemProductCode(item),
			description: item.descricao || getItemProductCode(item),
			unit: item.unidade || "UN",
			group: "Bling",
			ncm: "N/A",
			type: "PRODUTO",
		})),
	);

	return {
		source: "BLING",
		organizationId,
		window,
		policies: {
			saleItemRewritePolicy: "REPLACE_ON_EVERY_SYNC",
			clientResolutionStrategy: "EXTERNAL_ID_THEN_PHONE",
		},
		sales: canonicalSales,
		products: uniqueBy([...products.map(mapBlingProductToCanonicalProduct), ...itemProducts], (product) => product.code),
		sellers: uniqueBy(
			canonicalSales.map((sale) => sale.seller).filter((seller): seller is NonNullable<TCanonicalSale["seller"]> => !!seller),
			(seller) => seller.identifier,
		),
		partners: [],
		productAddOns: [],
		productAddOnOptions: [],
		raw: { sales, contacts, products },
	};
}
