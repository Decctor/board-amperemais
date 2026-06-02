-- Separacao do status comercial (statusVenda) e do status operacional (statusAtendimento) da venda.

-- 1. Renomeia a coluna comercial status -> status_venda.
ALTER TABLE "ampmais_sales" RENAME COLUMN "status" TO "status_venda";--> statement-breakpoint

-- 2. Migra registros legados FATURADA -> CONFIRMADA (faturamento passa a ser inferido dos documentos fiscais).
UPDATE "ampmais_sales" SET "status_venda" = 'CONFIRMADA' WHERE "status_venda" = 'FATURADA';--> statement-breakpoint

-- 3. Recria o enum sale_status sem o valor FATURADA.
ALTER TYPE "public"."sale_status" RENAME TO "sale_status_old";--> statement-breakpoint
CREATE TYPE "public"."sale_status" AS ENUM('ORCAMENTO', 'CONDICIONAL', 'CONFIRMADA', 'CANCELADA');--> statement-breakpoint
ALTER TABLE "ampmais_sales" ALTER COLUMN "status_venda" TYPE "public"."sale_status" USING "status_venda"::text::"public"."sale_status";--> statement-breakpoint
DROP TYPE "public"."sale_status_old";--> statement-breakpoint

-- 4. Cria o enum de status de atendimento (fulfillment).
CREATE TYPE "public"."sale_attendance_status" AS ENUM('NAO_INICIADO', 'EM_PREPARO', 'PRONTO', 'EM_ENTREGA', 'ENTREGUE', 'PARCIALMENTE_ENTREGUE', 'CANCELADO');--> statement-breakpoint

-- 5. Adiciona status_atendimento na venda (default NAO_INICIADO).
ALTER TABLE "ampmais_sales" ADD COLUMN "status_atendimento" "public"."sale_attendance_status" DEFAULT 'NAO_INICIADO' NOT NULL;--> statement-breakpoint

-- 5.1. Vendas confirmadas antigas sao historicas/concluidas: inicializa o atendimento como ENTREGUE.
UPDATE "ampmais_sales" SET "status_atendimento" = 'ENTREGUE' WHERE "status_venda" = 'CONFIRMADA';--> statement-breakpoint
-- 5.2. Vendas comercialmente canceladas recebem atendimento CANCELADO.
UPDATE "ampmais_sales" SET "status_atendimento" = 'CANCELADO' WHERE "status_venda" = 'CANCELADA';--> statement-breakpoint

-- 6. Adiciona rastreabilidade operacional minima nos itens da venda.
ALTER TABLE "ampmais_sale_items" ADD COLUMN "quantidade_reservada" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "ampmais_sale_items" ADD COLUMN "quantidade_separada" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "ampmais_sale_items" ADD COLUMN "quantidade_entregue" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "ampmais_sale_items" ADD COLUMN "quantidade_cancelada" double precision DEFAULT 0 NOT NULL;
