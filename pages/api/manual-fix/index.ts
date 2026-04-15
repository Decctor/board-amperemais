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
		const memberships = await db.query.organizationMembers.findMany({
			with: {
				usuario: true,
			},
		});

		for (const membership of memberships) {
			const userHasCompanyEditPermission = membership.permissoes.empresa.editar;

			if (userHasCompanyEditPermission) {
				console.log(`[INFO] [MANUAL FIX] User ${membership.usuario?.nome} has company edit permission, applying permission to see sensitive data`);
				// If so, we apply permission to see sensitive data
				await db
					.update(organizationMembers)
					.set({
						permissoes: {
							...membership.permissoes,
							resultados: {
								...membership.permissoes.resultados,
								visualizarSensiveis: true,
							},
						},
					})
					.where(eq(organizationMembers.id, membership.id));
			}
		}

		// await handleCardapioWebImportation(ORG_ID, config.integracaoConfiguracao as TCardapioWebConfig);

		return res.status(200).json({ message: "Importação concluída." });
	},
});
