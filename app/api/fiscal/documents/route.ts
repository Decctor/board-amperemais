import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { emitFiscalDocument, getFiscalDocumentById, listFiscalDocumentEvents, listFiscalDocuments } from "@/lib/fiscal/documents";
import { FiscalDocumentTypeEnum } from "@/schemas/enums";
import { db } from "@/services/drizzle";
import createHttpError from "http-errors";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";

async function requireOrgSession() {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	const orgId = session.membership?.organizacao.id;
	if (!orgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");
	return { session, orgId };
}

const GetFiscalDocumentsInputSchema = z.object({
	documentId: z.string().optional().nullable(),
	page: z.coerce.number().min(1).default(1),
	search: z.string().optional().nullable(),
	statusInterno: z
		.string()
		.optional()
		.nullable()
		.transform((value) => (value ? value.split(",").filter(Boolean) : [])),
});
export type TGetFiscalDocumentsInput = z.infer<typeof GetFiscalDocumentsInputSchema>;

async function getFiscalDocuments({ input }: { input: TGetFiscalDocumentsInput }) {
	const { session, orgId } = await requireOrgSession();

	const userHasFiscalViewPermission = session.membership?.permissoes.fiscal.visualizar;
	if (!userHasFiscalViewPermission) throw new createHttpError.Forbidden("Oops, você não possui permissão para visualizar o módulo fiscal.");

	if (input.documentId) {
		const document = await getFiscalDocumentById({ documentId: input.documentId, organizationId: orgId });
		if (!document || document.organizacaoId !== orgId) throw new createHttpError.NotFound("Documento fiscal não encontrado.");
		const events = await listFiscalDocumentEvents({ documentId: document.id, organizationId: orgId });
		return {
			data: {
				byId: {
					document,
					events,
				},
				default: null,
			},
			message: "Documento fiscal encontrado com sucesso.",
		};
	}

	const result = await listFiscalDocuments({ organizacaoId: orgId, page: input.page, search: input.search, statusInterno: input.statusInterno });
	return {
		data: {
			byId: null,
			default: result,
		},
		message: "Documentos fiscais encontrados com sucesso.",
	};
}
export type TGetFiscalDocumentsOutput = Awaited<ReturnType<typeof getFiscalDocuments>>;
export type TGetFiscalDocumentsOutputById = NonNullable<TGetFiscalDocumentsOutput["data"]["byId"]>;
export type TGetFiscalDocumentsOutputDefault = NonNullable<TGetFiscalDocumentsOutput["data"]["default"]>;
async function getFiscalDocumentsRoute(request: NextRequest) {
	const searchParams = request.nextUrl.searchParams;
	const input = GetFiscalDocumentsInputSchema.parse({
		documentId: searchParams.get("documentId") ?? undefined,
		page: searchParams.get("page") ?? 1,
		search: searchParams.get("search") ?? undefined,
		statusInterno: searchParams.get("statusInterno") ?? undefined,
	});
	const result = await getFiscalDocuments({ input });
	return NextResponse.json(result);
}

const EmitFiscalDocumentInputSchema = z.object({
	vendaId: z.string({
		required_error: "ID da venda não informado.",
		invalid_type_error: "Tipo não válido para o ID da venda.",
	}),
	tipo: FiscalDocumentTypeEnum.extract(["NFCE", "NFE"]),
});
export type TEmitFiscalDocumentInput = z.infer<typeof EmitFiscalDocumentInputSchema>;

async function createFiscalDocument({ input }: { input: TEmitFiscalDocumentInput }) {
	const { session, orgId } = await requireOrgSession();
	const userHasFiscalEmitPermission = session.membership?.permissoes.fiscal.emitir;
	if (!userHasFiscalEmitPermission) throw new createHttpError.Forbidden("Oops, você não possui permissão para emitir documentos fiscais.");

	const saleBelongsToOrg = await db.query.sales.findFirst({
		where: (fields, { and, eq }) => and(eq(fields.id, input.vendaId), eq(fields.organizacaoId, orgId)),
	});
	if (!saleBelongsToOrg) throw new createHttpError.NotFound("Venda não encontrada para emissão fiscal.");

	const result = await emitFiscalDocument({
		vendaId: input.vendaId,
		tipo: input.tipo,
		organizacaoId: orgId,
		autorId: session.user.id,
		origem: "MANUAL",
	});
	return {
		data: result,
		message: "Documento fiscal emitido com sucesso.",
	};
}
export type TCreateFiscalDocumentOutput = Awaited<ReturnType<typeof createFiscalDocument>>;

async function createFiscalDocumentRoute(request: NextRequest) {
	const payload = await request.json();
	const input = EmitFiscalDocumentInputSchema.parse(payload);
	const result = await createFiscalDocument({ input });
	return NextResponse.json(result);
}

export const GET = appApiHandler({ GET: getFiscalDocumentsRoute });
export const POST = appApiHandler({ POST: createFiscalDocumentRoute });
