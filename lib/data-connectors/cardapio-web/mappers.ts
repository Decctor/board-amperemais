import { formatPhoneAsBase, formatToPhone } from "@/lib/formatting";
import type { TGetCardapioWebOrderDetailsOutput } from "./types";

// -----------------------------------------------------------------------------
// TYPE DEFINITIONS FOR MAPPED ENTITIES
// -----------------------------------------------------------------------------

export interface MappedCardapioWebClient {
	idExterno: string;
	nome: string;
	telefone: string;
	telefoneBase: string;
}

export interface MappedCardapioWebProduct {
	idExterno: string;
	codigo: string;
	descricao: string;
	unidade: string;
	grupo: string;
	ncm: string;
	tipo: string;
}

export interface MappedCardapioWebPartner {
	idExterno: string;
	identificador: string;
	nome: string;
	salesChannel: string;
}

export interface MappedCardapioWebProductAddOn {
	idExterno: string;
	nome: string;
	minOpcoes: number;
	maxOpcoes: number;
}

export interface MappedCardapioWebProductAddOnOption {
	idExterno: string;
	addOnIdExterno: string;
	nome: string;
	codigo: string | null;
	precoDelta: number;
	maxQtdePorItem: number;
}

export interface MappedCardapioWebSaleItem {
	produtoIdExterno: string;
	quantidade: number;
	valorVendaUnitario: number;
	valorVendaTotalBruto: number;
	valorTotalDesconto: number;
	valorVendaTotalLiquido: number;
	observacao: string | null;
	options: Array<{
		addOnIdExterno: string;
		optionIdExterno: string;
		quantidade: number;
		valorUnitario: number;
	}>;
}

export interface MappedCardapioWebSale {
	idExterno: string;
	displayId: string;
	valorTotal: number;
	custoTotal: number;
	taxaEntrega: number;
	taxaServico: number;
	taxaAdicional: number;
	descontoTotal: number;
	natureza: string;
	tipo: string;
	timing: string;
	salesChannel: string;
	entregaModalidade: string;
	documento: string | null;
	observacao: string | null;
	dataVenda: Date;
	cliente: MappedCardapioWebClient | null;
	parceiro: MappedCardapioWebPartner | null;
	itens: MappedCardapioWebSaleItem[];
	isValidSale: boolean;
	isCanceled: boolean;
}

// -----------------------------------------------------------------------------
// MAPPING FUNCTIONS
// -----------------------------------------------------------------------------

/**
 * Maps CardapioWeb customer data to our internal client format.
 * Returns null if no customer data is provided (anonymous orders).
 */
export function mapCardapioWebClient(customer: TGetCardapioWebOrderDetailsOutput["customer"]): MappedCardapioWebClient | null {
	if (!customer) return null;

	const phone = formatToPhone(customer.phone || "");
	const phoneBase = formatPhoneAsBase(customer.phone || "");

	return {
		idExterno: customer.id.toString(),
		nome: customer.name || "CLIENTE CARDAPIO WEB",
		telefone: phone,
		telefoneBase: phoneBase,
	};
}

/**
 * Maps CardapioWeb item to our internal product format.
 * Since CardapioWeb items don't have full product data,
 * we use item_id as the primary key and extract what we can.
 */
export function mapCardapioWebProduct(item: TGetCardapioWebOrderDetailsOutput["items"][number]): MappedCardapioWebProduct {
	return {
		idExterno: item.item_id?.toString() ?? "N/A",
		codigo: (item.external_code || item.item_id?.toString()) ?? "N/A",
		descricao: item.name,
		unidade: "UN", // CardapioWeb doesn't provide unit info
		grupo: item.kind === "combo" ? "COMBOS" : "PRODUTOS",
		ncm: "", // Not provided by CardapioWeb
		tipo: item.kind,
	};
}

/**
 * Extracts unique products from a list of order details.
 * Deduplicates by item_id.
 */
export function extractUniqueProducts(orders: TGetCardapioWebOrderDetailsOutput[]): MappedCardapioWebProduct[] {
	const productsMap = new Map<string, MappedCardapioWebProduct>();

	for (const order of orders) {
		for (const item of order.items) {
			const key = item.item_id?.toString() ?? "N/A";
			if (!productsMap.has(key)) {
				productsMap.set(key, mapCardapioWebProduct(item));
			}
		}
	}

	return Array.from(productsMap.values());
}

