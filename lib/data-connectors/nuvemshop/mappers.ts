import { formatPhoneAsBase, formatToCPForCNPJ, formatToPhone } from "@/lib/formatting";
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
import type { TNuvemshopOrder, TNuvemshopOrderProduct } from "./types";

function toStringId(value: string | number | null | undefined) {
	if (value === null || value === undefined || value === "") return null;
	return String(value);
}

function compactJoin(values: Array<string | null | undefined>, separator = " - ") {
	return values.filter((value): value is string => !!value && value.trim().length > 0).join(separator);
}

function parseOrderDate(order: TNuvemshopOrder) {
	const completedDate = order.completed_at?.date ? dayjs(order.completed_at.date.replace(" ", "T")) : null;
	if (completedDate?.isValid()) return completedDate.toDate();

	const createdAt = dayjs(order.created_at);
	if (!createdAt.isValid()) throw new Error(`Data inválida recebida da Nuvem Shop. pedido="${order.id}" created_at="${order.created_at}"`);
	return createdAt.toDate();
}

function mapDeliveryMode(order: TNuvemshopOrder): TCanonicalDeliveryMode {
	if (order.shipping_status || order.shipping_cost_customer > 0 || order.shipping_cost_owner > 0) return "ENTREGA";
	if (order.storefront === "pos") return "PRESENCIAL";
	return null;
}

function getClientName(order: TNuvemshopOrder) {
	return order.customer?.name || order.contact_name || order.billing_name || "CLIENTE NUVEM SHOP";
}

function getClientPhone(order: TNuvemshopOrder) {
	return order.customer?.phone || order.contact_phone || order.billing_phone || "";
}

export function mapNuvemshopClient(order: TNuvemshopOrder): TCanonicalClient | null {
	const phone = getClientPhone(order);
	const basePhone = formatPhoneAsBase(phone);
	const name = getClientName(order);
	const externalId = toStringId(order.customer?.id);

	if (!externalId && !basePhone && !name) return null;

	return {
		externalId,
		name,
		phone: formatToPhone(phone),
		basePhone,
		cpfCnpj: formatToCPForCNPJ(order.customer?.identification || order.contact_identification || ""),
		email: order.customer?.email || order.contact_email || null,
		location: {
			cep: order.customer?.billing_zipcode || order.billing_zipcode,
			state: order.customer?.billing_province || order.billing_province,
			city: order.customer?.billing_city || order.billing_city,
			neighborhood: order.customer?.billing_locality || order.billing_locality,
			street: order.customer?.billing_address || order.billing_address,
			number: order.customer?.billing_number || order.billing_number,
			complement: order.customer?.billing_floor || order.billing_floor,
		},
	};
}

function getProductCode(product: TNuvemshopOrderProduct) {
	return product.sku || toStringId(product.variant_id) || toStringId(product.product_id) || toStringId(product.id) || "PRODUTO-NUVEM-SHOP";
}

export function mapNuvemshopProduct(product: TNuvemshopOrderProduct): TCanonicalProduct {
	const productCode = getProductCode(product);

	return {
		externalId: toStringId(product.product_id),
		code: productCode,
		description: product.name_without_variants || product.name || productCode,
		unit: "UN",
		group: "Nuvem Shop",
		ncm: "N/A",
		type: "PRODUTO",
	};
}

export function mapNuvemshopSaleItem(product: TNuvemshopOrderProduct): TCanonicalSaleItem {
	const quantity = product.quantity;
	const unitSaleValue = product.price;
	const unitCostValue = product.cost;
	const grossSaleValue = unitSaleValue * quantity;
	const totalCostValue = unitCostValue * quantity;

	return {
		productExternalId: toStringId(product.product_id),
		productCode: getProductCode(product),
		quantity,
		unitSaleValue,
		unitCostValue,
		grossSaleValue,
		discountValue: 0,
		netSaleValue: grossSaleValue,
		totalCostValue,
		metadata: {
			lineItemId: toStringId(product.id),
			variantId: toStringId(product.variant_id),
			barcode: product.barcode,
			properties: product.properties,
		},
	};
}

export function isValidNuvemshopSale(order: TNuvemshopOrder) {
	return order.status !== "cancelled" && (order.payment_status === "paid" || order.payment_status === "partially_paid");
}

export function mapNuvemshopSale(order: TNuvemshopOrder): TCanonicalSale {
	const totalCost = order.products.reduce((acc, product) => acc + product.cost * product.quantity, 0);
	const isValidSale = isValidNuvemshopSale(order);
	const isCanceled = order.status === "cancelled" || order.payment_status === "voided" || order.payment_status === "refunded";

	return {
		sourceSaleId: String(order.id),
		displayId: toStringId(order.number),
		totalValue: order.total,
		totalCost,
		totalDiscount: order.discount,
		totalSurcharge: order.shipping_cost_customer + order.shipping_cost_owner,
		sellerName: "NUVEM SHOP",
		channel: order.storefront,
		deliveryMode: mapDeliveryMode(order),
		partnerIdentifier: null,
		key: "N/A",
		document: toStringId(order.number) ?? "N/A",
		model: "NUVEM-SHOP",
		movement: order.storefront ?? "N/A",
		nature: isValidSale ? "SN01" : "SN99",
		series: "N/A",
		statusText: compactJoin([order.status, order.payment_status, order.shipping_status]),
		type: "VENDA",
		notes: order.note,
		occurredAt: parseOrderDate(order),
		client: mapNuvemshopClient(order),
		seller: null,
		partner: null,
		items: order.products.map(mapNuvemshopSaleItem),
		isValidSale,
		isCanceled,
		raw: order,
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

export function toCanonicalNuvemshopImportBatch({
	organizationId,
	window,
	orders,
}: {
	organizationId: string;
	window: TCanonicalImportWindow;
	orders: TNuvemshopOrder[];
}): TCanonicalImportBatch {
	const sales = orders.map(mapNuvemshopSale);
	const products = uniqueBy(
		orders.flatMap((order) => order.products.map(mapNuvemshopProduct)),
		(product) => product.code,
	);

	return {
		source: "NUVEM-SHOP",
		organizationId,
		window,
		policies: {
			saleItemRewritePolicy: "REPLACE_ON_EVERY_SYNC",
			clientResolutionStrategy: "EXTERNAL_ID_THEN_PHONE",
		},
		sales,
		products,
		sellers: [],
		partners: [],
		productAddOns: [],
		productAddOnOptions: [],
		raw: orders,
	};
}
