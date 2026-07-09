import { appApiHandler } from "@/lib/app-api";
import { getShopAvailabilityData } from "@/lib/shop/catalog-data";
import { type NextRequest, NextResponse } from "next/server";

function extractOrgId(pathname: string) {
	return pathname.split("/")[3];
}

async function getShopAvailabilityRoute(request: NextRequest) {
	const orgId = extractOrgId(request.nextUrl.pathname);
	const data = await getShopAvailabilityData(orgId);

	return NextResponse.json({
		data,
		message: "Disponibilidade carregada com sucesso.",
	});
}
export type TGetShopAvailabilityOutput = Awaited<ReturnType<typeof getShopAvailabilityRoute>> extends NextResponse<infer T> ? T : never;

export const GET = appApiHandler({ GET: getShopAvailabilityRoute });
