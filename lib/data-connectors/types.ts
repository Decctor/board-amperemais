import type { TOrganizationIntegrationConfig } from "@/schemas/organizations";
import type { TOrganizationEntity } from "@/services/drizzle/schema";

export type TDataConnectorKind = NonNullable<TOrganizationEntity["integracaoTipo"]>;

export type TCanonicalDeliveryMode = "PRESENCIAL" | "RETIRADA" | "ENTREGA" | "COMANDA" | null;

export type TCanonicalSaleItemRewritePolicy = "INSERT_ONLY_FOR_NEW_SALES" | "REPLACE_ON_EVERY_SYNC";

export type TCanonicalClientResolutionStrategy = "EXTERNAL_ID_THEN_PHONE" | "NAME_THEN_PHONE";

export type TCanonicalImportWindow = {
	startDate: Date;
	endDate: Date;
};

export type TCanonicalConnectorPolicies = {
	saleItemRewritePolicy: TCanonicalSaleItemRewritePolicy;
	clientResolutionStrategy: TCanonicalClientResolutionStrategy;
};

export type TCanonicalClient = {
	externalId: string | null;
	name: string;
	phone: string;
	basePhone: string;
	cpfCnpj?: string | null;
	stateRegistration?: string | null;
	email?: string | null;
	location?: {
		cep?: string | null;
		state?: string | null;
		city?: string | null;
		neighborhood?: string | null;
		street?: string | null;
		number?: string | null;
		complement?: string | null;
		latitude?: string | null;
		longitude?: string | null;
	};
};

export type TCanonicalProduct = {
	externalId: string | null;
	code: string;
	description: string;
	unit: string;
	group: string;
	ncm: string;
	type: string;
};

export type TCanonicalSeller = {
	identifier: string;
	name: string;
};

export type TCanonicalPartner = {
	identifier: string;
	name: string;
	affiliateCode?: string | null;
	cpfCnpj?: string | null;
	clientLink?: {
		name: string;
		cpfCnpj?: string | null;
	};
};

export type TCanonicalProductAddOn = {
	externalId: string;
	name: string;
	minOptions: number;
	maxOptions: number;
};

export type TCanonicalProductAddOnOption = {
	externalId: string;
	addOnExternalId: string;
	name: string;
	code: string | null;
	priceDelta: number;
	maxQuantityPerItem: number;
};

export type TCanonicalSaleItemModifier = {
	addOnExternalId: string;
	optionExternalId: string;
	name?: string;
	quantity: number;
	unitValue: number;
};

export type TCanonicalSaleItem = {
	productExternalId: string | null;
	productCode: string;
	quantity: number;
	unitSaleValue: number;
	unitCostValue: number;
	grossSaleValue: number;
	discountValue: number;
	netSaleValue: number;
	totalCostValue: number;
	notes?: string | null;
	metadata?: Record<string, unknown>;
	modifiers?: TCanonicalSaleItemModifier[];
};

export type TCanonicalSale = {
	sourceSaleId: string;
	displayId?: string | null;
	totalValue: number;
	totalCost: number;
	totalDiscount: number;
	totalSurcharge: number;
	sellerName: string;
	channel: string | null;
	deliveryMode: TCanonicalDeliveryMode;
	partnerIdentifier: string | null;
	key: string;
	document: string;
	model: string;
	movement: string;
	nature: string;
	series: string;
	statusText: string;
	type: string;
	notes?: string | null;
	occurredAt: Date;
	client: TCanonicalClient | null;
	seller: TCanonicalSeller | null;
	partner: TCanonicalPartner | null;
	items: TCanonicalSaleItem[];
	isValidSale: boolean;
	isCanceled: boolean;
	raw?: unknown;
};

export type TCanonicalImportBatch = {
	source: TDataConnectorKind;
	organizationId: string;
	window: TCanonicalImportWindow;
	policies: TCanonicalConnectorPolicies;
	sales: TCanonicalSale[];
	products: TCanonicalProduct[];
	sellers: TCanonicalSeller[];
	partners: TCanonicalPartner[];
	productAddOns: TCanonicalProductAddOn[];
	productAddOnOptions: TCanonicalProductAddOnOption[];
	raw?: unknown;
};

export type TDataConnectorFetchInput<TConfig extends TOrganizationIntegrationConfig = TOrganizationIntegrationConfig> = {
	organizationId: string;
	config: TConfig;
	window: TCanonicalImportWindow;
};

export type TDataConnector<TConfig extends TOrganizationIntegrationConfig = TOrganizationIntegrationConfig> = {
	kind: TDataConnectorKind;
	fetchImportBatch: (input: TDataConnectorFetchInput<TConfig>) => Promise<TCanonicalImportBatch>;
};
