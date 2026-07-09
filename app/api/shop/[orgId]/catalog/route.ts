import { appApiHandler } from "@/lib/app-api";
import { getShopCatalogData } from "@/lib/shop/catalog-data";
import { type NextRequest, NextResponse } from "next/server";

function extractOrgId(pathname: string) {
	return pathname.split("/")[3];
}

async function getShopCatalog(request: NextRequest) {
	const orgId = extractOrgId(request.nextUrl.pathname);
	const data = await getShopCatalogData(orgId);

	return NextResponse.json(
		{
			data,
			message: "Catálogo carregado com sucesso.",
		},
		{
			headers: {
				"Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
			},
		},
	);
}
export type TGetShopCatalogOutput = Awaited<ReturnType<typeof getShopCatalog>> extends NextResponse<infer T> ? T : never;

export const GET = appApiHandler({ GET: getShopCatalog });
