import type { TMetaAdsIntegrationConfig } from "@/schemas/integrations";

export const META_GRAPH_API_VERSION = "v25.0";
// ads_read: ler insights/biblioteca. ads_management + business_management: CAPI-write e Custom
// Audiences (Fases 2/3) — pedidos já na conexão inicial para não exigir reconsent.
export const META_ADS_SCOPES = ["ads_read", "ads_management", "business_management"] as const;

export type TMetaAdsActionStat = {
	action_type?: string;
	value?: string;
};

export type TMetaAdsPurchaseRoasStat = {
	action_type?: string;
	value?: string;
};

export type TMetaAdsInsightRow = {
	ad_id?: string;
	ad_name?: string;
	account_id?: string;
	account_name?: string;
	campaign_id?: string;
	campaign_name?: string;
	date_start?: string;
	date_stop?: string;
	impressions?: string;
	reach?: string;
	clicks?: string;
	inline_link_clicks?: string;
	spend?: string;
	cpc?: string;
	cpm?: string;
	ctr?: string;
	frequency?: string;
	actions?: TMetaAdsActionStat[];
	action_values?: TMetaAdsActionStat[];
	purchase_roas?: TMetaAdsPurchaseRoasStat[];
};

export type TNormalizedMetaAdsMetrics = {
	impressions: number;
	reach: number;
	clicks: number;
	inlineLinkClicks: number;
	spend: number;
	cpc: number | null;
	cpm: number | null;
	ctr: number | null;
	frequency: number | null;
	leads: number;
	purchases: number;
	purchaseValue: number;
	purchaseRoas: number | null;
};

export type TMetaAdsAccountResults = TNormalizedMetaAdsMetrics & {
	integrationId: string;
	adAccountId: string;
	adAccountName: string;
	accountId?: string;
	accountName?: string;
	dateStart?: string;
	dateStop?: string;
	raw: Pick<TMetaAdsInsightRow, "actions" | "action_values" | "purchase_roas">;
};

export type TMetaAdsCampaignResults = TNormalizedMetaAdsMetrics & {
	integrationId: string;
	adAccountId: string;
	adAccountName: string;
	campaignId?: string;
	campaignName?: string;
	dateStart?: string;
	dateStop?: string;
	raw: Pick<TMetaAdsInsightRow, "actions" | "action_values" | "purchase_roas">;
};

export type TMetaAdsAdLevelInsightsRow = TNormalizedMetaAdsMetrics & {
	integrationId: string;
	adAccountId: string;
	adAccountName: string;
	adId: string;
	adName?: string;
	dateStart?: string;
	dateStop?: string;
	raw: Pick<TMetaAdsInsightRow, "actions" | "action_values" | "purchase_roas">;
};

export type TMetaAdsIntegrationConfigWithToken = TMetaAdsIntegrationConfig;

export type TMetaAdsLibraryStatus = "all" | "active" | "paused";

export type TMetaAdsLibraryCreative = {
	id?: string;
	name?: string;
	title?: string;
	body?: string;
	object_type?: string;
	thumbnail_url?: string;
	image_url?: string;
	video_id?: string;
	call_to_action_type?: string;
	object_url?: string;
	link_url?: string;
	instagram_permalink_url?: string;
	effective_object_story_id?: string;
	asset_feed_spec?: unknown;
};

export type TMetaAdsLibraryRow = {
	id: string;
	name?: string;
	status?: string;
	effective_status?: string;
	configured_status?: string;
	created_time?: string;
	updated_time?: string;
	campaign?: {
		id?: string;
		name?: string;
	};
	adset?: {
		id?: string;
		name?: string;
	};
	creative?: TMetaAdsLibraryCreative;
};

export type TMetaAdsLibraryAd = {
	id: string;
	name: string;
	status: string;
	effectiveStatus: string;
	configuredStatus?: string;
	createdTime?: string;
	updatedTime?: string;
	campaignName?: string;
	adsetName?: string;
	creativeId?: string;
	creativeName?: string;
	title?: string;
	body?: string;
	objectType?: string;
	thumbnailUrl?: string;
	imageUrl?: string;
	videoId?: string;
	callToActionType?: string;
	destinationUrl?: string;
	instagramPermalinkUrl?: string;
	effectiveObjectStoryId?: string;
};

export type TMetaAdsAdDailyMetrics = { date: string } & TNormalizedMetaAdsMetrics;

/** Uma linha por dia (`time_increment=1` na API de insights da conta). */
export type TMetaAdsAccountDailySpendPoint = {
	date: string;
	spend: number;
};

export type TMetaAdsAdDetailResult = {
	adId: string;
	summary: TNormalizedMetaAdsMetrics;
	daily: TMetaAdsAdDailyMetrics[];
};
