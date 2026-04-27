import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { syncFiscalCompanyCertificate as syncFiscalCompanyCertificateSettings } from "@/lib/fiscal/settings";
import createHttpError from "http-errors";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const SyncFiscalCertificateInputSchema = z.object({
	storagePath: z.string({
		required_error: "Path do certificado não informado.",
		invalid_type_error: "Tipo não válido para o path do certificado.",
	}),
	password: z.string({
		required_error: "Senha do certificado não informada.",
		invalid_type_error: "Tipo não válido para a senha do certificado.",
	}),
});
export type TSyncFiscalCertificateInput = z.infer<typeof SyncFiscalCertificateInputSchema>;

async function syncFiscalCertificate({ input }: { input: TSyncFiscalCertificateInput }) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	const orgId = session.membership?.organizacao.id;
	if (!orgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");
	if (!session.user.admin && !session.membership?.permissoes.fiscal.configurar) {
		throw new createHttpError.Forbidden("Acesso restrito aos responsáveis pela organização.");
	}

	console.log("[DEBUG] [SYNC_FISCAL_CERTIFICATE] Syncing certificate...", JSON.stringify(input, null, 2));
	const result = await syncFiscalCompanyCertificateSettings({
		organizacaoId: orgId,
		storagePath: input.storagePath,
		password: input.password,
	});

	return {
		data: result,
		message: "Certificado fiscal sincronizado com sucesso.",
	};
}
export type TSyncFiscalCertificateOutput = Awaited<ReturnType<typeof syncFiscalCertificate>>;

async function syncFiscalCertificateRoute(request: NextRequest) {
	const payload = await request.json();
	const input = SyncFiscalCertificateInputSchema.parse(payload);
	const result = await syncFiscalCertificate({ input });
	return NextResponse.json(result);
}

export const POST = appApiHandler({ POST: syncFiscalCertificateRoute });
