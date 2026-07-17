import { formatPhoneAsBase, formatToCEP, formatToCPForCNPJ, formatToPhone } from "@/lib/formatting";
import type { TPaymentMethodEnum, TSaleAttendanceStatusEnum } from "@/schemas/enums";
import type { TSaleIntegrationMetadata } from "@/schemas/sales";
import dayjs from "dayjs";
import type {
	TCanonicalClient,
	TCanonicalDeliveryMode,
	TCanonicalImportBatch,
	TCanonicalImportWindow,
	TCanonicalProduct,
	TCanonicalSale,
	TCanonicalSaleItem,
	TCanonicalSalePayment,
} from "../types";
import type { TIfoodEvent, TIfoodOrder, TIfoodOrderBenefit, TIfoodOrderItem } from "./types";

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
	// Bruto = totalPrice (item + complementos): complementos são receita e compõem a base fiscal.
	// Unitário derivado do bruto para manter a regra da NF (vProd = qCom × vUnCom).
	const grossSaleValue = item.totalPrice || item.unitPrice * quantity;
	const unitSaleValue = quantity > 0 ? grossSaleValue / quantity : grossSaleValue;
	const netSaleValue = grossSaleValue;

	return {
		productExternalId: item.id || item.uniqueId,
		productCode: getProductCode(item),
		quantity,
		unitSaleValue,
		unitCostValue: 0,
		grossSaleValue,
		// Descontos reais da loja (benefits MERCHANT) são rateados depois em allocateMerchantDiscountsToItems.
		discountValue: 0,
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

function round2(value: number): number {
	return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Divide um benefit entre a parcela da loja (sponsorship MERCHANT — desconto real, reduz a NF)
 * e as parcelas patrocinadas (IFOOD/EXTERNAL/CHAIN — NF cheia, viram pagamento do patrocinador).
 * Benefit sem detalhamento de patrocínio é tratado como patrocinado DESCONHECIDO: nunca
 * subdeclara a NF, e a trava de rollout segura a emissão automática nesses casos.
 */
function getBenefitSponsorshipSplit(benefit: TIfoodOrderBenefit): { merchant: number; sponsoredByName: Map<string, number> } {
	const sponsorshipValues = benefit.sponsorshipValues ?? [];
	if (sponsorshipValues.length === 0) {
		return {
			merchant: 0,
			sponsoredByName: benefit.value > 0 ? new Map([["DESCONHECIDO", benefit.value]]) : new Map(),
		};
	}

	let merchant = 0;
	const sponsoredByName = new Map<string, number>();
	for (const sponsorship of sponsorshipValues) {
		if (sponsorship.value <= 0) continue;
		const name = sponsorship.name?.toUpperCase() || "DESCONHECIDO";
		if (name === "MERCHANT") merchant += sponsorship.value;
		else sponsoredByName.set(name, (sponsoredByName.get(name) ?? 0) + sponsorship.value);
	}
	return { merchant, sponsoredByName };
}

function applyDiscountToCanonicalItem(item: TCanonicalSaleItem, discount: number): number {
	const applied = Math.min(round2(discount), item.netSaleValue);
	if (applied <= 0) return 0;
	item.discountValue = round2(item.discountValue + applied);
	item.netSaleValue = round2(item.netSaleValue - applied);
	return applied;
}

/**
 * Rateia os descontos MERCHANT nos itens (C1 da fase 5): benefit de item vai direto no item
 * indicado por `targetId` (= items.index); benefit de carrinho (ou item não localizado) rateia
 * proporcionalmente ao valor dos itens; benefits de taxa de entrega ficam fora (tratados no
 * frete dos metadados de integração).
 */
function allocateMerchantDiscountsToItems(order: TIfoodOrder, items: TCanonicalSaleItem[]) {
	if (items.length === 0) return;
	let cartLevelDiscount = 0;

	for (const benefit of order.benefits) {
		const target = benefit.target?.toUpperCase();
		if (target === "DELIVERY_FEE") continue;
		const { merchant } = getBenefitSponsorshipSplit(benefit);
		if (merchant <= 0) continue;

		if ((target === "ITEM" || target === "PROGRESSIVE_DISCOUNT_ITEM") && benefit.targetId != null) {
			const orderItemPosition = order.items.findIndex((item) => item.index != null && String(item.index) === String(benefit.targetId));
			const canonicalItem = orderItemPosition >= 0 ? items[orderItemPosition] : undefined;
			if (canonicalItem) {
				const applied = applyDiscountToCanonicalItem(canonicalItem, merchant);
				const remainder = round2(merchant - applied);
				if (remainder > 0) cartLevelDiscount += remainder;
				continue;
			}
		}
		cartLevelDiscount += merchant;
	}

	if (cartLevelDiscount <= 0) return;
	const prorationBase = items.reduce((sum, item) => sum + item.netSaleValue, 0);
	if (prorationBase <= 0) return;
	const totalToAllocate = Math.min(round2(cartLevelDiscount), prorationBase);

	let allocated = 0;
	items.forEach((item, index) => {
		const share = index === items.length - 1 ? round2(totalToAllocate - allocated) : round2((totalToAllocate * item.netSaleValue) / prorationBase);
		allocated = round2(allocated + applyDiscountToCanonicalItem(item, share));
	});
}

/**
 * Detalhamento do canal para fiscal/conciliação (C4 da fase 5), persistido em
 * `sales.integracaoMetadados`. Frete: benefits MERCHANT de taxa de entrega reduzem o frete
 * cobrado (a loja abriu mão); benefits patrocinados mantêm o frete cheio (o canal paga).
 */
function buildIfoodIntegrationMetadata(order: TIfoodOrder): TSaleIntegrationMetadata {
	const deliveredBy = order.delivery?.deliveredBy?.toUpperCase() ?? null;

	let merchantItemAndCartDiscount = 0;
	let merchantDeliveryFeeDiscount = 0;
	const sponsoredTotals = new Map<string, number>();
	for (const benefit of order.benefits) {
		const isDeliveryFee = benefit.target?.toUpperCase() === "DELIVERY_FEE";
		const { merchant, sponsoredByName } = getBenefitSponsorshipSplit(benefit);
		if (isDeliveryFee) merchantDeliveryFeeDiscount += merchant;
		else merchantItemAndCartDiscount += merchant;
		for (const [name, value] of sponsoredByName) {
			sponsoredTotals.set(name, (sponsoredTotals.get(name) ?? 0) + value);
		}
	}

	const taxasCanal =
		order.additionalFees.length > 0
			? order.additionalFees.map((fee) => ({ tipo: fee.type ?? "ADDITIONAL_FEE", valor: round2(fee.value) }))
			: order.total.additionalFees > 0
				? [{ tipo: "ADDITIONAL_FEES", valor: round2(order.total.additionalFees) }]
				: [];

	return {
		versao: 1,
		canal: "IFOOD",
		entrega: {
			realizadaPor: deliveredBy === "MERCHANT" ? "LOJA" : deliveredBy ? "CANAL" : null,
			valorFrete: round2(Math.max(order.total.deliveryFee - merchantDeliveryFeeDiscount, 0)),
		},
		descontos: {
			loja: round2(merchantItemAndCartDiscount + merchantDeliveryFeeDiscount),
			patrocinados: [...sponsoredTotals.entries()].map(([patrocinador, valor]) => ({ patrocinador, valor: round2(valor) })),
		},
		taxasCanal,
	};
}

// Métodos de pagamento do iFood → enum de métodos da plataforma. Desconhecido cai em OUTRO.
const IFOOD_PAYMENT_METHOD_MAP: Record<string, TPaymentMethodEnum> = {
	CREDIT: "CARTAO_CREDITO",
	DEBIT: "CARTAO_DEBITO",
	PIX: "PIX",
	CASH: "DINHEIRO",
	MEAL_VOUCHER: "VALE",
	FOOD_VOUCHER: "VALE",
	GIFT_CARD: "VALE",
	BANK_TRANSFER: "TRANSFERENCIA",
};

/**
 * Pagamentos do pedido: cada entrada de `payments.methods` vira um pagamento canônico com a
 * distinção online (dinheiro fica com o iFood até o repasse) vs. offline (pago na entrega).
 * Sem `methods` no payload, cai no fallback pelos agregados `prepaid`/`pending`.
 */
function mapIfoodSalePayments(order: TIfoodOrder): TCanonicalSalePayment[] | null {
	const payments = order.payments;
	if (!payments) return null;

	const methods = payments.methods.filter((method) => method.value > 0);
	if (methods.length > 0) {
		return methods.map((method) => {
			const methodKey = method.method?.toUpperCase() ?? "";
			const description = [method.method, method.card?.brand].filter(Boolean).join(" ");
			return {
				metodo: IFOOD_PAYMENT_METHOD_MAP[methodKey] ?? "OUTRO",
				valor: method.value,
				pagoOnline: method.type?.toUpperCase() === "ONLINE" || method.prepaid === true,
				descricao: description || null,
			};
		});
	}

	const fallback: TCanonicalSalePayment[] = [];
	if (payments.prepaid > 0) fallback.push({ metodo: "OUTRO", valor: payments.prepaid, pagoOnline: true, descricao: "iFood (pago online)" });
	if (payments.pending > 0) fallback.push({ metodo: "OUTRO", valor: payments.pending, pagoOnline: false, descricao: "iFood (pago na entrega)" });
	return fallback.length > 0 ? fallback : null;
}

export function mapIfoodSale(order: TIfoodOrder, events: TIfoodEvent[] = []): TCanonicalSale {
	const eventState = getOrderEventState(events);
	const validSale = isValidSale(order, eventState);
	const canceled = isCanceled(order, eventState);
	const totalDiscount = order.total.benefits || order.benefits.reduce((acc, benefit) => acc + benefit.value, 0);
	const merchantName = order.merchant?.name || "IFOOD";
	const statusText = order.status || eventState.statusText || "N/A";
	const items = order.items.map(mapIfoodSaleItem);
	// C1 (fase 5): descontos reais da loja (sponsorship MERCHANT) reduzem os itens — e a NF.
	allocateMerchantDiscountsToItems(order, items);

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
		items,
		isValidSale: validSale,
		isCanceled: canceled,
		attendanceStatus: mapIfoodAttendanceStatus(statusText),
		payments: mapIfoodSalePayments(order),
		integrationMetadata: buildIfoodIntegrationMetadata(order),
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
