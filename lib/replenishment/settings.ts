import { db } from "@/services/drizzle";
import { replenishmentSettings } from "@/services/drizzle/schema";
import type { TReplenishmentSettings } from "@/schemas/replenishment";
import { eq } from "drizzle-orm";

// Padrões de uma loja de varejo de balcão: três meses de histórico, quinze dias de prazo, compra
// quinzenal, um mês de cobertura na prateleira e 95% de nível de serviço. São o ponto de partida —
// a tela deixa a compradora ajustar cada um deles e salvar como política da loja.
export const DEFAULT_REPLENISHMENT_SETTINGS: TReplenishmentSettings = {
	janelaAnaliseDias: 90,
	leadTimeDiasPadrao: 15,
	cicloRevisaoDias: 15,
	diasCoberturaAlvo: 30,
	nivelServico: 0.95,
	diasExcessoLimite: 30,
	ajustarDemandaPorRuptura: true,
	origemEstoquePadrao: "SISTEMA",
};

export async function getReplenishmentSettings({ organizationId }: { organizationId: string }): Promise<TReplenishmentSettings> {
	const stored = await db.query.replenishmentSettings.findFirst({
		where: eq(replenishmentSettings.organizacaoId, organizationId),
	});
	if (!stored) return DEFAULT_REPLENISHMENT_SETTINGS;

	return {
		janelaAnaliseDias: stored.janelaAnaliseDias,
		leadTimeDiasPadrao: stored.leadTimeDiasPadrao,
		cicloRevisaoDias: stored.cicloRevisaoDias,
		diasCoberturaAlvo: stored.diasCoberturaAlvo,
		nivelServico: stored.nivelServico,
		diasExcessoLimite: stored.diasExcessoLimite,
		ajustarDemandaPorRuptura: stored.ajustarDemandaPorRuptura,
		origemEstoquePadrao: stored.origemEstoquePadrao === "IMPORTACAO" ? "IMPORTACAO" : "SISTEMA",
	};
}

// Os filtros da tela são simulações: a compradora testa "e se o prazo fosse 30 dias?" sem gravar
// nada. O que a requisição manda sobrescreve a política salva apenas para aquela leitura.
export function resolveEffectiveSettings({
	stored,
	overrides,
}: {
	stored: TReplenishmentSettings;
	overrides: Partial<Record<keyof TReplenishmentSettings, unknown>>;
}): TReplenishmentSettings {
	return {
		janelaAnaliseDias: typeof overrides.janelaAnaliseDias === "number" ? overrides.janelaAnaliseDias : stored.janelaAnaliseDias,
		leadTimeDiasPadrao: typeof overrides.leadTimeDiasPadrao === "number" ? overrides.leadTimeDiasPadrao : stored.leadTimeDiasPadrao,
		cicloRevisaoDias: typeof overrides.cicloRevisaoDias === "number" ? overrides.cicloRevisaoDias : stored.cicloRevisaoDias,
		diasCoberturaAlvo: typeof overrides.diasCoberturaAlvo === "number" ? overrides.diasCoberturaAlvo : stored.diasCoberturaAlvo,
		nivelServico: typeof overrides.nivelServico === "number" ? overrides.nivelServico : stored.nivelServico,
		diasExcessoLimite: typeof overrides.diasExcessoLimite === "number" ? overrides.diasExcessoLimite : stored.diasExcessoLimite,
		ajustarDemandaPorRuptura:
			typeof overrides.ajustarDemandaPorRuptura === "boolean" ? overrides.ajustarDemandaPorRuptura : stored.ajustarDemandaPorRuptura,
		origemEstoquePadrao:
			overrides.origemEstoquePadrao === "IMPORTACAO" || overrides.origemEstoquePadrao === "SISTEMA"
				? overrides.origemEstoquePadrao
				: stored.origemEstoquePadrao,
	};
}