/**
 * Maps CardapioWeb sales channel to our internal partner format.
 * Partners in CardapioWeb context are the sales channels (iFood, WhatsApp, etc.)
 */
export function mapCardapioWebPartner(order: TGetCardapioWebOrderDetailsOutput): MappedCardapioWebPartner | null {
	return null; // Not the case for CardapioWeb, Sales Channels are handled differently
	// const salesChannel = order.sales_channel;

	// // Only create partner for marketplace channels
	// if (salesChannel === "catalog" || salesChannel === "store_front_catalog") {
	// 	return null; // Direct orders, no partner
	// }

	// const partnerNames: Record<string, string> = {
	// 	portal: "Portal CardapioWeb",
	// 	whatsapp_extension: "WhatsApp",
	// 	ifood: "iFood",
	// };

	// return {
	// 	idExterno: `cardapioweb_channel_${salesChannel}`,
	// 	identificador: salesChannel,
	// 	nome: partnerNames[salesChannel] || salesChannel.toUpperCase(),
	// 	salesChannel,
	// };
}

/**
 * Extracts unique partners from a list of order details.
 * Deduplicates by sales_channel.
 */
export function extractUniquePartners(orders: TGetCardapioWebOrderDetailsOutput[]): MappedCardapioWebPartner[] {
	const partnersMap = new Map<string, MappedCardapioWebPartner>();

	for (const order of orders) {
		const partner = mapCardapioWebPartner(order);
		if (partner && !partnersMap.has(partner.identificador)) {
			partnersMap.set(partner.identificador, partner);
		}
	}

	return Array.from(partnersMap.values());
}

/**
 * Maps CardapioWeb option group to our internal product add-on format.
 */
export function mapCardapioWebProductAddOn(
	option: TGetCardapioWebOrderDetailsOutput["items"][number]["options"][number],
): MappedCardapioWebProductAddOn {
	return {
		idExterno: option.option_group_id?.toString() ?? "",
		nome: option.option_group_name ?? "",
		// CardapioWeb doesn't provide min/max constraints in order data
		// These would need to be fetched from product catalog API if available
		minOpcoes: 0,
		maxOpcoes: option.option_group_total_selected_options ?? 1,
	};
}

/**
 * Maps CardapioWeb option to our internal product add-on option format.
 */
export function mapCardapioWebProductAddOnOption(
	option: TGetCardapioWebOrderDetailsOutput["items"][number]["options"][number],
): MappedCardapioWebProductAddOnOption {
	return {
		idExterno: option.option_id?.toString() ?? "",
		addOnIdExterno: option.option_group_id?.toString() ?? "",
		nome: option.name,
		codigo: option.external_code,
		precoDelta: option.unit_price,
		maxQtdePorItem: 99, // Not provided in order data
	};
}

/**
 * Extracts unique product add-ons from a list of order details.
 * Deduplicates by option_group_id.
 */
export function extractUniqueProductAddOns(orders: TGetCardapioWebOrderDetailsOutput[]): MappedCardapioWebProductAddOn[] {
	const addOnsMap = new Map<string, MappedCardapioWebProductAddOn>();

	for (const order of orders) {
		for (const item of order.items) {
			for (const option of item.options) {
				const key = option.option_group_id?.toString() ?? "";
				if (!key) continue;
				if (!addOnsMap.has(key)) {
					addOnsMap.set(key, mapCardapioWebProductAddOn(option));
				}
			}
		}
	}

	return Array.from(addOnsMap.values());
}

/**
 * Extracts unique product add-on options from a list of order details.
 * Deduplicates by option_id.
 */
export function extractUniqueProductAddOnOptions(orders: TGetCardapioWebOrderDetailsOutput[]): MappedCardapioWebProductAddOnOption[] {
	const optionsMap = new Map<string, MappedCardapioWebProductAddOnOption>();

	for (const order of orders) {
		for (const item of order.items) {
			for (const option of item.options) {
				const key = option.option_id?.toString() ?? "";
				if (!key) continue;
				if (!optionsMap.has(key)) {
					optionsMap.set(key, mapCardapioWebProductAddOnOption(option));
				}
			}
		}
	}

	return Array.from(optionsMap.values());
}

/**
 * Maps CardapioWeb item to our internal sale item format.
 */
