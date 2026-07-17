import { formatPhoneAsBase, formatToCEP, formatToCPForCNPJ, formatToPhone } from "@/lib/formatting";
import type { TSaleAttendanceStatusEnum } from "@/schemas/enums";
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

type TIfoodOrderEventState = {
	statusText: string | null;
	confirmedAt: string | null;
	concludedAt: string | null;
	cancelledAt: string | null;
};

const IFOOD_EVENT_STATUS_BY_CODE: Record<string, string> = {
	PLC: "PLACED",
	PLACED: "PLACED",
	CFM: "CONFIRMED",
	CONFIRMED: "CONFIRMED",
	PRS: "PREPARATION_STARTED",
	PREPARATION_STARTED: "PREPARATION_STARTED",
	SPS: "SEPARATION_STARTED",
	SEPARATION_STARTED: "SEPARATION_STARTED",
	SPE: "SEPARATION_ENDED",
	SEPARATION_ENDED: "SEPARATION_ENDED",
	RTP: "READY_TO_PICKUP",
	READY_TO_PICKUP: "READY_TO_PICKUP",
	DSP: "DISPATCHED",
	DISPATCHED: "DISPATCHED",
	COL: "COLLECTED",
	COLLECTED: "COLLECTED",
	CON: "CONCLUDED",
	CONCLUDED: "CONCLUDED",
	CAN: "CANCELLED",
	CANCELLED: "CANCELLED",
	CANCELED: "CANCELED",
};

// Traducao do ciclo de pedido do iFood para o eixo operacional de atendimento da plataforma.
// Status desconhecido retorna null — o mapper canonico cai no comportamento legado.
const IFOOD_ATTENDANCE_STATUS_BY_ORDER_STATUS: Record<string, TSaleAttendanceStatusEnum> = {
	PLACED: "NAO_INICIADO",
	CONFIRMED: "EM_PREPARO",
	PREPARATION_STARTED: "EM_PREPARO",
	SEPARATION_STARTED: "EM_PREPARO",
	SEPARATION_ENDED: "PRONTO",
	READY_TO_PICKUP: "PRONTO",
	DISPATCHED: "EM_ENTREGA",
	COLLECTED: "EM_ENTREGA",
	CONCLUDED: "ENTREGUE",
	CANCELLED: "CANCELADO",
	CANCELED: "CANCELADO",
};

function mapIfoodAttendanceStatus(statusText: string | null): TSaleAttendanceStatusEnum | null {
	if (!statusText) return null;
	return IFOOD_ATTENDANCE_STATUS_BY_ORDER_STATUS[statusText.toUpperCase()] ?? null;
}

function getEventStatus(event: TIfoodEvent) {
	const code = event.code.toUpperCase();
	const fullCode = event.fullCode?.toUpperCase();
	return IFOOD_EVENT_STATUS_BY_CODE[fullCode ?? ""] ?? IFOOD_EVENT_STATUS_BY_CODE[code] ?? null;
}

function getOrderEventState(events: TIfoodEvent[]): TIfoodOrderEventState {
	const state: TIfoodOrderEventState = {
		statusText: null,
		confirmedAt: null,
		concludedAt: null,
		cancelledAt: null,
	};

	// Eventos podem chegar fora de ordem (garantia at-least-once, sem ordenacao) — o status
	// derivado deve ser o do evento mais recente por createdAt, nao o ultimo do array.
	const orderedEvents = [...events].sort((a, b) => {
		const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
		const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
		return aTime - bTime;
	});

	for (const event of orderedEvents) {
		const status = getEventStatus(event);
		if (!status) continue;
		state.statusText = status;
		if (status === "CONFIRMED") state.confirmedAt = event.createdAt ?? state.confirmedAt;
		if (status === "CONCLUDED") state.concludedAt = event.createdAt ?? state.concludedAt;
		if (status === "CANCELLED" || status === "CANCELED") state.cancelledAt = event.createdAt ?? state.cancelledAt;
	}

	return state;
}

function pickOrderDate(order: TIfoodOrder, eventState: TIfoodOrderEventState) {
	const rawDate = order.concludedAt || eventState.concludedAt || order.confirmedAt || eventState.confirmedAt || order.createdAt;
	const parsedDate = rawDate ? dayjs(rawDate) : null;
	if (!parsedDate?.isValid()) throw new Error(`Data inválida recebida do iFood. orderId="${order.id}"`);
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

function isCanceled(order: TIfoodOrder, eventState: TIfoodOrderEventState) {
	const status = (order.status || eventState.statusText)?.toUpperCase();
	return status === "CANCELLED" || status === "CANCELED" || !!order.cancelledAt || !!eventState.cancelledAt;
}

// Status que implicam pedido confirmado (etapas do ciclo posteriores a confirmacao).
const IFOOD_CONFIRMED_OR_LATER_STATUSES = new Set([
	"CONFIRMED",
	"PREPARATION_STARTED",
	"SEPARATION_STARTED",
	"SEPARATION_ENDED",
	"READY_TO_PICKUP",
	"DISPATCHED",
	"COLLECTED",
	"CONCLUDED",
]);

function isValidSale(order: TIfoodOrder, eventState: TIfoodOrderEventState) {
	const status = (order.status || eventState.statusText)?.toUpperCase();
	return (
		!isCanceled(order, eventState) &&
		((!!status && IFOOD_CONFIRMED_OR_LATER_STATUSES.has(status)) ||
			!!order.confirmedAt ||
			!!eventState.confirmedAt ||
			!!order.concludedAt ||
			!!eventState.concludedAt)
	);
}

export function mapIfoodSale(order: TIfoodOrder, events: TIfoodEvent[] = []): TCanonicalSale {
	const eventState = getOrderEventState(events);
	const validSale = isValidSale(order, eventState);
	const canceled = isCanceled(order, eventState);
	const totalDiscount = order.total.benefits || order.benefits.reduce((acc, benefit) => acc + benefit.value, 0);
	const merchantName = order.merchant?.name || "IFOOD";
	const statusText = order.status || eventState.statusText || "N/A";

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
		statusText,
		type: "VENDA",
		occurredAt: pickOrderDate(order, eventState),
		client: mapIfoodClient(order),
		seller: null,
		partner: null,
		items: order.items.map(mapIfoodSaleItem),
		isValidSale: validSale,
		isCanceled: canceled,
		attendanceStatus: mapIfoodAttendanceStatus(statusText),
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
	const eventsByOrderId = new Map<string, TIfoodEvent[]>();
	for (const event of events) {
		if (!event.orderId) continue;
		const orderEvents = eventsByOrderId.get(event.orderId) ?? [];
		orderEvents.push(event);
		eventsByOrderId.set(event.orderId, orderEvents);
	}

	const sales = orders.map((order) => mapIfoodSale(order, eventsByOrderId.get(order.id) ?? []));
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
