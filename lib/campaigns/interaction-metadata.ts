import { generateCashbackForCampaign } from "@/lib/cashback/generate-campaign-cashback";
import type { TInteractionContextMetadados } from "@/lib/message-templates";
import type { TCashbackProgramAccumulationTypeEnum, TCashbackProgramTerminologyEnum, TTimeDurationUnitsEnum } from "@/schemas/enums";
import type { DBTransaction } from "@/services/drizzle";

type TCampaignCashbackGenerationConfig = {
	id: string;
	cashbackGeracaoAtivo: boolean;
	cashbackGeracaoTipo: TCashbackProgramAccumulationTypeEnum | null;
	cashbackGeracaoValor: number | null;
	cashbackGeracaoExpiracaoMedida: TTimeDurationUnitsEnum | null;
	cashbackGeracaoExpiracaoValor: number | null;
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
	enabled = true,
}: {
	tx: DBTransaction;
	baseMetadata: TInteractionContextMetadados;
	campaign: TCampaignCashbackGenerationConfig;
	organizationId: string;
	clientId: string;
	saleId: string | null;
	saleValue: number | null;
	enabled?: boolean;
}): Promise<TApplyCampaignBonusResult> {
	const runningAvailableBalance = baseMetadata.cashbackSaldoDisponivel ?? baseMetadata.compraCashbackNovoSaldo ?? 0;
	const runningAccumulatedTotal = baseMetadata.cashbackTotalAcumuladoVida ?? 0;

	if (!enabled || !campaign.cashbackGeracaoAtivo || !campaign.cashbackGeracaoTipo || !campaign.cashbackGeracaoValor) {
		return {
			metadata: baseMetadata,
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
	});

	if (!result) {
		return {
			metadata: baseMetadata,
			bonusAmount: null,
			runningAvailableBalance,
			runningAccumulatedTotal,
		};
	}

	return {
		metadata: {
			...baseMetadata,
			cashbackSaldoDisponivel: result.clientNewAvailableBalance,
			compraCashbackNovoSaldo: result.clientNewAvailableBalance,
			cashbackTotalAcumuladoVida: result.clientNewAccumulatedTotal,
		},
		bonusAmount: result.cashbackAmount,
		runningAvailableBalance: result.clientNewAvailableBalance,
		runningAccumulatedTotal: result.clientNewAccumulatedTotal,
	};
}
