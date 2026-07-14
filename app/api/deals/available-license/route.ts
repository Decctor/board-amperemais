import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { getDealWithAvailableLicense } from "@/lib/deals";
import type { TAuthUserSession } from "@/lib/authentication/types";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";

// Informa se o usuário logado (como obtentor de um deal ATIVO) possui licença disponível
// para criar uma organização sem passar por trial/checkout. Consumido pelo onboarding.
async function getAvailableDealLicense({ session }: { session: TAuthUserSession }) {
	const result = await getDealWithAvailableLicense({ userId: session.user.id, email: session.user.email });

	if (!result) {
		return {
			data: {
				available: false as const,
				deal: null,
				licencasUtilizadas: 0,
			},
			message: "Nenhuma licença de deal disponível.",
		};
	}

	return {
		data: {
			available: true as const,
			deal: {
				id: result.deal.id,
				nome: result.deal.nome,
				planoBase: result.deal.planoBase,
				quantidadeLicencas: result.deal.quantidadeLicencas,
			},
			licencasUtilizadas: result.licencasUtilizadas,
		},
		message: "Licença de deal disponível.",
	};
}
export type TGetAvailableDealLicenseOutput = Awaited<ReturnType<typeof getAvailableDealLicense>>;

async function getAvailableDealLicenseRoute(_request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");

	const result = await getAvailableDealLicense({ session });
	return NextResponse.json(result);
}

export const GET = appApiHandler({
	GET: getAvailableDealLicenseRoute,
});
