import { apiHandler } from "@/lib/api";
import { reverseSaleCashback } from "@/lib/cashback/reverse-sale-cashback";
import { processConversionAttribution } from "@/lib/conversions/attribution";
import { fetchCardapioWebOrdersWithDetails } from "@/lib/data-connectors/cardapio-web";
import { extractAllCardapioWebData, MappedCardapioWebSale } from "@/lib/data-connectors/cardapio-web/mappers";
import { TCardapioWebConfig } from "@/lib/data-connectors/cardapio-web/types";
import { ImmediateProcessingData } from "@/lib/interactions";
import { linkPartnerToClient } from "@/lib/partners/link-partner-to-client";
import { db, DBTransaction } from "@/services/drizzle";
import {
	cashbackProgramBalances,
	clients,
	organizationMembers,
	partners,
	productAddOnOptions,
	productAddOns,
	products,
	saleItems,
	sales,
} from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { and, eq } from "drizzle-orm";

export default apiHandler({
	GET: async (req, res) => {
		const allMemberships = await db.query.organizationMembers.findMany({});

		for (const membership of allMemberships) {
			await db
				.update(organizationMembers)
				.set({
					permissoes: {
						...membership.permissoes,
						fiscal: {
							visualizar: false,
							configurar: false,
							emitir: false,
							cancelar: false,
						},
					},
				})
				.where(eq(organizationMembers.id, membership.id));
		}

		return res.status(200).json({ message: "Correção concluída." });
	},
});
