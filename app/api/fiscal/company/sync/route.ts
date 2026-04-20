import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { syncFiscalCompany as syncFiscalCompanySettings } from "@/lib/fiscal/settings";
import createHttpError from "http-errors";
import { NextResponse } from "next/server";

async function syncFiscalCompany() {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	const orgId = session.membership?.organizacao.id;
	if (!orgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");
	if (!session.user.admin && !session.membership?.permissoes.fiscal.configurar) {
		throw new createHttpError.Forbidden("Acesso restrito aos responsáveis pela organização.");
	}

	try {
		const result = await syncFiscalCompanySettings(orgId);
		return {
			data: result,
			message: "Cadastro fiscal sincronizado com sucesso.",
		};
	} catch (error) {
		throw new createHttpError.InternalServerError("Erro ao sincronizar cadastro fiscal.");
	}
}
export type TSyncFiscalCompanyOutput = Awaited<ReturnType<typeof syncFiscalCompany>>;

async function syncFiscalCompanyRoute() {
	const result = await syncFiscalCompany();
	return NextResponse.json(result);
}

export const POST = appApiHandler({ POST: syncFiscalCompanyRoute });
