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

	const searchParams = request.nextUrl.searchParams;
	const input = GetFiscalDocumentAssetInputSchema.parse({
		documentId: searchParams.get("documentId") ?? undefined,
		asset: searchParams.get("asset") ?? undefined,
	});

	const asset = await getFiscalDocumentAsset({ documentId: input.documentId, asset: input.asset });
	return new NextResponse(asset.buffer, {
		headers: {
			"Content-Type": asset.contentType,
		},
	});
}

export const GET = appApiHandler({ GET: getFiscalDocumentAssetRoute });
