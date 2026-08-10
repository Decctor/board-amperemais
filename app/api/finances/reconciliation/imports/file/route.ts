import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { downloadPrivateFile } from "@/lib/files-storage/private";
import { canViewFinances } from "@/lib/permissions/finances";
import { db } from "@/services/drizzle";
import { financialStatementImports } from "@/services/drizzle/schema";
import { and, eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const GetStatementImportFileInputSchema = z.object({ importId: z.string({ required_error: "ID da importação não informado." }) });

async function getStatementImportFile(input: z.infer<typeof GetStatementImportFileInputSchema>) {
	const session = await getCurrentSessionUncached();
	if (!session?.membership) throw new createHttpError.Unauthorized("Você não está autenticado.");
	if (!canViewFinances(session.membership.permissoes))
		throw new createHttpError.Forbidden("Você não possui permissão para acessar o módulo financeiro.");
	const statementImport = await db.query.financialStatementImports.findFirst({
		where: and(eq(financialStatementImports.id, input.importId), eq(financialStatementImports.organizacaoId, session.membership.organizacao.id)),
		columns: { arquivoStoragePath: true, arquivoMimeType: true, arquivoNome: true },
	});
	if (!statementImport?.arquivoStoragePath) throw new createHttpError.NotFound("Arquivo do extrato não encontrado.");
	return {
		data: await downloadPrivateFile(statementImport.arquivoStoragePath),
		mimeType: statementImport.arquivoMimeType ?? "application/octet-stream",
		fileName: statementImport.arquivoNome ?? "extrato",
	};
}

async function getStatementImportFileRoute(request: NextRequest) {
	const input = GetStatementImportFileInputSchema.parse({ importId: request.nextUrl.searchParams.get("importId") ?? undefined });
	const result = await getStatementImportFile(input);
	return new NextResponse(result.data, {
		headers: {
			"Content-Type": result.mimeType,
			"Content-Disposition": `attachment; filename="${result.fileName.replace(/["\\\r\n]/g, "-")}"`,
			"Cache-Control": "private, no-store",
		},
	});
}

export const GET = appApiHandler({ GET: getStatementImportFileRoute });
