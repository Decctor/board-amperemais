import { appApiHandler } from "@/lib/app-api";
import { assertCronAuthorized } from "@/lib/cron/assert-cron-authorized";
import { pollInboundForAllOrganizations } from "@/lib/fiscal/inbound";
import { NextRequest, NextResponse } from "next/server";

async function pollInboundRoute(_req: NextRequest) {
	const result = await pollInboundForAllOrganizations({});
	return NextResponse.json({ data: result, message: `Distribuição DF-e processada: ${result.novos} novas notas em ${result.organizacoes} organizações.` }, { status: 200 });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export const GET = appApiHandler({
	GET: async (req) => {
		assertCronAuthorized(req);
		return pollInboundRoute(req);
	},
});
