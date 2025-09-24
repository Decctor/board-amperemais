import { relations } from "drizzle-orm/relations";
import { ampmaisClients, ampmaisSaleItems, ampmaisProducts, ampmaisSales } from "./schema";

export const ampmaisSaleItemsRelations = relations(ampmaisSaleItems, ({one}) => ({
	ampmaisClient: one(ampmaisClients, {
		fields: [ampmaisSaleItems.clienteId],
		references: [ampmaisClients.id]
	}),
	ampmaisProduct: one(ampmaisProducts, {
		fields: [ampmaisSaleItems.produtoId],
		references: [ampmaisProducts.id]
	}),
	ampmaisSale: one(ampmaisSales, {
		fields: [ampmaisSaleItems.vendaId],
		references: [ampmaisSales.id]
	}),
}));

export const ampmaisClientsRelations = relations(ampmaisClients, ({many}) => ({
	ampmaisSaleItems: many(ampmaisSaleItems),
	ampmaisSales: many(ampmaisSales),
}));

export const ampmaisProductsRelations = relations(ampmaisProducts, ({many}) => ({
	ampmaisSaleItems: many(ampmaisSaleItems),
}));

export const ampmaisSalesRelations = relations(ampmaisSales, ({one, many}) => ({
	ampmaisSaleItems: many(ampmaisSaleItems),
	ampmaisClient: one(ampmaisClients, {
		fields: [ampmaisSales.clienteId],
		references: [ampmaisClients.id]
	}),
}));