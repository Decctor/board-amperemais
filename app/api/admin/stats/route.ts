import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { db } from "@/services/drizzle";
import { organizations, users } from "@/services/drizzle/schema";
import { sql } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";

async function getAdminStats() {
	const [orgCount, userCount] = await Promise.all([
		db.select({ count: sql<number>`count(*)::int` }).from(organizations),
		db.select({ count: sql<number>`count(*)::int` }).from(users),
	]);

	return {
		data: {
			totalOrganizations: orgCount[0]?.count || 0,
			totalUsers: userCount[0]?.count || 0,
		},
		message: "Estatísticas administrativas obtidas com sucesso.",
	};
}
export type TGetAdminStatsOutput = Awaited<ReturnType<typeof getAdminStats>>;

async function getAdminStatsRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	if (!session.user.admin) throw new createHttpError.Forbidden("Acesso restrito a administradores.");

	const result = await getAdminStats();

	return NextResponse.json(result);
}

export const GET = appApiHandler({
	GET: getAdminStatsRoute,
});
