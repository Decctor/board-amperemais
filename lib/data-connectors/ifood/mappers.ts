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
import type { TIfoodEvent, TIfoodOrder, TIfoodOrderItem } from "./types";

function pickOrderDate(order: TIfoodOrder) {
	const rawDate = order.concludedAt || order.confirmedAt || order.createdAt;
	const parsedDate = rawDate ? dayjs(rawDate) : null;
	if (!parsedDate?.isValid()) throw new Error(`Data invÃ¡lida recebida do iFood. orderId="${order.id}"`);
	return parsedDate.toDate();
}

function mapDeliveryMode(order: TIfoodOrder): TCanonicalDeliveryMode {
	const orderType = order.orderType?.toUpperCase();
	if (orderType === "DELIVERY") return "ENTREGA";
	if (orderType === "TAKEOUT") return "RETIRADA";
	if (orderType === "DINE_IN" || orderType === "INDOOR") return "PRESENCIAL";
	return null;
}

export function mapIfoodClient(order: TIfoodOrder): TCanonicalClient | null {
	const customer = order.customer;
	if (!customer) return null;

	const phone = customer.phone ?? "";
	const basePhone = formatPhoneAsBase(phone);
	const name = customer.name || (basePhone ? `CLIENTE IFOOD ${basePhone}` : "CLIENTE IFOOD");
	const address = order.delivery?.deliveryAddress;

	return {
		externalId: customer.id,
		name,
		phone: formatToPhone(phone),
		basePhone,
		cpfCnpj: formatToCPForCNPJ(customer.documentNumber ?? ""),
		email: customer.email,
		location: address
			? {
					cep: address.postalCode ? formatToCEP(address.postalCode) : null,
					state: address.state,
					city: address.city,
					neighborhood: address.neighborhood,
					street: address.streetName,
					number: address.streetNumber,
					complement: address.complement,
					latitude: address.coordinates?.latitude ?? null,
					longitude: address.coordinates?.longitude ?? null,
				}
			: undefined,
	};
}

function getProductCode(item: TIfoodOrderItem) {
	return item.externalCode || item.id || item.uniqueId || "PRODUTO-IFOOD";
}

export function mapIfoodProduct(item: TIfoodOrderItem): TCanonicalProduct {
	const code = getProductCode(item);
	return {
		externalId: item.id || item.uniqueId,
		code,
		description: item.name || code,
		unit: "UN",
		group: "iFood",
		ncm: "N/A",
		type: "PRODUTO",
	};
}

export function mapIfoodSaleItem(item: TIfoodOrderItem): TCanonicalSaleItem {
	const quantity = item.quantity;
	const unitSaleValue = item.unitPrice;
	const grossSaleValue = unitSaleValue * quantity;
	const netSaleValue = item.totalPrice || grossSaleValue;

	return {
		productExternalId: item.id || item.uniqueId,
		productCode: getProductCode(item),
		quantity,
		unitSaleValue,
		unitCostValue: 0,
		grossSaleValue,
		discountValue: Math.max(grossSaleValue - netSaleValue, 0),
		netSaleValue,
		totalCostValue: 0,
		notes: item.observations,
		modifiers: item.options.map((option) => ({
			addOnExternalId: option.groupId || option.groupName || "IFOOD-ADICIONAIS",
			optionExternalId: option.id || option.externalCode || option.name || "IFOOD-ADICIONAL",
			name: option.name ?? undefined,
			quantity: option.quantity,
			unitValue: option.unitPrice,
		})),
		metadata: {
			uniqueId: item.uniqueId,
			options: item.options,
		},
	};
}

function isCanceled(order: TIfoodOrder) {
	const status = order.status?.toUpperCase();
	return status === "CANCELLED" || status === "CANCELED" || !!order.cancelledAt;
}

function isValidSale(order: TIfoodOrder) {
	const status = order.status?.toUpperCase();
	return !isCanceled(order) && (status === "CONFIRMED" || status === "CONCLUDED" || !!order.confirmedAt || !!order.concludedAt);
}

export function mapIfoodSale(order: TIfoodOrder): TCanonicalSale {
	const validSale = isValidSale(order);
	const canceled = isCanceled(order);
	const totalDiscount = order.total.benefits || order.benefits.reduce((acc, benefit) => acc + benefit.value, 0);
	const merchantName = order.merchant?.name || "IFOOD";

	return {
		sourceSaleId: order.id,
		displayId: order.displayId,
		totalValue: order.total.orderAmount || order.total.subTotal + order.total.deliveryFee + order.total.additionalFees - totalDiscount,
		totalCost: 0,
		totalDiscount,
		totalSurcharge: order.total.deliveryFee + order.total.additionalFees,
		sellerName: merchantName,
		channel: "iFood",
		deliveryMode: mapDeliveryMode(order),
		partnerIdentifier: null,
		key: order.id,
		document: order.displayId ?? order.id,
		model: "IFOOD",
		movement: order.orderType || order.category || "N/A",
		nature: validSale ? "SN01" : "SN99",
		series: "N/A",
		statusText: order.status || "N/A",
		type: "VENDA",
		occurredAt: pickOrderDate(order),
		client: mapIfoodClient(order),
		seller: null,
		partner: null,
		items: order.items.map(mapIfoodSaleItem),
		isValidSale: validSale,
		isCanceled: canceled,
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

export function toCanonicalIfoodImportBatch({
	organizationId,
	window,
	orders,
	events,
	postProcess,
}: {
	organizationId: string;
	window: TCanonicalImportWindow;
	orders: TIfoodOrder[];
	events: TIfoodEvent[];
	postProcess?: () => Promise<void>;
}): TCanonicalImportBatch {
	const sales = orders.map(mapIfoodSale);
	const products = uniqueBy(
		orders.flatMap((order) => order.items.map(mapIfoodProduct)),
		(product) => product.code,
	);

	return {
		source: "IFOOD",
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
		raw: { events, orders },
		postProcess,
	};
}
