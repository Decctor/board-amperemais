-- Variantes estruturadas: eixos de variacao (Tamanho, Cor), seus valores e a juncao com as variantes.
-- Aditivo: variantes "planas" existentes continuam validas (sem linhas de juncao usam o nome livre).

-- 1. Enum do tipo de eixo (drive a UI: texto simples, swatch de cor, valor numerico).
CREATE TYPE "public"."variant_option_type" AS ENUM('TEXTO', 'COR', 'NUMERO');--> statement-breakpoint

-- 2. product_options: os eixos de variacao de um produto.
CREATE TABLE "ampmais_product_options" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"organizacao_id" varchar(255) NOT NULL,
	"produto_id" varchar(255) NOT NULL,
	"id_externo" text,
	"nome" text NOT NULL,
	"tipo" "public"."variant_option_type" DEFAULT 'TEXTO' NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL
);--> statement-breakpoint

-- 3. product_option_values: os valores de cada eixo (P, M, G / Preto, Branco).
CREATE TABLE "ampmais_product_option_values" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"organizacao_id" varchar(255) NOT NULL,
	"opcao_id" varchar(255) NOT NULL,
	"id_externo" text,
	"nome" text NOT NULL,
	"valor_auxiliar" text,
	"imagem_capa_url" text,
	"ordem" integer DEFAULT 0 NOT NULL
);--> statement-breakpoint

-- 4. product_variant_option_values: juncao variante <-> valor de eixo.
CREATE TABLE "ampmais_product_variant_option_values" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"organizacao_id" varchar(255) NOT NULL,
	"produto_variante_id" varchar(255) NOT NULL,
	"opcao_id" varchar(255) NOT NULL,
	"opcao_valor_id" varchar(255) NOT NULL
);--> statement-breakpoint

-- 5. Foreign keys.
ALTER TABLE "ampmais_product_options" ADD CONSTRAINT "ampmais_product_options_organizacao_id_ampmais_organizations_id_fk" FOREIGN KEY ("organizacao_id") REFERENCES "public"."ampmais_organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ampmais_product_options" ADD CONSTRAINT "ampmais_product_options_produto_id_ampmais_products_id_fk" FOREIGN KEY ("produto_id") REFERENCES "public"."ampmais_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ampmais_product_option_values" ADD CONSTRAINT "ampmais_product_option_values_organizacao_id_ampmais_organizations_id_fk" FOREIGN KEY ("organizacao_id") REFERENCES "public"."ampmais_organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ampmais_product_option_values" ADD CONSTRAINT "ampmais_product_option_values_opcao_id_ampmais_product_options_id_fk" FOREIGN KEY ("opcao_id") REFERENCES "public"."ampmais_product_options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ampmais_product_variant_option_values" ADD CONSTRAINT "ampmais_product_variant_option_values_organizacao_id_ampmais_organizations_id_fk" FOREIGN KEY ("organizacao_id") REFERENCES "public"."ampmais_organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ampmais_product_variant_option_values" ADD CONSTRAINT "ampmais_product_variant_option_values_produto_variante_id_ampmais_product_variants_id_fk" FOREIGN KEY ("produto_variante_id") REFERENCES "public"."ampmais_product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ampmais_product_variant_option_values" ADD CONSTRAINT "ampmais_product_variant_option_values_opcao_id_ampmais_product_options_id_fk" FOREIGN KEY ("opcao_id") REFERENCES "public"."ampmais_product_options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ampmais_product_variant_option_values" ADD CONSTRAINT "ampmais_product_variant_option_values_opcao_valor_id_ampmais_product_option_values_id_fk" FOREIGN KEY ("opcao_valor_id") REFERENCES "public"."ampmais_product_option_values"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

-- 6. Indices.
CREATE INDEX "idx_product_options_produto" ON "ampmais_product_options" USING btree ("produto_id");--> statement-breakpoint
CREATE INDEX "idx_product_option_values_opcao" ON "ampmais_product_option_values" USING btree ("opcao_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unq_variant_option" ON "ampmais_product_variant_option_values" USING btree ("produto_variante_id","opcao_id");--> statement-breakpoint
CREATE INDEX "idx_variant_option_values_variante" ON "ampmais_product_variant_option_values" USING btree ("produto_variante_id");--> statement-breakpoint
CREATE INDEX "idx_variant_option_values_valor" ON "ampmais_product_variant_option_values" USING btree ("opcao_valor_id");
