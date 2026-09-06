import type { TOnboardingAnswers } from "@/schemas/onboarding";
import { relations } from "drizzle-orm";
import { jsonb, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { newTable } from "./common";
import { onboardingIntentOriginEnum, onboardingProductEnum } from "./enums";
import { organizations } from "./organizations";
import { users } from "./users";

/**
 * Progresso de uma jornada de ativação, por organização e produto (CRM, ERP).
 *
 * Guarda NAVEGAÇÃO e RESPOSTAS, nunca prontidão: a etapa atual é uma referência de onde o
 * usuário parou, e o que está de fato configurado é derivado das tabelas reais por
 * `getOnboardingReadiness` (lib/onboarding/readiness.ts). Substitui o cookie `onboarding_stage`,
 * que vivia por 24h num único dispositivo. `organizations.dataOnboardingConclusao` continua como
 * gate do /dashboard e é carimbada quando a PRIMEIRA jornada conclui.
 * Plano: docs/onboarding/onboarding-crm-erp-technical-and-visual-design.md §2.1.
 */
export const organizationOnboardings = newTable(
	"organization_onboardings",
	{
		id: varchar("id", { length: 255 })
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		organizacaoId: varchar("organizacao_id", { length: 255 })
			.references(() => organizations.id, { onDelete: "cascade" })
			.notNull(),
		produto: onboardingProductEnum("produto").notNull(),
		origemIntencao: onboardingIntentOriginEnum("origem_intencao").notNull(),
		etapaAtual: varchar("etapa_atual", { length: 64 }).notNull(),
		etapasAdiadas: jsonb("etapas_adiadas").$type<string[]>().notNull().default([]),
		etapasVisitadas: jsonb("etapas_visitadas").$type<string[]>().notNull().default([]),
		respostas: jsonb("respostas").$type<TOnboardingAnswers>().notNull(),
		dataInicio: timestamp("data_inicio").defaultNow().notNull(),
		dataConclusao: timestamp("data_conclusao"),
		autorId: varchar("autor_id", { length: 255 }).references(() => users.id, { onDelete: "set null" }),
		dataAtualizacao: timestamp("data_atualizacao", { mode: "date" })
			.defaultNow()
			.notNull()
			.$onUpdate(() => new Date()),
	},
	(table) => ({
		organizacaoProdutoUnique: uniqueIndex("idx_organization_onboardings_org_produto_unique").on(table.organizacaoId, table.produto),
	}),
);

export const organizationOnboardingsRelations = relations(organizationOnboardings, ({ one }) => ({
	organizacao: one(organizations, {
		fields: [organizationOnboardings.organizacaoId],
		references: [organizations.id],
	}),
	autor: one(users, {
		fields: [organizationOnboardings.autorId],
		references: [users.id],
	}),
}));

export type TOrganizationOnboardingEntity = typeof organizationOnboardings.$inferSelect;
export type TNewOrganizationOnboardingEntity = typeof organizationOnboardings.$inferInsert;
