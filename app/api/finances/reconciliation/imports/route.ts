import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { ingestStatementLines, parseStatementFile, runStatementMatching, STATEMENT_IMPORT_MAX_FILE_BYTES } from "@/lib/financial-reconciliation";
import { canReconcileFinances, canViewFinances } from "@/lib/permissions/finances";
import { db } from "@/services/drizzle";
import { financialAccounts, financialStatementImports } from "@/services/drizzle/schema";
import { supabaseClient } from "@/services/supabase";
import { and, count, eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

// Processamento síncrono do arquivo (parse + dedup + matching) — mesmo modelo do import de compras.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const CreateStatementImportInputSchema = z.object({
	contaFinanceiraId: z.string({ required_error: "ID da conta financeira não informado." }),
	storagePath: z.string({ required_error: "Caminho do arquivo no storage não informado." }),
	nomeArquivo: z.string({ required_error: "Nome do arquivo não informado." }),
	mimeType: z.string({ required_error: "Tipo do arquivo não informado." }),
	tamanhoBytes: z.number({ invalid_type_error: "Tipo inválido para o tamanho do arquivo." }).optional().nullable(),
});
export type TCreateStatementImportInput = z.infer<typeof CreateStatementImportInputSchema>;

async function createStatementImport({ input, session }: { input: TCreateStatementImportInput; session: TAuthUserSession }) {
	const orgId = session.membership?.organizacao.id;
	if (!orgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const account = await db.query.financialAccounts.findFirst({
		where: and(eq(financialAccounts.id, input.contaFinanceiraId), eq(financialAccounts.organizacaoId, orgId)),
		columns: { id: true },
	});
	if (!account) throw new createHttpError.NotFound("Conta financeira não encontrada para esta organização.");

	const { data: file, error: downloadError } = await supabaseClient.storage.from("files").download(input.storagePath);
	if (downloadError || !file) throw new createHttpError.BadRequest("Não foi possível baixar o arquivo do extrato enviado.");
	const buffer = Buffer.from(await file.arrayBuffer());
	if (buffer.length === 0) throw new createHttpError.BadRequest("O arquivo do extrato está vazio.");
	if (buffer.length > STATEMENT_IMPORT_MAX_FILE_BYTES)
		throw new createHttpError.BadRequest("O arquivo do extrato excede o tamanho máximo suportado (15MB).");

	const [importRow] = await db
		.insert(financialStatementImports)
		.values({
			organizacaoId: orgId,
			contaFinanceiraId: input.contaFinanceiraId,
			origem: "ARQUIVO",
			status: "PROCESSANDO",
			arquivoNome: input.nomeArquivo,
			arquivoStoragePath: input.storagePath,
			arquivoMimeType: input.mimeType,
			arquivoTamanhoBytes: input.tamanhoBytes ?? buffer.length,
			autorId: session.user.id,
		})
		.returning({ id: financialStatementImports.id });

	try {
		const parsed = await parseStatementFile({ fileName: input.nomeArquivo, mimeType: input.mimeType, buffer });
		if (parsed.linhas.length === 0) {
			throw new createHttpError.BadRequest(
				parsed.avisos[0] ?? "Nenhuma transação foi encontrada no arquivo — confira se é um extrato válido (OFX, planilha, PDF ou imagem).",
			);
		}

		const { inseridas, duplicadas } = await ingestStatementLines({
			organizacaoId: orgId,
			contaFinanceiraId: input.contaFinanceiraId,
			importacaoId: importRow.id,
			linhas: parsed.linhas,
		});

		const matching = await runStatementMatching({
			organizacaoId: orgId,
			contaFinanceiraId: input.contaFinanceiraId,
			linhaIds: inseridas.map((linha) => linha.id),
		});

		await db
			.update(financialStatementImports)
			.set({
				status: "PROCESSADO",
				periodoInicio: parsed.periodoInicio,
				periodoFim: parsed.periodoFim,
				saldoInicial: parsed.saldoInicial,
				saldoFinal: parsed.saldoFinal,
			})
			.where(eq(financialStatementImports.id, importRow.id));

		return {
			data: {
				importacaoId: importRow.id,
				formato: parsed.formato,
				importadas: inseridas.length,
				duplicadas,
				sugeridas: matching.sugeridas,
				semCorrespondencia: inseridas.length - matching.sugeridas > 0 ? inseridas.length - matching.sugeridas : 0,
				avisos: parsed.avisos,
			},
			message:
				inseridas.length > 0
					? `Extrato importado: ${inseridas.length} transação(ões) nova(s), ${duplicadas} duplicada(s) ignorada(s).`
					: "Nenhuma transação nova — todas as linhas do extrato já haviam sido importadas.",
		};
	} catch (error) {
		await db
			.update(financialStatementImports)
			.set({ status: "ERRO", erro: error instanceof Error ? error.message : "Erro desconhecido ao processar o extrato." })
			.where(eq(financialStatementImports.id, importRow.id));
		throw error;
	}
}
export type TCreateStatementImportOutput = Awaited<ReturnType<typeof createStatementImport>>;

async function createStatementImportRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session?.membership) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");
	if (!canReconcileFinances(session.membership.permissoes))
		throw new createHttpError.Forbidden("Você não possui permissão para realizar conciliação bancária.");

	const body = await request.json();
	const input = CreateStatementImportInputSchema.parse(body);
	const result = await createStatementImport({ input, session });
	return NextResponse.json(result);
}

