import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { db } from "@/services/drizzle";
import { platformPartners } from "@/services/drizzle/schema";
import { eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";

async function getPlatformPartnerMe({ userId }: { userId: string }) {
	const partner = await db.query.platformPartners.findFirst({
		where: eq(platformPartners.usuarioId, userId),
		columns: {
			id: true,
			status: true,
			codigo: true,
			nome: true,
			email: true,
			telefone: true,
			cpfCnpj: true,
			chavePix: true,
			arquivos: true,
			aceiteTermos: true,
			dataAceiteTermos: true,
			dataAprovacao: true,
			dataInsercao: true,
		},
	});

	return {
		data: {
			partner,
		},
		message: partner ? "Parceiro encontrado com sucesso." : "Cadastro de parceiro nao encontrado.",
	};
}
export type TGetPlatformPartnerMeOutput = Awaited<ReturnType<typeof getPlatformPartnerMe>>;

async function getPlatformPartnerMeRoute(_request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Voce nao esta autenticado.");

	const result = await getPlatformPartnerMe({ userId: session.user.id });
	return NextResponse.json(result);
}

export const GET = appApiHandler({
	GET: getPlatformPartnerMeRoute,
});
