import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { TAuthUserSession } from "@/lib/authentication/types";
import { extractCompositionFromFile, IMPORT_COMPOSITION_ALLOWED_MIME_TYPES } from "@/lib/purchase/import";
import { matchCompositionItemsToProducts } from "@/lib/purchase/match-products";
import { db } from "@/services/drizzle";
import createHttpError from "http-errors";
import { NextResponse, type NextRequest } from "next/server";
import z from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Vision extraction + AI matching can take tens of seconds per file.
export const maxDuration = 120;

// ~3MB of binary content once base64-decoded; keeps the JSON body under the platform's ~4.5MB limit.
const MAX_FILE_BASE64_LENGTH = 4_200_000;

const ImportPurchaseCompositionInputSchema = z.object({
	file: z.object({
		dataBase64: z
			.string({
				required_error: "Arquivo não informado.",
				invalid_type_error: "Tipo não válido para o arquivo.",
			})
			.min(1, "Arquivo não informado.")
			.max(MAX_FILE_BASE64_LENGTH, "Arquivo muito grande. O limite é de aproximadamente 3MB por arquivo."),
		mimeType: z.enum(IMPORT_COMPOSITION_ALLOWED_MIME_TYPES, {
			required_error: "Tipo do arquivo não informado.",
			invalid_type_error: "Tipo de arquivo não suportado. Envie um PDF ou uma imagem (PNG, JPEG ou WEBP).",
		}),
		fileName: z.string({ invalid_type_error: "Tipo não válido para o nome do arquivo." }).optional().nullable(),
	}),
});
export type TImportPurchaseCompositionInput = z.infer<typeof ImportPurchaseCompositionInputSchema>;

async function importPurchaseComposition({ input, session }: { input: TImportPurchaseCompositionInput; session: TAuthUserSession }) {
	const userOrgId = session.membership?.organizacao.id;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	if (!session.membership?.permissoes.compras.criar && !session.membership?.permissoes.compras.editar)
		throw new createHttpError.Unauthorized("Você não possui permissão para acessar esse recurso.");

	let extracted: Awaited<ReturnType<typeof extractCompositionFromFile>>;
	try {
		extracted = await extractCompositionFromFile({ dataBase64: input.file.dataBase64, mimeType: input.file.mimeType });
	} catch (error) {
		console.error("[PURCHASE_IMPORT] Erro na extração por IA.", error);
		throw new createHttpError.BadGateway("Não foi possível ler o documento. Tente novamente ou envie um arquivo mais legível.");
	}

	if (extracted.itens.length === 0)
		throw new createHttpError.UnprocessableEntity(
			"Nenhum item foi identificado no documento. Verifique se o arquivo é uma nota/cupom de compra legível.",
		);

	// Supplier resolution is lookup-only here: creation happens on review confirm (POST /api/suppliers),
	// so cancelling the review never leaves an orphan supplier behind.
	const extractedCnpj = (extracted.fornecedor?.cnpj ?? "").replace(/\D/g, "");
	const existingSupplier = extractedCnpj
		? ((await db.query.suppliers.findFirst({
				where: (fields, { and, eq }) => and(eq(fields.organizacaoId, userOrgId), eq(fields.cpfCnpj, extractedCnpj)),
				columns: { id: true, nome: true, cpfCnpj: true, telefone: true, email: true },
			})) ?? null)
		: null;

	const itens = await matchCompositionItemsToProducts({
		organizacaoId: userOrgId,
		fornecedorId: existingSupplier?.id ?? null,
		itens: extracted.itens,
	});

	return {
		data: {
			fornecedor: {
				existente: existingSupplier,
				extraido: extracted.fornecedor
					? { nome: extracted.fornecedor.nome, cnpj: extractedCnpj || null }
					: null,
			},
			itens,
		},
		message: `${itens.length} ${itens.length === 1 ? "item identificado" : "itens identificados"} no documento.`,
	};
}
export type TImportPurchaseCompositionOutput = Awaited<ReturnType<typeof importPurchaseComposition>>;

async function importPurchaseCompositionRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	const body = await request.json();
	const input = ImportPurchaseCompositionInputSchema.parse(body);
	const result = await importPurchaseComposition({ input, session });
	return NextResponse.json(result);
}

export const POST = appApiHandler({
	POST: importPurchaseCompositionRoute,
});