export function mapCardapioWebSaleItem(item: TGetCardapioWebOrderDetailsOutput["items"][number]): MappedCardapioWebSaleItem {
	// Calculate discount from options if any have negative prices
	const optionsTotal = item.options.reduce((acc, opt) => acc + opt.unit_price * opt.quantity, 0);

	return {
		produtoIdExterno: item.item_id?.toString() ?? "N/A",
		quantidade: item.quantity,
		valorVendaUnitario: item.unit_price,
		valorVendaTotalBruto: item.unit_price * item.quantity + optionsTotal,
		valorTotalDesconto: 0, // Discounts are handled at order level
		valorVendaTotalLiquido: item.total_price,
		observacao: item.observation,
		options: item.options
			.filter((opt) => opt.option_group_id && opt.option_id)
			.map((opt) => ({
				addOnIdExterno: (opt.option_group_id as number).toString(),
				optionIdExterno: (opt.option_id as number).toString(),
				quantidade: opt.quantity,
				valorUnitario: opt.unit_price,
			})),
	};
}

/**
 * Maps a complete CardapioWeb order to our internal sale format.
 */
export function mapCardapioWebSale(order: TGetCardapioWebOrderDetailsOutput): MappedCardapioWebSale {
	// Calculate total discount from discounts array
	const totalDiscount = order.discounts.reduce((acc, d) => acc + d.total, 0);

	// Determine if the sale is valid (completed and paid)
	const isValidSale = order.status === "closed";
	const isCanceled = order.status === "canceled";

	// Map natureza based on status (SN01 = valid sale, like ONLINE-SOFTWARE)
	const natureza = isValidSale ? "SN01" : isCanceled ? "CANCELADO" : order.status.toUpperCase();

	const salesChannelMap = {
		portal: "Portal CardapioWeb",
		whatsapp_extension: "WhatsApp",
		ifood: "iFood",
		catalog: "Catálogo CardapioWeb",
		store_front_catalog: "Catálogo CardapioWeb",
	};
	const fulfillmentMethodMap = {
		delivery: "ENTREGA",
		takeout: "RETIRADA",
		onsite: "PRESENCIAL",
		closed_table: "COMANDA",
	};
	return {
		idExterno: order.id.toString(),
		displayId: order.display_id.toString(),
		valorTotal: order.total,
		custoTotal: 0, // Not provided by CardapioWeb
		taxaEntrega: order.delivery_fee,
		taxaServico: order.service_fee,
		taxaAdicional: order.additional_fee,
		descontoTotal: totalDiscount,
		natureza,
		tipo: order.order_type,
		entregaModalidade: fulfillmentMethodMap[order.order_type as keyof typeof fulfillmentMethodMap] ?? "NÃO DEFINIDO",
		timing: order.order_timing,
		salesChannel: salesChannelMap[order.sales_channel] ?? "NÃO DEFINIDO",
		documento: order.fiscal_document,
		observacao: order.observation,
		dataVenda: new Date(order.created_at),
		cliente: mapCardapioWebClient(order.customer),
		parceiro: mapCardapioWebPartner(order),
		itens: order.items.filter((item) => item.status !== "canceled").map(mapCardapioWebSaleItem),
		isValidSale,
		isCanceled,
	};
}

/**
 * Maps a list of CardapioWeb orders to our internal sale format.
 */
export function mapCardapioWebSales(orders: TGetCardapioWebOrderDetailsOutput[]): MappedCardapioWebSale[] {
	return orders.map(mapCardapioWebSale);
}

// -----------------------------------------------------------------------------
// EXTRACTION HELPERS FOR CRON JOB
// -----------------------------------------------------------------------------

export interface ExtractedCardapioWebData {
	sales: MappedCardapioWebSale[];
	products: MappedCardapioWebProduct[];
	partners: MappedCardapioWebPartner[];
	productAddOns: MappedCardapioWebProductAddOn[];
	productAddOnOptions: MappedCardapioWebProductAddOnOption[];
}

/**
 * Extracts all entities from a list of order details.
 * This is the main function used by the cron job to get all mapped data.
 */
export function extractAllCardapioWebData(orders: TGetCardapioWebOrderDetailsOutput[]): ExtractedCardapioWebData {
	return {
		sales: mapCardapioWebSales(orders),
		products: extractUniqueProducts(orders),
		partners: extractUniquePartners(orders),
		productAddOns: extractUniqueProductAddOns(orders),
		productAddOnOptions: extractUniqueProductAddOnOptions(orders),
	};
}
