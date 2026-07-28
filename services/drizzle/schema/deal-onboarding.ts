import { relations, sql } from "drizzle-orm";
import { index, jsonb, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import type { TDealOnboardingFormAnswers, TDealOnboardingFormStructure } from "@/schemas/deal-onboarding";
import { newTable } from "./common";
import { deals } from "./deals";
import { dealOnboardingFormStatusEnum } from "./enums";
import { users } from "./users";

// ============================================================================
// DEAL ONBOARDING FORMS (formulário público de coleta de dados do deal)
// O admin emite um link público; o comprador preenche dados gerais + uma seção
// por licença (organização a ser criada) e é direcionado ao checkout do deal.
// Estrutura e respostas ficam em JSONB até a estrutura ser validada. "CONCLUIDO"
// não é status persistido — deriva de deal.status === "ATIVO".
// ============================================================================

export const dealOnboardingForms = newTable(
	"deal_onboarding_forms",
	{
		id: varchar("id", { length: 255 })
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		dealId: varchar("deal_id", { length: 255 })
			.references(() => deals.id, { onDelete: "cascade" })
			.notNull(),
		status: dealOnboardingFormStatusEnum("status").notNull().default("EMITIDO"),
		// Persistimos apenas o hash (sha256 hex); o token bruto aparece somente na emissão — padrão tabs/servicePoints.
		tokenPublicoHash: varchar("token_publico_hash", { length: 64 }).notNull(),
		// Snapshot do template no momento da emissão. A contagem de seções por organização NÃO
		// fica aqui — é sempre lida de deal.quantidadeLicencas.
		estrutura: jsonb("estrutura").$type<TDealOnboardingFormStructure>().notNull(),
		respostas: jsonb("respostas").$type<TDealOnboardingFormAnswers>(), // null até o primeiro rascunho; travado quando PREENCHIDO
		dataExpiracao: timestamp("data_expiracao"), // opcional; bloqueia apenas o preenchimento, não o checkout
		dataPreenchimento: timestamp("data_preenchimento"),
		dataUltimoRascunho: timestamp("data_ultimo_rascunho"),
		emitidoPorUsuarioId: varchar("emitido_por_usuario_id", { length: 255 }).references(() => users.id, { onDelete: "set null" }),
		dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
	},
	(table) => ({
		dealIdx: index("idx_deal_onboarding_forms_deal").on(table.dealId),
		tokenPublicoHashIdx: uniqueIndex("idx_deal_onboarding_forms_token_hash").on(table.tokenPublicoHash),
		// No máximo um formulário não-cancelado por deal; reemitir = cancelar o antigo + inserir novo.
		dealAtivoIdx: uniqueIndex("idx_deal_onboarding_forms_deal_ativo")
			.on(table.dealId)
			.where(sql`status <> 'CANCELADO'`),
	}),
);

export const dealOnboardingFormsRelations = relations(dealOnboardingForms, ({ one }) => ({
	deal: one(deals, {
		fields: [dealOnboardingForms.dealId],
		references: [deals.id],
	}),
	emitidoPorUsuario: one(users, {
		fields: [dealOnboardingForms.emitidoPorUsuarioId],
		references: [users.id],
	}),
}));
export type TDealOnboardingFormEntity = typeof dealOnboardingForms.$inferSelect;
export type TNewDealOnboardingFormEntity = typeof dealOnboardingForms.$inferInsert;
