import type { TShopSettingsConfiguration } from "@/schemas/shop";
import { relations } from "drizzle-orm";
import { boolean, index, jsonb, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { newTable } from "./common";
import { shopModeEnum } from "./enums";
import { organizations } from "./organizations";

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
