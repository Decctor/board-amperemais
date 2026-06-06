import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { db } from "@/services/drizzle";
import { platformPartnerPayouts, platformPartners } from "@/services/drizzle/schema";
import { eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";

async function getPlatformPartnerPayouts({ userId }: { userId: string }) {
	const partner = await db.query.platformPartners.findFirst({
		where: eq(platformPartners.usuarioId, userId),
		columns: { id: true },
	});
	if (!partner) throw new createHttpError.NotFound("Cadastro de parceiro nao encontrado.");

	const payouts = await db.query.platformPartnerPayouts.findMany({
		where: eq(platformPartnerPayouts.partnerId, partner.id),
		with: {
			commissions: {
				with: {
					organizacao: {
						columns: {
							id: true,
							nome: true,
							assinaturaPlano: true,
						},
					},
				},
			},
		},
		orderBy: (fields, { desc }) => desc(fields.dataInsercao),
	});

	return {
		data: {
			payouts,
		},
		message: "Payouts obtidos com sucesso.",
	};
}
export type TGetPlatformPartnerPayoutsOutput = Awaited<ReturnType<typeof getPlatformPartnerPayouts>>;

async function getPlatformPartnerPayoutsRoute(_request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Voce nao esta autenticado.");

	const result = await getPlatformPartnerPayouts({ userId: session.user.id });
	return NextResponse.json(result);
}

export const GET = appApiHandler({
	GET: getPlatformPartnerPayoutsRoute,
});
