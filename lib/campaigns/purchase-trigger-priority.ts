import type { TCampaignTriggerTypeEnum } from "@/schemas/enums";

type TExclusivePurchaseTriggerCampaign = {
	id: string;
	gatilhoTipo: TCampaignTriggerTypeEnum;
	gatilhoNovaCompraValorMinimo: number | null;
	gatilhoQuantidadeTotalCompras: number | null;
};

type TResolveExclusivePurchaseTriggerCampaignsParams<TCampaign extends TExclusivePurchaseTriggerCampaign> = {
	campaigns: TCampaign[];
	audiencesByCampaignId: Map<string, Set<string>>;
	clientId: string | null;
	isFirstPurchase: boolean;
	saleValue: number;
	totalPurchaseCount: number | null;
	previousTotalPurchaseCount: number | null;
	allowNewPurchaseOnFirstPurchase?: boolean;
};

export function campaignAudienceIncludesClient(audiencesByCampaignId: Map<string, Set<string>>, campaignId: string, clientId: string | null) {
	if (!clientId) return false;
	return audiencesByCampaignId.get(campaignId)?.has(clientId) ?? false;
}

export function resolveExclusivePurchaseTriggerCampaigns<TCampaign extends TExclusivePurchaseTriggerCampaign>({
	campaigns,
	audiencesByCampaignId,
	clientId,
	isFirstPurchase,
	saleValue,
	totalPurchaseCount,
	previousTotalPurchaseCount,
	allowNewPurchaseOnFirstPurchase = false,
}: TResolveExclusivePurchaseTriggerCampaignsParams<TCampaign>) {
	if (!clientId) return [];

	const campaignAppliesToClient = (campaign: TCampaign) => campaignAudienceIncludesClient(audiencesByCampaignId, campaign.id, clientId);

	const firstPurchaseCampaigns = campaigns.filter(
		(campaign) => campaign.gatilhoTipo === "PRIMEIRA-COMPRA" && isFirstPurchase && campaignAppliesToClient(campaign),
	);
	if (firstPurchaseCampaigns.length > 0) return firstPurchaseCampaigns;

	// Crossing semantics: the trigger fires when this sale makes the client cross the threshold,
	// so totals that jump past the exact value (e.g. batch imports) still fire exactly once.
	const totalPurchaseCountCampaigns = campaigns.filter(
		(campaign) =>
			campaign.gatilhoTipo === "QUANTIDADE-TOTAL-COMPRAS" &&
			campaign.gatilhoQuantidadeTotalCompras != null &&
			totalPurchaseCount != null &&
			totalPurchaseCount >= campaign.gatilhoQuantidadeTotalCompras &&
			(previousTotalPurchaseCount ?? 0) < campaign.gatilhoQuantidadeTotalCompras &&
			campaignAppliesToClient(campaign),
	);
	if (totalPurchaseCountCampaigns.length > 0) return totalPurchaseCountCampaigns;

	const newPurchaseCampaigns = campaigns.filter((campaign) => {
		if (campaign.gatilhoTipo !== "NOVA-COMPRA") return false;
		if (isFirstPurchase && !allowNewPurchaseOnFirstPurchase) return false;
		if (!campaignAppliesToClient(campaign)) return false;

		return campaign.gatilhoNovaCompraValorMinimo == null || saleValue >= campaign.gatilhoNovaCompraValorMinimo;
	});

	return newPurchaseCampaigns;
}
