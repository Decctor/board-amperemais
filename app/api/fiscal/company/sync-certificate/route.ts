import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { syncFiscalCompanyCertificate as syncFiscalCompanyCertificateSettings } from "@/lib/fiscal/settings";
import createHttpError from "http-errors";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
const MAX_CERTIFICATE_SIZE_BYTES = 5 * 1024 * 1024;
const CERTIFICATE_FILE_EXTENSION = /\.(?:p12|pfx)$/i;

export type TSyncFiscalCertificateInput = { file: File; password: string };

async function syncFiscalCertificate({ input }: { input: TSyncFiscalCertificateInput }) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	const orgId = session.membership?.organizacao.id;
	if (!orgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");
	if (!session.user.admin && !session.membership?.permissoes.fiscal.configurar)
		throw new createHttpError.Forbidden("Acesso restrito aos responsáveis pela organização.");

	if (!(input.file instanceof File)) throw new createHttpError.BadRequest("Certificado não informado.");
	if (!CERTIFICATE_FILE_EXTENSION.test(input.file.name)) throw new createHttpError.BadRequest("Envie um certificado no formato .p12 ou .pfx.");
	if (input.file.size <= 0 || input.file.size > MAX_CERTIFICATE_SIZE_BYTES)
		throw new createHttpError.BadRequest("O certificado deve ter no máximo 5 MB.");
	if (!input.password.trim()) throw new createHttpError.BadRequest("Senha do certificado não informada.");

	// The bytes exist only in this request and the provider upload; neither certificate nor password is persisted.
	const result = await syncFiscalCompanyCertificateSettings({
		organizacaoId: orgId,
		certificate: await input.file.arrayBuffer(),
		fileName: input.file.name,
		password: input.password,
	});

	return { data: result, message: "Certificado fiscal sincronizado com sucesso." };
}
export type TSyncFiscalCertificateOutput = Awaited<ReturnType<typeof syncFiscalCertificate>>;

async function syncFiscalCertificateRoute(request: NextRequest) {
	const formData = await request.formData();
	const file = formData.get("file");
	const password = formData.get("password");
	if (!(file instanceof File)) throw new createHttpError.BadRequest("Certificado não informado.");
	const result = await syncFiscalCertificate({
		input: {
			file,
			password: typeof password === "string" ? password : "",
		},
	});
	return NextResponse.json(result);
}

export const POST = appApiHandler({ POST: syncFiscalCertificateRoute });
