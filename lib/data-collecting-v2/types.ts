import type { TCanonicalImportBatch, TCanonicalSale } from "@/lib/data-connectors";
import type { TCampaignFilters } from "@/schemas/campaigns";
import type { DBTransaction } from "@/services/drizzle";
import type {
	TCampaignEntity,
	TCampaignSegmentationEntity,
	TMessageTemplate,
	TWhatsappConnection,
	TWhatsappConnectionPhone,
} from "@/services/drizzle/schema";

export type TDataCollectingV2Executor = DBTransaction;

export type TDataCollectingV2EffectsOptions = {
	processCashback: boolean;
	processCampaigns: boolean;
	processConversionAttribution: boolean;
};

export type TCampaignWithAudienceRelations = TCampaignEntity & {
	segmentacoes: TCampaignSegmentationEntity[];
	filtros: TCampaignFilters | null;
	whatsappTemplate?: TMessageTemplate | null;
	whatsappConexaoTelefone?: (TWhatsappConnectionPhone & { conexao?: Pick<TWhatsappConnection, "token" | "gatewaySessaoId"> | null }) | null;
};

export type TResolvedClientForImport = {
	id: string;
	name: string;
	basePhone: string;
	rfmTitle: string | null;
	metadataTotalPurchases: number;
	metadataTotalPurchaseValue: number;
	isNew: boolean;
};

export type TResolvedVariantForImport = {
	produtoId: string;
	produtoVarianteId: string;
	// Snapshot dos eixos (Cor: Preto, Tamanho: G) para gravar em sale_items.metadados.
	opcoes: Array<{ eixo: string; valor: string }>;
};

export type TResolvedAuxiliaryEntities = {
	clientsByExternalId: Map<string, TResolvedClientForImport>;
	clientsByName: Map<string, TResolvedClientForImport>;
	clientsByBasePhone: Map<string, TResolvedClientForImport>;
	productsByCode: Map<string, string>;
	variantsByCode: Map<string, TResolvedVariantForImport>;
	sellersByIdentifier: Map<string, string>;
	partnersByIdentifier: Map<string, { id: string; clientId: string | null }>;
	productAddOnsByExternalId: Map<string, string>;
	productAddOnOptionsByExternalId: Map<string, string>;
	createdClientsCount: number;
	createdProductsCount: number;
	createdSellersCount: number;
	createdPartnersCount: number;
};

export type TPersistedSaleForEffects = {
	id: string;
	sourceSaleId: string;
	clientId: string | null;
	partnerClientId: string | null;
	sale: TCanonicalSale;
	isNewSale: boolean;
	isNewClient: boolean;
	isFirstPurchase: boolean;
	previouslyValid: boolean;
	nowCanceled: boolean;
	newTotalPurchaseCount: number | null;
	newTotalPurchaseValue: number | null;
};

export type TDataCollectingV2RunError = {
	organizationId: string;
	integrationType: string | null;
	message: string;
};

export type TDataCollectingV2RawBatch = {
	organizationId: string;
	source: TCanonicalImportBatch["source"];
	window: TCanonicalImportBatch["window"];
	raw: unknown;
};

export type TDataCollectingV2RunSummary = {
	organizationId: string;
	source: TCanonicalImportBatch["source"];
	importedSalesCount: number;
	createdSalesCount: number;
	updatedSalesCount: number;
	createdClientsCount: number;
	createdProductsCount: number;
	createdSellersCount: number;
	createdPartnersCount: number;
	resolvedCampaignAudiencesCount: number;
	createdInteractionsCount: number;
	immediateInteractionsCount: number;
	cashbackTransactionsCount: number;
	cashbackAccumulatedValue: number;
	firstPurchaseInteractionsCount: number;
	cashbackAccumulationInteractionsCount: number;
};
