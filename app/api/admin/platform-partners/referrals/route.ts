import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { db } from "@/services/drizzle";
import { platformPartnerReferrals } from "@/services/drizzle/schema";
import { and, eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const GetAdminPlatformPartnerReferralsInputSchema = z.object({
	partnerId: z.string({ invalid_type_error: "Tipo invalido para ID do parceiro." }).optional().nullable(),
	status: z.string({ invalid_type_error: "Tipo invalido para status." }).optional().nullable(),
});
export type TGetAdminPlatformPartnerReferralsInput = z.infer<typeof GetAdminPlatformPartnerReferralsInputSchema>;

async function getAdminPlatformPartnerReferrals({ input }: { input: TGetAdminPlatformPartnerReferralsInput }) {
	const conditions = [];
	if (input.partnerId) conditions.push(eq(platformPartnerReferrals.partnerId, input.partnerId));
	if (input.status) conditions.push(eq(platformPartnerReferrals.status, input.status as typeof platformPartnerReferrals.$inferSelect.status));

	const referrals = await db.query.platformPartnerReferrals.findMany({
		where: and(...conditions),
		with: {
			partner: {
				columns: {
					id: true,
					nome: true,
					codigo: true,
				},
			},
			organizacao: {
				columns: {
					id: true,
					nome: true,
					assinaturaPlano: true,
					stripeSubscriptionStatus: true,
					dataInsercao: true,
				},
			},
			commissions: true,
		},
		orderBy: (fields, { desc }) => desc(fields.dataInsercao),
	});

	return {
		data: {
			referrals,
		},
		message: "Indicacoes obtidas com sucesso.",
	};
}
export type TGetAdminPlatformPartnerReferralsOutput = Awaited<ReturnType<typeof getAdminPlatformPartnerReferrals>>;

async function getAdminPlatformPartnerReferralsRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Voce nao esta autenticado.");
	if (!session.user.admin) throw new createHttpError.Forbidden("Acesso restrito a administradores.");

	const input = GetAdminPlatformPartnerReferralsInputSchema.parse({
		partnerId: request.nextUrl.searchParams.get("partnerId"),
		status: request.nextUrl.searchParams.get("status"),
	});
	const result = await getAdminPlatformPartnerReferrals({ input });
	return NextResponse.json(result);
}

export const GET = appApiHandler({ GET: getAdminPlatformPartnerReferralsRoute });
