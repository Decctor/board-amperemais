import type { TOnboardingIntentOriginEnum, TOnboardingProductEnum } from "@/schemas/enums";

export type TResolvedOnboardingIntent = { produto: TOnboardingProductEnum; origem: TOnboardingIntentOriginEnum } | null;

/**
 * Descobre a jornada a partir de sinais externos. Só o link comercial (`?produto=crm|erp`) é
 * lido hoje; cookie de parceiro e formulário de deal não carregam produto, então caem na
 * pergunta. Null = perguntar ao usuário.
 */
export function resolveOnboardingIntent({ produto }: { produto: string | string[] | undefined }): TResolvedOnboardingIntent {
	const value = Array.isArray(produto) ? produto[0] : produto;
	if (!value) return null;
	const normalized = value.trim().toUpperCase();
	if (normalized === "CRM" || normalized === "ERP") return { produto: normalized, origem: "LINK" };
	return null;
}
