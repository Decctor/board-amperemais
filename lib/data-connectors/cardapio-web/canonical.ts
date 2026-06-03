import { fetchCardapioWebOrdersWithDetails } from ".";
import type {
	TCanonicalClient,
	TCanonicalDeliveryMode,
	TCanonicalImportBatch,
	TCanonicalImportWindow,
	TCanonicalPartner,
	TCanonicalProduct,
	TCanonicalProductAddOn,
	TCanonicalProductAddOnOption,
	TCanonicalSale,
	TCanonicalSaleItem,
} from "../types";
import { extractAllCardapioWebData, type MappedCardapioWebClient, type MappedCardapioWebPartner, type MappedCardapioWebSale } from "./mappers";
import type { TCardapioWebConfig, TGetCardapioWebOrderDetailsOutput } from "./types";

function mapDeliveryMode(value: string): TCanonicalDeliveryMode {
	if (value === "PRESENCIAL" || value === "RETIRADA" || value === "ENTREGA" || value === "COMANDA") return value;
	return null;
}

function toCanonicalClient(client: MappedCardapioWebClient | null): TCanonicalClient | null {
	if (!client) return null;

	return {
		externalId: client.idExterno,
		name: client.nome,
		phone: client.telefone,
		basePhone: client.telefoneBase,
		location: {
			cep: client.localizacaoCep,
			state: client.localizacaoEstado,
			city: client.localizacaoCidade,
			neighborhood: client.localizacaoBairro,
			street: client.localizacaoLogradouro,
			number: client.localizacaoNumero,
			latitude: client.localizacaoLatitude,
			longitude: client.localizacaoLongitude,
		},
	};
}

function toCanonicalPartner(partner: MappedCardapioWebPartner | null): TCanonicalPartner | null {
	if (!partner) return null;

	return {
		identifier: partner.identificador,
		name: partner.nome,
		affiliateCode: partner.identificador,
	};
}

function toCanonicalSaleItem(item: MappedCardapioWebSale["itens"][number]): TCanonicalSaleItem {
	return {
		productExternalId: item.produtoIdExterno,
		productCode: item.produtoCodigo,
		quantity: item.quantidade,
		unitSaleValue: item.valorVendaUnitario,
		unitCostValue: 0,
		grossSaleValue: item.valorVendaTotalBruto,
		discountValue: item.valorTotalDesconto,
		netSaleValue: item.valorVendaTotalLiquido,
		totalCostValue: 0,
		notes: item.observacao,
		modifiers: item.options.map((option) => ({
			addOnExternalId: option.addOnIdExterno,
			optionExternalId: option.optionIdExterno,
			quantity: option.quantidade,
			unitValue: option.valorUnitario,
		})),
	};
}

function toCanonicalSale(sale: MappedCardapioWebSale): TCanonicalSale {
	const totalSurcharge = sale.taxaEntrega + sale.taxaServico + sale.taxaAdicional;

	return {
		sourceSaleId: sale.idExterno,
		displayId: sale.displayId,
		totalValue: sale.valorTotal,
		totalCost: sale.custoTotal,
		totalDiscount: sale.descontoTotal,
		totalSurcharge,
		sellerName: "CARDAPIO WEB",
		channel: sale.salesChannel,
		deliveryMode: mapDeliveryMode(sale.entregaModalidade),
		partnerIdentifier: sale.parceiro?.identificador ?? null,
		key: "N/A",
		document: sale.documento ?? "N/A",
		model: "CARDAPIO-WEB",
		movement: sale.timing,
		nature: sale.natureza,
		series: "N/A",
		statusText: sale.natureza,
		type: sale.tipo,
		notes: sale.observacao,
		occurredAt: sale.dataVenda,
		client: toCanonicalClient(sale.cliente),
		seller: null,
		partner: toCanonicalPartner(sale.parceiro),
		items: sale.itens.map(toCanonicalSaleItem),
		isValidSale: sale.isValidSale,
		isCanceled: sale.isCanceled,
	};
}

export function toCanonicalCardapioWebImportBatch({
	organizationId,
	window,
	orders,
}: {
	organizationId: string;
	window: TCanonicalImportWindow;
	orders: TGetCardapioWebOrderDetailsOutput[];
}): TCanonicalImportBatch {
	const extracted = extractAllCardapioWebData(orders);

	return {
		source: "CARDAPIO-WEB",
		organizationId,
		window,
		policies: {
			saleItemRewritePolicy: "INSERT_ONLY_FOR_NEW_SALES",
			clientResolutionStrategy: "EXTERNAL_ID_THEN_PHONE",
		},
		sales: extracted.sales.map(toCanonicalSale),
		products: extracted.products.map<TCanonicalProduct>((product) => ({
			externalId: product.idExterno,
			code: product.codigo,
			description: product.nome,
			unit: product.unidade,
			group: product.grupo,
			ncm: product.ncm,
			type: product.tipo,
		})),
		sellers: [],
		partners: extracted.partners.map((partner) => ({
			identifier: partner.identificador,
			name: partner.nome,
			affiliateCode: partner.identificador,
		})),
		productAddOns: extracted.productAddOns.map<TCanonicalProductAddOn>((addOn) => ({
			externalId: addOn.idExterno,
			name: addOn.nome,
			minOptions: addOn.minOpcoes,
			maxOptions: addOn.maxOpcoes,
		})),
		productAddOnOptions: extracted.productAddOnOptions.map<TCanonicalProductAddOnOption>((option) => ({
			externalId: option.idExterno,
			addOnExternalId: option.addOnIdExterno,
			name: option.nome,
			code: option.codigo,
			priceDelta: option.precoDelta,
			maxQuantityPerItem: option.maxQtdePorItem,
		})),
		raw: orders,
	};
}

export async function fetchCardapioWebImportBatch({
	organizationId,
	config,
	window,
}: {
	organizationId: string;
	config: TCardapioWebConfig;
	window: TCanonicalImportWindow;
}) {
	const orders = await fetchCardapioWebOrdersWithDetails(config, window.startDate.toISOString(), window.endDate.toISOString());
	return toCanonicalCardapioWebImportBatch({ organizationId, window, orders });
}
