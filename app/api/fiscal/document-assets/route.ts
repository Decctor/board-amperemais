import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { getFiscalDocumentAsset } from "@/lib/fiscal/documents";
import createHttpError from "http-errors";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";

const GetFiscalDocumentAssetInputSchema = z.object({
	documentId: z.string({
		required_error: "ID do documento fiscal não informado.",
		invalid_type_error: "Tipo não válido para o ID do documento fiscal.",
	}),
	asset: z.enum(["xml", "pdf"], {
		required_error: "Asset não informado.",
		invalid_type_error: "Tipo não válido para o asset.",
	}),
});

async function getFiscalDocumentAssetRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	const sessionMembership = session.membership;
	if (!sessionMembership) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");

	const userHasFiscalDocumentAssetPermission = sessionMembership.permissoes.fiscal.visualizar;
	if (!userHasFiscalDocumentAssetPermission) throw new createHttpError.Forbidden("Você não possui permissão para visualizar documentos fiscais.");

	const searchParams = request.nextUrl.searchParams;
	const input = GetFiscalDocumentAssetInputSchema.parse({
		documentId: searchParams.get("documentId") ?? undefined,
		asset: searchParams.get("asset") ?? undefined,
	});

	const asset = await getFiscalDocumentAsset({ organizationId: sessionMembership.organizacao.id, documentId: input.documentId, asset: input.asset });

	// Os dois arquivos têm destinos opostos. O XML existe para ser entregue ao contador ou
	// importado em outro sistema: o destino dele é o disco, e o navegador renderizando árvore XML
	// só atrapalha. A DANFE existe para ser olhada — o visualizador do navegador já traz download e
	// impressão, então `inline` é um superconjunto de `attachment` do ponto de vista do usuário.
	// O `filename` vale nos dois casos: em `inline` é o nome que o visualizador sugere ao baixar.
	const disposition = input.asset === "xml" ? "attachment" : "inline";
	return new NextResponse(asset.buffer, {
		headers: {
			"Content-Type": asset.contentType,
			"Content-Disposition": `${disposition}; filename="${asset.fileName}"`,
			// Documento fiscal de tenant não deve repousar em cache de navegador ou intermediário.
			"Cache-Control": "private, no-store",
		},
	});
}

export const GET = appApiHandler({ GET: getFiscalDocumentAssetRoute });
