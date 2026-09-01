ALTER TABLE "ampmais_access_enrollment_challenges"
	ADD COLUMN "principal_id" varchar(255);

ALTER TABLE "ampmais_access_enrollment_challenges"
	ADD CONSTRAINT "ampmais_access_enrollment_challenges_principal_id_ampmais_access_principals_id_fk"
	FOREIGN KEY ("principal_id") REFERENCES "public"."ampmais_access_principals"("id")
	ON DELETE cascade ON UPDATE no action;

CREATE INDEX "idx_access_enrollment_challenges_principal_id"
	ON "ampmais_access_enrollment_challenges" USING btree ("principal_id");
