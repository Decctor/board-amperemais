import { formatPhoneAsBase, formatToCEP, formatToCPForCNPJ, formatToPhone } from "@/lib/formatting";
import dayjs from "dayjs";
import type {
	TCanonicalClient,
	TCanonicalConnectorBatch,
	TCanonicalImportWindow,
	TCanonicalProduct,
	TCanonicalSale,
	TCanonicalSaleItem,
} from "../types";
import type { TErpFlexBilling, TErpFlexBillingItem, TErpFlexClient, TErpFlexProduct } from "./types";

function toStringId(value: string | number | null | undefined) {
	if (value === null || value === undefined || value === "") return null;
	return String(value);
}

/** A V2 trafega datas como `dd/mm/aaaa`; consultas podem devolver ISO. Aceita os dois. */
function parseBillingDate(billing: TErpFlexBilling) {
	const rawDate = billing.data_emissao;
	const brazilianDateMatch = rawDate?.match(/^(\d{2})[/-](\d{2})[/-](\d{4})/);
	const parsedDate = brazilianDateMatch
		? dayjs(`${brazilianDateMatch[3]}-${brazilianDateMatch[2]}-${brazilianDateMatch[1]}`)
		: rawDate
			? dayjs(rawDate)
			: null;
	if (!parsedDate?.isValid()) {
		throw new Error(
			`Data inválida recebida do ERPFlex. faturamento="${toStringId(billing.faturamento_id) ?? "N/A"}" data="${rawDate ?? "N/A"}"`,
		);
	}
	return parsedDate.toDate();
}

export function mapErpFlexClientToCanonicalClient({
	client,
	billing,
}: {
	client: TErpFlexClient | null | undefined;
	billing: TErpFlexBilling;
}): TCanonicalClient | null {
	const externalId = toStringId(client?.id) ?? toStringId(billing.cliente_id);
	const rawPhone = client?.celular || client?.telefone || client?.fone || "";
	const basePhone = formatPhoneAsBase(rawPhone);
	const name = client?.nome || client?.razao_social || client?.fantasia || billing.nome_cliente || "";

	if (!externalId && !basePhone && !name) return null;

	return {
		externalId,
		name: name || (basePhone ? `CLIENTE ERPFLEX ${basePhone}` : "CLIENTE ERPFLEX"),
		phone: formatToPhone(rawPhone),
		basePhone,
		cpfCnpj: formatToCPForCNPJ(client?.cpf_cnpj ?? ""),
		email: client?.email,
		location: client
			? {
					cep: client.cep ? formatToCEP(client.cep) : null,
					state: client.estado || client.uf,
					city: client.cidade,
					neighborhood: client.bairro,
					street: client.endereco,
					number: client.numero,
					complement: client.complemento,
				}
			: undefined,
	};
}

function getItemProductCode(item: TErpFlexBillingItem) {
	return toStringId(item.produto_id) || item.EAN || "PRODUTO-ERPFLEX";
}

export function mapErpFlexProductToCanonicalProduct(product: TErpFlexProduct): TCanonicalProduct {
	const code = product.codigo || toStringId(product.id) || "PRODUTO-ERPFLEX";
	return {
		externalId: toStringId(product.id),
		code,
		description: product.nome || product.descricao || code,
		unit: product.unidade || "UN",
		group: product.grupo || "ERPFlex",
		ncm: product.ncm || "N/A",
		type: product.tipo || "PRODUTO",
	};
}

export function mapErpFlexBillingItemToCanonicalSaleItem(item: TErpFlexBillingItem): TCanonicalSaleItem {
	const quantity = item.quantidade || 1;
	const netSaleValue = item.valor_item || item.preco_unitario * quantity;
	const unitSaleValue = item.preco_unitario || (quantity > 0 ? netSaleValue / quantity : netSaleValue);
	const grossSaleValue = unitSaleValue * quantity;
	const discountValue = item.valor_desconto || Math.max(grossSaleValue - netSaleValue, 0);

	return {
		productExternalId: toStringId(item.produto_id),
		productCode: getItemProductCode(item),
		quantity,
		unitSaleValue,
		unitCostValue: 0,
		grossSaleValue,
		discountValue,
		netSaleValue,
		totalCostValue: 0,
		metadata: {
			itemId: toStringId(item.item_id),
			description: item.desc_produto,
			variantKey: item.variante_chave,
			ean: item.EAN,
			cfop: item.cfop,
		},
	};
}