export const POST = appApiHandler({ POST: createStatementImportRoute });

const GetStatementImportsInputSchema = z.object({
	contaFinanceiraId: z.string({ invalid_type_error: "Tipo inválido para o ID da conta financeira." }).optional().nullable(),
	page: z.coerce.number().min(1).default(1),
});
export type TGetStatementImportsInput = z.infer<typeof GetStatementImportsInputSchema>;

async function getStatementImports({ input, session }: { input: TGetStatementImportsInput; session: TAuthUserSession }) {
	const orgId = session.membership?.organizacao.id;
	if (!orgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const conditions = [eq(financialStatementImports.organizacaoId, orgId)];
	if (input.contaFinanceiraId) conditions.push(eq(financialStatementImports.contaFinanceiraId, input.contaFinanceiraId));

	const PAGE_SIZE = 25;
	const [countResult, imports] = await Promise.all([
		db
			.select({ count: count() })
			.from(financialStatementImports)
			.where(and(...conditions)),
		db.query.financialStatementImports.findMany({
			where: and(...conditions),
			with: {
				contaFinanceira: { columns: { id: true, nome: true, tipo: true } },
				autor: { columns: { id: true, nome: true, avatarUrl: true } },
			},
			orderBy: (fields, { desc }) => desc(fields.dataInsercao),
			limit: PAGE_SIZE,
			offset: PAGE_SIZE * (input.page - 1),
		}),
	]);

	const importsMatched = countResult[0]?.count ?? 0;
	return {
		data: {
			imports,
			importsMatched,
			totalPages: Math.ceil(importsMatched / PAGE_SIZE),
		},
		message: "Importações de extrato listadas com sucesso.",
	};
}
export type TGetStatementImportsOutput = Awaited<ReturnType<typeof getStatementImports>>;

async function getStatementImportsRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session?.membership) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");
	if (!canViewFinances(session.membership.permissoes))
		throw new createHttpError.Forbidden("Você não possui permissão para acessar o módulo financeiro.");

	const searchParams = request.nextUrl.searchParams;
	const input = GetStatementImportsInputSchema.parse({
		contaFinanceiraId: searchParams.get("contaFinanceiraId") ?? undefined,
		page: searchParams.get("page") ?? 1,
	});
	const result = await getStatementImports({ input, session });
	return NextResponse.json(result);
}

export const GET = appApiHandler({ GET: getStatementImportsRoute });
