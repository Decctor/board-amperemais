import { appApiHandler } from "@/lib/app-api";
import { receiveUploadBytes } from "@/lib/files/intake";
import { resolveFileUrl } from "@/lib/files/service";
import createHttpError from "http-errors";
import { NextRequest, NextResponse } from "next/server";

/**
 * Porta same-origin de entrada de bytes do primitivo de uploads (ver lib/files/README.md).
 *
 * A autenticação é o token de upload (Bearer), não sessão: quem faz o PUT costuma ser um agente
 * de IA em ambiente restrito, cuja saída de rede alcança apenas este domínio — nunca o host do
 * provedor de storage. O corpo é o arquivo cru; toda validação (token, janela, tamanho, SHA-256,
 * decodificação completa) acontece em `receiveUploadBytes`.
 */
async function receiveUploadRoute(request: NextRequest) {
	const uploadId = decodeURIComponent(request.nextUrl.pathname.split("/").pop() ?? "");
	if (!uploadId) throw new createHttpError.BadRequest("ID do upload não informado.");
	const authorization = request.headers.get("authorization") ?? "";
	const token = authorization.replace(/^Bearer\s+/i, "").trim();
	if (!token) throw new createHttpError.Unauthorized("Informe o token do upload no cabeçalho Authorization (Bearer <token>).");

	const buffer = Buffer.from(await request.arrayBuffer());
	const { upload, arquivo } = await receiveUploadBytes({ uploadId, token, buffer });
	const url = await resolveFileUrl(arquivo);
	return NextResponse.json({
		data: {
			upload: {
				uploadId: upload.id,
				status: upload.status,
				arquivoId: arquivo.id,
				caminho: arquivo.caminho,
				url,
				mimeType: arquivo.mimeType,
				tamanhoBytes: arquivo.tamanhoBytes,
				sha256: arquivo.sha256,
				metadados: arquivo.metadados,
			},
		},
		message: "Arquivo recebido e validado com sucesso.",
	});
}
export type TReceiveUploadOutput = {
	data: {
		upload: {
			uploadId: string;
			status: string;
			arquivoId: string;
			caminho: string;
			url: string;
			mimeType: string;
			tamanhoBytes: number;
			sha256: string;
			metadados: unknown;
		};
	};
	message: string;
};

export const PUT = appApiHandler({ PUT: receiveUploadRoute });