export function mapErpFlexBillingToCanonicalSale({
	billing,
	client,
	isCanceled,
}: {
	billing: TErpFlexBilling;
	client: TErpFlexClient | null | undefined;
	isCanceled: boolean;
}): TCanonicalSale {
	const sourceSaleId = toStringId(billing.faturamento_id);
	if (!sourceSaleId) throw new Error("[ERP_FLEX_MAPPER] Faturamento recebido sem ID.");

	const items = billing.itens.map(mapErpFlexBillingItemToCanonicalSaleItem);
	const itemsNetTotal = items.reduce((acc, item) => acc + item.netSaleValue, 0);
	const totalDiscount = items.reduce((acc, item) => acc + item.discountValue, 0);
	const validSale = !isCanceled;

	return {
		sourceSaleId,
		displayId: billing.documento || billing.nr_nfe,
		totalValue: billing.valor_nf || itemsNetTotal,
		totalCost: 0,
		totalDiscount,
		totalSurcharge: 0,
		sellerName: "ERPFLEX",
		channel: "ERPFlex",
		deliveryMode: null,
		partnerIdentifier: null,
		key: sourceSaleId,
		document: billing.documento || sourceSaleId,
		model: billing.modelo_nf || "ERP-FLEX",
		movement: "VENDA",
		nature: validSale ? "SN01" : "SN99",
		series: billing.serie_nf || "N/A",
		statusText: isCanceled ? "CANCELADA" : "FATURADA",
		type: "VENDA",
		notes: billing.inf_adicional,
		occurredAt: parseBillingDate(billing),
		client: mapErpFlexClientToCanonicalClient({ client, billing }),
		seller: null,
		partner: null,
		items,
		isValidSale: validSale,
		isCanceled,
		raw: billing,
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

export function toCanonicalErpFlexImportBatch({
	organizationId,
	window,
	billings,
	canceledBillingIds,
	clientsById,
	products,
}: {
	organizationId: string;
	window: TCanonicalImportWindow;
	billings: TErpFlexBilling[];
	canceledBillingIds: Set<string>;
	clientsById: Map<string, TErpFlexClient>;
	products: TErpFlexProduct[];
}): TCanonicalConnectorBatch {
	const canonicalSales = billings.map((billing) =>
		mapErpFlexBillingToCanonicalSale({
			billing,
			client: billing.cliente_id ? clientsById.get(String(billing.cliente_id)) : null,
			isCanceled: canceledBillingIds.has(String(billing.faturamento_id)),
		}),
	);
	const itemProducts = billings.flatMap((billing) =>
		billing.itens.map<TCanonicalProduct>((item) => ({
			externalId: toStringId(item.produto_id),
			code: getItemProductCode(item),
			description: item.desc_produto || getItemProductCode(item),
			unit: "UN",
			group: "ERPFlex",
			ncm: "N/A",
			type: "PRODUTO",
		})),
	);

	return {
		source: "ERP-FLEX",
		organizationId,
		window,
		policies: {
			saleItemRewritePolicy: "REPLACE_ON_EVERY_SYNC",
			clientResolutionStrategy: "EXTERNAL_ID_THEN_PHONE",
		},
		sales: canonicalSales,
		products: uniqueBy([...products.map(mapErpFlexProductToCanonicalProduct), ...itemProducts], (product) => product.code),
		sellers: [],
		partners: [],
		productAddOns: [],
		productAddOnOptions: [],
		raw: { billings },
	};
}
