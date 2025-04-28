CREATE TABLE "ampmais_product_embeddings" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"produto_id" varchar(255) NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"data_insercao" timestamp DEFAULT now() NOT NULL,
	"data_atualizacao" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ampmais_product_embeddings" ADD CONSTRAINT "ampmais_product_embeddings_produto_id_ampmais_products_id_fk" FOREIGN KEY ("produto_id") REFERENCES "public"."ampmais_products"("id") ON DELETE no action ON UPDATE no action;