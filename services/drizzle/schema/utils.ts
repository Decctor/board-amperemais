import type { TUtilsValue } from "@/schemas/utils";
import { jsonb, text, varchar } from "drizzle-orm/pg-core";
import { newTable } from "./common";

export const utils = newTable("utils", {
	id: varchar("id", { length: 255 })
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	identificador: text("identificador").notNull(),
	valor: jsonb("valor").$type<TUtilsValue>().notNull(),
});
export type TUtilEntity = typeof utils.$inferSelect;
export type TNewUtilEntity = typeof utils.$inferInsert;
