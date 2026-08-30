import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { getFileById, resolveFileUrl } from "@/lib/files/service";
import createHttpError from "http-errors";
import { NextRequest, NextResponse } from "next/server";

/**
 * URL estável de um arquivo do catálogo (ver lib/files/README.md): redireciona para a URL do
 * provedor resolvida NO MOMENTO da leitura. É a forma de URL que deve sair do nosso controle
 * (mensagens enviadas, e-mails): sobrevive a troca de provedor porque nada além da linha de
 * `files` sabe onde os bytes vivem.
 */
async function getFileRoute(request: NextRequest) {
	const arquivoId = decodeURIComponent(request.nextUrl.pathname.split("/").pop() ?? "");
	if (!arquivoId) throw new createHttpError.BadRequest("ID do arquivo não informado.");
	const file = await getFileById({ arquivoId });
	if (file.visibilidade === "PRIVADO") {
		const session = await getCurrentSessionUncached();
		if (!session || session.membership?.organizacao.id !== file.organizacaoId) {
			throw new createHttpError.Forbidden("Você não tem acesso a este arquivo.");
		}
	}
	const url = await resolveFileUrl(file, { expiraEmSegundos: 5 * 60 });
	return NextResponse.redirect(url, 302);
}

export const GET = appApiHandler({ GET: getFileRoute });
