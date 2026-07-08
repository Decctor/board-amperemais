import { metaGraphGet } from "./client";
import type { TMetaAdsIntegrationConfigWithToken, TMetaAdsLibraryAd, TMetaAdsLibraryRow, TMetaAdsLibraryStatus } from "./types";

type MetaAdsLibraryResponse = {
	data?: TMetaAdsLibraryRow[];
};

const LIBRARY_FIELDS = [
	"id",
	"name",
	"status",
	"effective_status",
	"configured_status",
	"created_time",
	"updated_time",
	"campaign{id,name}",
	"adset{id,name}",
	"creative{id,name,title,body,object_type,thumbnail_url,image_url,video_id,call_to_action_type,object_url,link_url,instagram_permalink_url,effective_object_story_id,asset_feed_spec}",
] as const;

const STATUS_FILTERS: Record<Exclude<TMetaAdsLibraryStatus, "all">, string[]> = {
	active: ["ACTIVE"],
	paused: ["PAUSED", "CAMPAIGN_PAUSED", "ADSET_PAUSED"],
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function readAssetText(assetFeedSpec: unknown, key: string) {
	if (!isRecord(assetFeedSpec)) return undefined;
	const value = assetFeedSpec[key];
	if (!Array.isArray(value)) return undefined;
	const first = value.find(isRecord);
	if (!first) return undefined;
	const text = first.text ?? first.name;
	return typeof text === "string" ? text : undefined;
}

function readAssetImage(assetFeedSpec: unknown) {
	if (!isRecord(assetFeedSpec)) return undefined;
	const images = assetFeedSpec.images;
	if (!Array.isArray(images)) return undefined;
	const first = images.find(isRecord);
	if (!first) return undefined;
	const url = first.url ?? first.image_url;
	return typeof url === "string" ? url : undefined;
}

function normalizeLibraryAd(row: TMetaAdsLibraryRow): TMetaAdsLibraryAd {
	const creative = row.creative;
	const assetFeedSpec = creative?.asset_feed_spec;
	const title = creative?.title ?? readAssetText(assetFeedSpec, "titles");
	const body = creative?.body ?? readAssetText(assetFeedSpec, "bodies");
	const imageUrl = creative?.image_url ?? readAssetImage(assetFeedSpec);

	return {
		id: row.id,
		name: row.name ?? creative?.name ?? "Anúncio",
		status: row.status ?? "UNKNOWN",
		effectiveStatus: row.effective_status ?? "UNKNOWN",
		configuredStatus: row.configured_status,
		createdTime: row.created_time,
		updatedTime: row.updated_time,
		campaignName: row.campaign?.name,
		adsetName: row.adset?.name,
		creativeId: creative?.id,
		creativeName: creative?.name,
		title,
		body,
		objectType: creative?.object_type,
		thumbnailUrl: creative?.thumbnail_url,
		imageUrl,
		videoId: creative?.video_id,
		callToActionType: creative?.call_to_action_type,
		destinationUrl: creative?.object_url ?? creative?.link_url,
		instagramPermalinkUrl: creative?.instagram_permalink_url,
		effectiveObjectStoryId: creative?.effective_object_story_id,
	};
}

export async function fetchMetaAdsLibrary(params: {
	config: TMetaAdsIntegrationConfigWithToken;
	status: TMetaAdsLibraryStatus;
	limit?: number;
}): Promise<TMetaAdsLibraryAd[]> {
	const requestParams: Record<string, string> = {
		fields: LIBRARY_FIELDS.join(","),
		limit: String(params.limit ?? 100),
	};

	if (params.status !== "all") {
		requestParams.effective_status = JSON.stringify(STATUS_FILTERS[params.status]);
	}

	const response = await metaGraphGet<MetaAdsLibraryResponse>(`/${params.config.adAccountId}/ads`, requestParams, params.config.accessToken);
	return (response.data ?? []).map(normalizeLibraryAd);
}
