import type { TShopSettingsConfiguration } from "@/schemas/shop";
import { relations } from "drizzle-orm";
import { boolean, index, jsonb, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { newTable } from "./common";
import { shopModeEnum } from "./enums";
import { organizations } from "./organizations";
import { sales } from "./sales";

export const shopSettings = newTable(
	"shop_settings",
	{
		id: varchar("id", { length: 255 })
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		organizacaoId: varchar("organizacao_id", { length: 255 })
			.references(() => organizations.id, { onDelete: "cascade" })
			.notNull()
			.unique(),
		ativo: boolean("ativo").notNull().default(false),
		modo: shopModeEnum("modo").notNull().default("CARDAPIO"),
		linkQrCode: text("link_qr_code"),
		configuracoes: jsonb("configuracoes").$type<TShopSettingsConfiguration>().notNull(),
		dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
		dataAtualizacao: timestamp("data_atualizacao").$defaultFn(() => new Date()),
	},
	(table) => ({
		organizacaoIdx: index("idx_shop_settings_organizacao").on(table.organizacaoId),
		ativoIdx: index("idx_shop_settings_ativo").on(table.ativo),
	}),
);

export const shopSettingsRelations = relations(shopSettings, ({ one }) => ({
	organizacao: one(organizations, {
		fields: [shopSettings.organizacaoId],
		references: [organizations.id],
	}),
}));

export type TShopSettingsEntity = typeof shopSettings.$inferSelect;
export type TNewShopSettingsEntity = typeof shopSettings.$inferInsert;

export const shopOrderRequests = newTable(
	"shop_order_requests",
	{
		id: varchar("id", { length: 255 })
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		organizacaoId: varchar("organizacao_id", { length: 255 })
			.references(() => organizations.id, { onDelete: "cascade" })
			.notNull(),
		idempotencyKey: varchar("idempotency_key", { length: 255 }).notNull(),
		payloadHash: varchar("payload_hash", { length: 255 }).notNull(),
		status: varchar("status", { length: 30 }).$type<"PROCESSANDO" | "CONCLUIDO" | "ERRO">().notNull().default("PROCESSANDO"),
		vendaId: varchar("venda_id", { length: 255 }).references(() => sales.id, { onDelete: "set null" }),
		erro: text("erro"),
		dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
		dataAtualizacao: timestamp("data_atualizacao").$onUpdate(() => new Date()),
	},
	(table) => ({
		organizacaoIdempotencyKeyUnique: uniqueIndex("idx_shop_order_requests_org_idempotency_unique").on(table.organizacaoId, table.idempotencyKey),
		vendaIdIdx: index("idx_shop_order_requests_venda_id").on(table.vendaId),
	}),
);

export const shopOrderRequestsRelations = relations(shopOrderRequests, ({ one }) => ({
	organizacao: one(organizations, {
		fields: [shopOrderRequests.organizacaoId],
		references: [organizations.id],
	}),
	venda: one(sales, {
		fields: [shopOrderRequests.vendaId],
		references: [sales.id],
	}),
}));

export type TShopOrderRequestEntity = typeof shopOrderRequests.$inferSelect;
export type TNewShopOrderRequestEntity = typeof shopOrderRequests.$inferInsert;
