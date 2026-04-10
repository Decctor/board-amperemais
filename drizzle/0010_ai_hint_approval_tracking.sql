ALTER TABLE "ampmais_ai_hints" ADD COLUMN "aprovada_por" varchar(255);
ALTER TABLE "ampmais_ai_hints" ADD COLUMN "data_aprovacao" timestamp;
ALTER TABLE "ampmais_ai_hints" ADD CONSTRAINT "ampmais_ai_hints_aprovada_por_ampmais_users_id_fk" FOREIGN KEY ("aprovada_por") REFERENCES "public"."ampmais_users"("id") ON DELETE no action ON UPDATE no action;
