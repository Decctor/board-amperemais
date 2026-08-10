-- Boleto nas assinaturas: acesso otimista com data absoluta de expiração local.
-- npx tsx ./scripts/apply-sql-migration.ts drizzle/0072_boleto_optimistic_access.sql
-- Idempotente.
--
-- Duas datas derivadas dos webhooks Stripe (plano: docs/dev-planning/stripe-boleto-plan.md):
--
-- assinatura_periodo_pago_fim: até quando pagamentos confirmados (invoice.paid) garantem
-- acesso — vem do period.end da linha recorrente do invoice e SÓ AVANÇA (GREATEST no update),
-- nunca recua por evento atrasado ou redelivery.
--
-- assinatura_acesso_provisorio_fim: até quando uma cobrança pendente (boleto emitido / PIX
-- aguardando confirmação) libera acesso otimista — vencimento do boleto + folga de compensação.
-- Nenhum evento revoga acesso: ele expira sozinho quando a data passa.
--
-- SEM BACKFILL, deliberadamente: NULL = comportamento anterior (decisão por
-- stripe_subscription_status), e o fluxo de `incomplete` legado tem janela-teto própria na
-- função de acesso. Os campos passam a ser preenchidos pelos webhooks a partir do deploy.

ALTER TABLE "ampmais_organizations" ADD COLUMN IF NOT EXISTS "assinatura_periodo_pago_fim" timestamp;
ALTER TABLE "ampmais_organizations" ADD COLUMN IF NOT EXISTS "assinatura_acesso_provisorio_fim" timestamp;
