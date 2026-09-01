import { appApiHandler } from "@/lib/app-api";
import { runPagesRouteHandler, type PagesRouteHandler, type PagesRouteRequest, type PagesRouteResponse } from "@/lib/pages-route-compat";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { DATA_SOURCE_INTEGRATION_TYPES } from "@/lib/integrations/data-sources";
import type { TDataSourceIntegrationTipoEnum } from "@/schemas/enums";
import { db } from "@/services/drizzle";
import { integrations, partners, products, sellers } from "@/services/drizzle/schema";
import { and, eq, inArray } from "drizzle-orm";
import createHttpError from "http-errors";

export type TSaleQueryFilterOptions = {
	integrations: {
		id: string;
		label: string;
		value: string;
		tipo: TDataSourceIntegrationTipoEnum;
		apelido: string | null;
		ativo: boolean;
	}[];
	sellers: {
		id: string;
		label: string;
		value: string;
	}[];
	partners: {
		id: string;
		label: string;
		value: string;
	}[];
	productsGroups: {
		id: string;
		label: string;
		value: string;
	}[];
};
const getSaleQueryFiltersRoute: PagesRouteHandler<{ data: TSaleQueryFilterOptions }> = async (req, res) => {
	const sessionUser = await getCurrentSessionUncached();
	if (!sessionUser) throw new createHttpError.Unauthorized("Você não está autenticado.");

	const userOrgId = sessionUser.membership?.organizacao.id;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	// Conexões de fonte de dados da organização (inclui desativadas — vendas históricas
	// continuam apontando para elas via `integracaoId`).
	const orgIntegrations = await db.query.integrations.findMany({
		where: and(eq(integrations.organizacaoId, userOrgId), inArray(integrations.tipo, [...DATA_SOURCE_INTEGRATION_TYPES])),
		columns: {
			id: true,
			tipo: true,
			apelido: true,
			ativo: true,
		},
		orderBy: [integrations.dataInsercao, integrations.id],
	});

	const groupedSellers = await db.query.sellers.findMany({
		where: and(eq(sellers.organizacaoId, userOrgId), eq(sellers.ativo, true)),
		columns: {
			id: true,
			identificador: true,
			nome: true,
			avatarUrl: true,
		},
	});

	const groupedPartners = await db.query.partners.findMany({
		where: eq(partners.organizacaoId, userOrgId),
		columns: {
			id: true,
			identificador: true,
			nome: true,
			avatarUrl: true,
		},
	});
	const groupedProductGroups = await db
		.select({
			group: products.grupo,
		})
		.from(products)
		.where(eq(products.organizacaoId, userOrgId))
		.groupBy(products.grupo);
	// const salesCollection: Collection<TSale> = db.collection("sales");

	// const sellersResult = await salesCollection.aggregate([{ $group: { _id: "$vendedor" } }]).toArray();
	// const sellers = sellersResult.map((current) => current._id);

	// const productsGroupsResult = await salesCollection
	// 	.aggregate([{ $unwind: { path: "$itens", preserveNullAndEmptyArrays: false } }, { $group: { _id: "$itens.grupo" } }])
	// 	.toArray();
	// const productsGroups = productsGroupsResult.map((current) => current._id);
	return res.status(200).json({
		data: {
			integrations: orgIntegrations.map((integration) => ({
				id: integration.id,
				label: integration.apelido?.trim() || integration.tipo,
				value: integration.id,
				tipo: integration.tipo as TDataSourceIntegrationTipoEnum,
				apelido: integration.apelido,
				ativo: integration.ativo,
			})),
			sellers: groupedSellers.map((s) => ({
				id: s.id,
				label: s.nome,
				value: s.id,
			})),
			partners: groupedPartners.map((p) => ({
				id: p.id,
				label: p.identificador,
				value: p.identificador,
			})),
			productsGroups: groupedProductGroups.map((p) => ({
				id: p.group,
				label: p.group,
				value: p.group,
			})),
		},
	});
};

const routeHandlers = {
	GET: getSaleQueryFiltersRoute,
} satisfies Partial<Record<"GET" | "POST" | "PUT" | "PATCH" | "DELETE", PagesRouteHandler<any>>>;

export const GET = appApiHandler({
	GET: (request) => runPagesRouteHandler({ request, handler: routeHandlers.GET! }),
});
