ALTER TABLE "ampmais_goals" ADD COLUMN IF NOT EXISTS "objetivo_qtde_vendas" double precision;--> statement-breakpoint
ALTER TABLE "ampmais_goals" ADD COLUMN IF NOT EXISTS "objetivo_novos_clientes" double precision;--> statement-breakpoint
ALTER TABLE "ampmais_goals_sellers" ADD COLUMN IF NOT EXISTS "objetivo_qtde_vendas" double precision;--> statement-breakpoint
ALTER TABLE "ampmais_goals_sellers" ADD COLUMN IF NOT EXISTS "objetivo_novos_clientes" double precision;
