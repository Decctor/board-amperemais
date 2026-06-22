ALTER TABLE "ampmais_shop_order_requests" ADD COLUMN "public_access_token_hash" varchar(64);
--> statement-breakpoint
UPDATE "ampmais_shop_order_requests"
SET "public_access_token_hash" = md5("id" || ':' || "idempotency_key")
WHERE "public_access_token_hash" IS NULL;
--> statement-breakpoint
ALTER TABLE "ampmais_shop_order_requests" ALTER COLUMN "public_access_token_hash" SET NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "idx_shop_order_requests_public_token_hash_unique" ON "ampmais_shop_order_requests" USING btree ("public_access_token_hash");