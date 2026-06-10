import {
	PLATFORM_PARTNER_COOKIE_MAX_AGE_SECONDS,
	PLATFORM_PARTNER_MONTHLY_FIRST_INVOICE_BPS,
	PLATFORM_PARTNER_MONTHLY_SUBSEQUENT_INVOICE_BPS,
	PLATFORM_PARTNER_YEARLY_INVOICE_BPS,
} from "@/lib/platform-partnerships/constants";

// Fonte única de verdade da página de divulgação.
// Os percentuais derivam direto do motor de comissão (bps -> %), então a
// copy nunca diverge da regra que efetivamente paga o parceiro.

const bpsToPercent = (bps: number) => bps / 100;

/** Mensalidade do plano Plataforma — base comissionável (consultoria não entra). */
export const COMMISSIONABLE_MONTHLY_BASE = 399.9;

export const FIRST_INVOICE_PERCENT = bpsToPercent(PLATFORM_PARTNER_MONTHLY_FIRST_INVOICE_BPS); // 100
export const SUBSEQUENT_INVOICE_PERCENT = bpsToPercent(PLATFORM_PARTNER_MONTHLY_SUBSEQUENT_INVOICE_BPS); // 20
export const YEARLY_INVOICE_PERCENT = bpsToPercent(PLATFORM_PARTNER_YEARLY_INVOICE_BPS); // 27

export const ATTRIBUTION_DAYS = Math.round(PLATFORM_PARTNER_COOKIE_MAX_AGE_SECONDS / (60 * 60 * 24)); // 30

/** Valor da primeira mensalidade que vai pro parceiro (100% da base). */
export const FIRST_MONTH_PAYOUT = COMMISSIONABLE_MONTHLY_BASE * (FIRST_INVOICE_PERCENT / 100);
/** Valor recorrente por loja, do segundo mês em diante (20% da base). */
export const RECURRING_MONTH_PAYOUT = COMMISSIONABLE_MONTHLY_BASE * (SUBSEQUENT_INVOICE_PERCENT / 100);

export const PARTNER_LOGIN_HREF = "/auth/signin?redirectTo=%2Fpartner-dashboard";
export const PROGRAM_PAGE_HREF = "/programa-de-parceiros";
