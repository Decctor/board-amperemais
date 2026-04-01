import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { syncFiscalCompany as syncFiscalCompanySettings } from "@/lib/fiscal/settings";
import createHttpError from "http-errors";
import { NextResponse } from "next/server";

async function syncFiscalCompany() {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("VocÃª nÃ£o estÃ¡ autenticado.");
	const orgId = session.membership?.organizacao.id;
	if (!orgId) throw new createHttpError.Unauthorized("VocÃª precisa estar vinculado a uma organizaÃ§Ã£o.");
	if (!session.user.admin && !session.membership?.permissoes.empresa.editar) {
		throw new createHttpError.Forbidden("Acesso restrito aos responsÃ¡veis pela organizaÃ§Ã£o.");
	}

	const result = await syncFiscalCompanySettings(orgId);
	return {
		data: result,
		message: "Cadastro fiscal sincronizado com sucesso.",
	};
}
export type TSyncFiscalCompanyOutput = Awaited<ReturnType<typeof syncFiscalCompany>>;

async function syncFiscalCompanyRoute() {
	const result = await syncFiscalCompany();
	return NextResponse.json(result);
}

export const POST = appApiHandler({ POST: syncFiscalCompanyRoute });
