ALTER TABLE "ampmais_community_materials" ADD COLUMN "slug" varchar(255);
ALTER TABLE "ampmais_community_materials" ADD COLUMN "public_metadata" jsonb DEFAULT '{}'::jsonb;

WITH material_slugs AS (
	SELECT
		"id",
		COALESCE(
			NULLIF(TRIM(BOTH '-' FROM REGEXP_REPLACE(LOWER("titulo"), '[^a-z0-9]+', '-', 'g')), ''),
			'material'
		) AS "base_slug"
	FROM "ampmais_community_materials"
),
ranked_material_slugs AS (
	SELECT
		"id",
		"base_slug",
		ROW_NUMBER() OVER (PARTITION BY "base_slug" ORDER BY "id") AS "slug_rank"
	FROM material_slugs
)
UPDATE "ampmais_community_materials"
SET "slug" = CASE
	WHEN ranked_material_slugs."slug_rank" = 1 THEN ranked_material_slugs."base_slug"
	ELSE ranked_material_slugs."base_slug" || '-' || ranked_material_slugs."slug_rank"
END
FROM ranked_material_slugs
WHERE "ampmais_community_materials"."id" = ranked_material_slugs."id";

ALTER TABLE "ampmais_community_materials" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "idx_community_materials_slug" ON "ampmais_community_materials" ("slug");

CREATE TABLE "ampmais_community_material_claims" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"material_id" varchar(255) NOT NULL,
	"claim_key" varchar(255) NOT NULL,
	"claim_key_type" varchar(40) DEFAULT 'EMAIL' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"data_insercao" timestamp DEFAULT now() NOT NULL,
	"data_atualizacao" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ampmais_community_material_claims_material_id_fk" FOREIGN KEY ("material_id") REFERENCES "ampmais_community_materials"("id") ON DELETE cascade
);

CREATE INDEX "idx_community_material_claims_material" ON "ampmais_community_material_claims" ("material_id");
CREATE INDEX "idx_community_material_claims_key" ON "ampmais_community_material_claims" ("claim_key");
CREATE UNIQUE INDEX "idx_community_material_claims_material_key" ON "ampmais_community_material_claims" ("material_id", "claim_key_type", "claim_key");
