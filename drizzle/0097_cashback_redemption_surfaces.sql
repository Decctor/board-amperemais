-- Superfícies de resgate do programa de cashback.
--
-- Completa a família iniciada na 0069 (`resgate_permitir_via_ponto_integracao`): o programa
-- passa a dizer em qual superfície o cliente pode resgatar — PDV, ponto de interação e loja
-- digital — para desconto em cashback e para recompensa. Mesmo desenho dos cupons
-- (`ampmais_coupons.resgate_permitir_via_*`).
--
-- Mora no programa, e não em `ampmais_sales_channels`, porque superfície de resgate não é canal
-- de venda (o POI resgata sem ser canal; iFood e comanda são canais sem resgate) e porque
-- canais de venda são exclusivos do tier ERP, enquanto loja digital e cashback não são.
--
-- Sem backfill, de propósito: antes do gate o resgate no PDV e na loja era sempre permitido,
-- então o único estado que preserva o comportamento é `true` para todo mundo — e o default da
-- coluna já entrega isso (lição da 0069, cujo backfill original precisou de reparo).
--
-- Aplicar com: npx tsx ./scripts/apply-sql-migration.ts drizzle/0097_cashback_redemption_surfaces.sql
-- Idempotente (IF NOT EXISTS).

ALTER TABLE "ampmais_cashback_programs"
	ADD COLUMN IF NOT EXISTS "resgate_permitir_via_pos" boolean DEFAULT true NOT NULL;

ALTER TABLE "ampmais_cashback_programs"
	ADD COLUMN IF NOT EXISTS "resgate_permitir_via_loja_digital" boolean DEFAULT true NOT NULL;
