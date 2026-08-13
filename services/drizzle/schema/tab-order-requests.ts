import type { TTabOrderRequestPayload } from "@/schemas/tab-order-requests";
import { relations } from "drizzle-orm";
import { index, jsonb, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { newTable } from "./common";
import { organizations } from "./organizations";
import { servicePoints } from "./service-points";
import { tabOrders, tabs } from "./tabs";
import { users } from "./users";

// ============================================================================
// TAB ORDER REQUESTS (solicitacoes publicas de pedido via QR)
// Inbox de aprovacao do operador. Idempotencia por (organizacao, idempotencyKey)
// + payloadHash, padrao shopOrderRequests. A aprovacao executa a MESMA
// precificacao autoritativa e o MESMO launchTabOrder do operador, usando o id
// da solicitacao como id do tabOrder (dedupe de retry de aprovacao).
// ============================================================================

export const tabOrderRequests = newTable(
	"tab_order_requests",
	{
		id: varchar("id", { length: 255 })
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		organizacaoId: varchar("organizacao_id", { length: 255 })
			.references(() => organizations.id, { onDelete: "cascade" })
			.notNull(),
		servicePointId: varchar("service_point_id", { length: 255 }).references(() => servicePoints.id, { onDelete: "set null" }),
		tabId: varchar("tab_id", { length: 255 }).references(() => tabs.id, { onDelete: "set null" }),
		tabOrderId: varchar("tab_order_id", { length: 255 }).references(() => tabOrders.id, { onDelete: "set null" }),
		idempotencyKey: varchar("idempotency_key", { length: 255 }).notNull(),
		payloadHash: varchar("payload_hash", { length: 64 }).notNull(),
		// Credencial criada pelo navegador. O valor bruto nunca e persistido.
		deviceKeyHash: varchar("device_key_hash", { length: 64 }),
		payloadSolicitacao: jsonb("payload_solicitacao").$type<TTabOrderRequestPayload>().notNull(),
		// varchar + z.enum de proposito: novos estados nao custam migracao de enum no Postgres.
		status: varchar("status", { length: 30 })
			.$type<"PENDENTE" | "APROVADA" | "REJEITADA" | "PROCESSANDO" | "CONCLUIDA" | "ERRO">()
			.notNull()
			.default("PENDENTE"),
		operadorAprovadorId: varchar("operador_aprovador_id", { length: 255 }).references(() => users.id, { onDelete: "set null" }),
		motivoRejeicao: text("motivo_rejeicao"),
		erroProcessamento: text("erro_processamento"),
		dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
		dataAtualizacao: timestamp("data_atualizacao").$onUpdate(() => new Date()),
	},
	(table) => ({
		organizacaoIdempotencyUnique: uniqueIndex("idx_tab_order_requests_org_idempotency_unique").on(table.organizacaoId, table.idempotencyKey),
		orgStatusIdx: index("idx_tab_order_requests_org_status").on(table.organizacaoId, table.status),
		tabIdx: index("idx_tab_order_requests_tab").on(table.tabId),
		servicePointIdx: index("idx_tab_order_requests_service_point").on(table.servicePointId),
		servicePointDeviceIdx: index("idx_tab_order_requests_service_point_device").on(table.servicePointId, table.deviceKeyHash),
	}),
);

export const tabOrderRequestsRelations = relations(tabOrderRequests, ({ one }) => ({
	organizacao: one(organizations, {
		fields: [tabOrderRequests.organizacaoId],
		references: [organizations.id],
	}),
	servicePoint: one(servicePoints, {
		fields: [tabOrderRequests.servicePointId],
		references: [servicePoints.id],
	}),
	tab: one(tabs, {
		fields: [tabOrderRequests.tabId],
		references: [tabs.id],
	}),
	tabOrder: one(tabOrders, {
		fields: [tabOrderRequests.tabOrderId],
		references: [tabOrders.id],
	}),
	operadorAprovador: one(users, {
		fields: [tabOrderRequests.operadorAprovadorId],
		references: [users.id],
	}),
}));

export type TTabOrderRequestEntity = typeof tabOrderRequests.$inferSelect;
export type TNewTabOrderRequestEntity = typeof tabOrderRequests.$inferInsert;
