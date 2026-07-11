import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { db } from "@/services/drizzle";
import { platformPartnerCommissions, platformPartnerPayouts, platformPartnerReferrals, platformPartners } from "@/services/drizzle/schema";
import { eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";

async function getPlatformPartnerDashboard({ userId }: { userId: string }) {
	const partner = await db.query.platformPartners.findFirst({
		where: eq(platformPartners.usuarioId, userId),
		columns: {
			id: true,
			status: true,
			codigo: true,
			nome: true,
			dataInsercao: true,
			dataAprovacao: true,
		},
	});
	if (!partner) {
		return {
			data: {
				partner: null,
				stats: null,
				organizations: [],
				payouts: [],
			},
			message: "Cadastro de parceiro não encontrado.",
		};
	}

	const referrals = await db.query.platformPartnerReferrals.findMany({
		where: eq(platformPartnerReferrals.partnerId, partner.id),
		with: {
			organizacao: {
				columns: {
					id: true,
					nome: true,
					assinaturaPlano: true,
					stripeSubscriptionStatus: true,
					periodoTesteInicio: true,
					periodoTesteFim: true,
					dataInsercao: true,
				},
			},
			commissions: true,
		},
		orderBy: (fields, { desc }) => desc(fields.dataInsercao),
	});

	const payouts = await db.query.platformPartnerPayouts.findMany({
		where: eq(platformPartnerPayouts.partnerId, partner.id),
		orderBy: (fields, { desc }) => desc(fields.dataInsercao),
	});

	const commissions = await db.query.platformPartnerCommissions.findMany({
		where: eq(platformPartnerCommissions.partnerId, partner.id),
	});

	const valorPendenteCentavos = commissions
		.filter((commission) => commission.status === "PENDENTE" || commission.status === "APROVADA")
		.reduce((total, commission) => total + commission.valorComissaoCentavos, 0);
	const valorPagoCentavos = commissions
		.filter((commission) => commission.status === "PAGA")
		.reduce((total, commission) => total + commission.valorComissaoCentavos, 0);

	return {
		data: {
			partner,
			stats: {
				organizacoesIndicadas: referrals.length,
				comissoesTotalCentavos: commissions.reduce((total, commission) => total + commission.valorComissaoCentavos, 0),
				valorPendenteCentavos,
				valorPagoCentavos,
				payoutsPagos: payouts.filter((payout) => payout.status === "PAGO").length,
			},
			organizations: referrals.map((referral) => ({
				id: referral.organizacao?.id ?? referral.id,
				nome: referral.organizacao?.nome ?? referral.organizacaoNomeSnapshot ?? "Organizacao excluida",
				plano: referral.organizacao?.assinaturaPlano ?? null,
				status: referral.organizacao
					? (referral.organizacao.stripeSubscriptionStatus ?? (referral.organizacao.periodoTesteFim ? "trial" : "sem_assinatura"))
					: "excluida",
				dataEntrada: referral.organizacao?.dataInsercao ?? referral.dataInsercao,
				valorComissionadoCentavos: referral.commissions.reduce((total, commission) => total + commission.valorComissaoCentavos, 0),
			})),
			payouts,
		},
		message: "Dashboard do parceiro obtido com sucesso.",
	};
}
export type TGetPlatformPartnerDashboardOutput = Awaited<ReturnType<typeof getPlatformPartnerDashboard>>;

async function getPlatformPartnerDashboardRoute(_request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Voce nao esta autenticado.");

	const result = await getPlatformPartnerDashboard({ userId: session.user.id });
	return NextResponse.json(result);
}

export const GET = appApiHandler({
	GET: getPlatformPartnerDashboardRoute,
});
