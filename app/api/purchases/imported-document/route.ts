import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { downloadPrivateFile } from "@/lib/files-storage/private";
import { buildPurchaseImportedDocumentPath } from "@/lib/purchase/imported-documents";
import { PurchaseImportedDocumentsSnapshotSchema } from "@/schemas/purchases";
import { db } from "@/services/drizzle";
import { purchases } from "@/services/drizzle/schema";
import { and, eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const GetPurchaseImportedDocumentInputSchema = z.object({
	purchaseId: z.string({ required_error: "ID da compra não informado." }),
	referencia: z.string({ required_error: "Referência do documento não informada." }),
});
export type TGetPurchaseImportedDocumentInput = z.infer<typeof GetPurchaseImportedDocumentInputSchema>;

async function getPurchaseImportedDocument(input: TGetPurchaseImportedDocumentInput) {
	const session = await getCurrentSessionUncached();
	if (!session?.membership) throw new createHttpError.Unauthorized("Você não está autenticado.");
	if (!session.membership.permissoes.compras.visualizar) throw new createHttpError.Forbidden("Você não possui permissão para visualizar compras.");
	const purchase = await db.query.purchases.findFirst({
		where: and(eq(purchases.id, input.purchaseId), eq(purchases.organizacaoId, session.membership.organizacao.id)),
		columns: { documentosImportados: true },
	});
	if (!purchase) throw new createHttpError.NotFound("Compra não encontrada.");
	const snapshot = PurchaseImportedDocumentsSnapshotSchema.parse(purchase.documentosImportados ?? { versao: 1, documentos: [] });
	const document = snapshot.documentos.find((candidate) => candidate.referencia === input.referencia);
	if (!document?.arquivo) throw new createHttpError.NotFound("Arquivo importado não encontrado.");
	// O caminho é reconstruído a partir da organização da sessão — nunca lido do snapshot —, então uma
	// referência gravada por um payload malicioso continua confinada à própria organização.
	const data = await downloadPrivateFile(
		buildPurchaseImportedDocumentPath({ organizationId: session.membership.organizacao.id, referencia: document.referencia }),
	);
	return {
		data,
		mimeType: document.arquivo.mimeType ?? "application/octet-stream",
		fileName: document.arquivo.nomeOriginal ?? `documento-${document.referencia}`,
	};
}

async function getPurchaseImportedDocumentRoute(request: NextRequest) {
	const input = GetPurchaseImportedDocumentInputSchema.parse({
		purchaseId: request.nextUrl.searchParams.get("purchaseId") ?? undefined,
		referencia: request.nextUrl.searchParams.get("referencia") ?? undefined,
	});
	const result = await getPurchaseImportedDocument(input);
	return new NextResponse(result.data, {
		headers: {
			"Content-Type": result.mimeType,
			"Content-Disposition": `attachment; filename="${result.fileName.replace(/["\\\r\n]/g, "-")}"`,
			"Cache-Control": "private, no-store",
		},
	});
}

export const GET = appApiHandler({ GET: getPurchaseImportedDocumentRoute });
