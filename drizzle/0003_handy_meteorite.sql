CREATE TABLE "ampmais_utils" (
	"identificador" text NOT NULL,
	"valor" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ampmais_users" ADD COLUMN "data_nascimento" timestamp;