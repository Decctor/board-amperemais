import { generateCashbackForCampaign } from "@/lib/cashback/generate-campaign-cashback";
import { generateCouponGrantForCampaign } from "@/lib/coupons/generate-campaign-coupon";
import type { TInteractionContextMetadados } from "@/lib/message-templates";
import { formatDateAsLocale } from "@/lib/formatting";
import type { TCashbackProgramAccumulationTypeEnum, TCashbackProgramTerminologyEnum, TTimeDurationUnitsEnum } from "@/schemas/enums";
import type { DBTransaction } from "@/services/drizzle";

type TCampaignCashbackGenerationConfig = {
	id: string;
	cashbackGeracaoAtivo: boolean;
	cashbackGeracaoTipo: TCashbackProgramAccumulationTypeEnum | null;
	cashbackGeracaoValor: number | null;
	cashbackGeracaoExpiracaoMedida: TTimeDurationUnitsEnum | null;
	cashbackGeracaoExpiracaoValor: number | null;
	// Geração de cupom (opcional para compatibilidade com chamadores que selecionam colunas específicas)
	cupomGeracaoAtivo?: boolean | null;
	cupomGeracaoCupomId?: string | null;
	cupomGeracaoExpiracaoMedida?: TTimeDurationUnitsEnum | null;
	cupomGeracaoExpiracaoValor?: number | null;
};

type TBuildBasePurchaseInteractionMetadataParams = {
	terminologia: TCashbackProgramTerminologyEnum;
	saleValue: number;
	transactionAccumulatedCashback: number;
	availableBalance: number;
	accumulatedTotal: number;
	redeemedTotal?: number;
	sellerName?: string;
	totalPurchaseCount?: number;
	totalPurchaseValue?: number;
};

type TBuildBaseCashbackInteractionMetadataParams = {
	terminologia: TCashbackProgramTerminologyEnum;
	availableBalance?: number;
	accumulatedTotal?: number;
	redeemedTotal?: number;
};

export function buildBaseCashbackInteractionMetadata({
	terminologia,
	availableBalance = 0,
	accumulatedTotal = 0,
	redeemedTotal = 0,
}: TBuildBaseCashbackInteractionMetadataParams): TInteractionContextMetadados {
	return {
		terminologia,
		cashbackSaldoDisponivel: availableBalance,
		cashbackTotalAcumuladoVida: accumulatedTotal,
		cashbackTotalResgatadoVida: redeemedTotal,
	};
}

export function buildBasePurchaseInteractionMetadata({
	terminologia,
	saleValue,
	transactionAccumulatedCashback,
	availableBalance,
	accumulatedTotal,
	redeemedTotal,
	sellerName,
	totalPurchaseCount,
	totalPurchaseValue,
}: TBuildBasePurchaseInteractionMetadataParams): TInteractionContextMetadados {
	return {
		terminologia,
		compraValor: saleValue,
		compraCashbackAcumulado: transactionAccumulatedCashback,
		compraCashbackNovoSaldo: availableBalance,
		compraVendedorNome: sellerName,
		compraQuantidadeTotal: totalPurchaseCount,
		compraValorTotalAcumulado: totalPurchaseValue,
		cashbackSaldoDisponivel: availableBalance,
		cashbackTotalAcumuladoVida: accumulatedTotal,
		cashbackTotalResgatadoVida: redeemedTotal,
	};
}

export type TApplyCampaignBonusResult = {
	metadata: TInteractionContextMetadados;
	bonusAmount: number | null;
	runningAvailableBalance: number;
	runningAccumulatedTotal: number;
};

export async function applyCampaignBonusToInteractionMetadata({
	tx,
	baseMetadata,
	campaign,
	organizationId,
	clientId,
	saleId,
	saleValue,
	interactionId,
	enabled = true,
}: {
	tx: DBTransaction;
	baseMetadata: TInteractionContextMetadados;
	campaign: TCampaignCashbackGenerationConfig;
	organizationId: string;
	clientId: string;
	saleId: string | null;
	saleValue: number | null;
	interactionId?: string | null; // ID pré-gerado da interação que concede o bônus; gravado em metadados.interacaoId da transação para permitir estorno em bloqueio de envio
	enabled?: boolean;
}): Promise<TApplyCampaignBonusResult> {
	const runningAvailableBalance = baseMetadata.cashbackSaldoDisponivel ?? baseMetadata.compraCashbackNovoSaldo ?? 0;
	const runningAccumulatedTotal = baseMetadata.cashbackTotalAcumuladoVida ?? 0;

	// Geração de cupom (efeito colateral independente do bônus de cashback)
	let couponMetadata: Pick<TInteractionContextMetadados, "cupomCodigo" | "cupomTitulo" | "cupomExpiracaoData"> = {};
	if (enabled && campaign.cupomGeracaoAtivo && campaign.cupomGeracaoCupomId) {
		const couponGrantResult = await generateCouponGrantForCampaign({
			tx,
			organizationId,
			clientId,
			campaignId: campaign.id,
			couponId: campaign.cupomGeracaoCupomId,
			expirationMeasure: campaign.cupomGeracaoExpiracaoMedida ?? null,
			expirationValue: campaign.cupomGeracaoExpiracaoValor ?? null,
		});
		if (couponGrantResult) {
			couponMetadata = {
				cupomCodigo: couponGrantResult.couponCode,
				cupomTitulo: couponGrantResult.couponTitle,
				cupomExpiracaoData: (couponGrantResult.expirationDate ? formatDateAsLocale(couponGrantResult.expirationDate) : undefined) ?? undefined,
			};
		}
	}

	if (!enabled || !campaign.cashbackGeracaoAtivo || !campaign.cashbackGeracaoTipo || !campaign.cashbackGeracaoValor) {
		return {
			metadata: { ...baseMetadata, ...couponMetadata },
			bonusAmount: null,
			runningAvailableBalance,
			runningAccumulatedTotal,
		};
	}

	const result = await generateCashbackForCampaign({
		tx,
		organizationId,
		clientId,
		campaignId: campaign.id,
		cashbackType: campaign.cashbackGeracaoTipo,
		cashbackValue: campaign.cashbackGeracaoValor,
		saleId,
		saleValue,
		expirationMeasure: campaign.cashbackGeracaoExpiracaoMedida,
		expirationValue: campaign.cashbackGeracaoExpiracaoValor,
		interactionId,
	});

	if (!result) {
		return {
			metadata: { ...baseMetadata, ...couponMetadata },
			bonusAmount: null,
			runningAvailableBalance,
			runningAccumulatedTotal,
		};
	}

	return {
		metadata: {
			...baseMetadata,
			...couponMetadata,
			cashbackSaldoDisponivel: result.clientNewAvailableBalance,
			compraCashbackNovoSaldo: result.clientNewAvailableBalance,
			cashbackTotalAcumuladoVida: result.clientNewAccumulatedTotal,
		},
		bonusAmount: result.cashbackAmount,
		runningAvailableBalance: result.clientNewAvailableBalance,
		runningAccumulatedTotal: result.clientNewAccumulatedTotal,
	};
}
