import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { TAuthUserSession } from "@/lib/authentication/types";
import { extractCompositionFromFile, IMPORT_COMPOSITION_ALLOWED_MIME_TYPES } from "@/lib/purchase/import";
import { extractCompositionFromNfeXml } from "@/lib/purchase/import-xml";
import { storePrivateFile } from "@/lib/files-storage/private";
import { matchCompositionItemsToProducts } from "@/lib/purchase/match-products";
import { db } from "@/services/drizzle";
import createHttpError from "http-errors";
import { NextResponse, type NextRequest } from "next/server";
import z from "zod";
import { createHash, randomUUID } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Vision extraction + AI matching can take tens of seconds per file.
export const maxDuration = 120;

// ~3MB of binary content once base64-decoded; keeps the JSON body under the platform's ~4.5MB limit.
const MAX_FILE_BASE64_LENGTH = 4_200_000;

// Divergência tolerada entre a soma das linhas lidas e o total declarado no documento.
const DOCUMENT_TOTAL_MISMATCH_TOLERANCE = 0.05;

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
			invalid_type_error: "Tipo de arquivo não suportado. Envie XML, PDF ou imagem (PNG, JPEG ou WEBP).",
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

	const fileBuffer = Buffer.from(input.file.dataBase64, "base64");
	const contentLooksLikeXml = /^\s*(?:<\?xml\b|<(?:\w+:)?(?:nfeProc|NFe)\b)/i.test(fileBuffer.subarray(0, 512).toString("utf8"));
	const isXml =
		input.file.mimeType === "application/xml" ||
		input.file.mimeType === "text/xml" ||
		input.file.fileName?.toLowerCase().endsWith(".xml") === true ||
		contentLooksLikeXml;
	let extracted: Awaited<ReturnType<typeof extractCompositionFromFile>>;
	try {
		extracted = isXml
			? extractCompositionFromNfeXml(fileBuffer.toString("utf8"))
			: await extractCompositionFromFile({ dataBase64: input.file.dataBase64, mimeType: input.file.mimeType });
	} catch (error) {
		console.error(`[PURCHASE_IMPORT] Erro na extração ${isXml ? "do XML" : "por IA"}.`, error);
		if (isXml)
			throw new createHttpError.UnprocessableEntity(error instanceof Error ? error.message : "Não foi possível interpretar o XML da nota fiscal.");
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

	// Cabeçalho: o total do documento alimenta o lançamento contábil da compra, e a divergência
	// contra a soma das linhas é o sinal de que a leitura pode ter pulado item ou página.
	const somaItensBase = roundToCents(itens.reduce((total, item) => total + item.quantidade * item.valorUnitario - (item.desconto ?? 0), 0));
	const somaItens =
		extracted.origem === "XML"
			? roundToCents(
					itens.reduce(
						(total, item) =>
							total +
							item.valorTotal +
							(item.modificadoresCusto ?? []).reduce(
								(modifierTotal, modifier) => modifierTotal + (modifier.efeito === "REDUCAO" ? -1 : 1) * (modifier.valorCentavos / 100),
								0,
							),
						0,
					),
				)
			: somaItensBase;
	const valorTotalDocumento = extracted.valorTotalDocumento && extracted.valorTotalDocumento > 0 ? roundToCents(extracted.valorTotalDocumento) : null;
	const valorFrete = extracted.valorFrete && extracted.valorFrete > 0 ? roundToCents(extracted.valorFrete) : null;
	const valorDesconto = extracted.valorDesconto && extracted.valorDesconto > 0 ? roundToCents(extracted.valorDesconto) : null;
	const dataEmissao = parseIsoDate(extracted.dataEmissao);

	const avisos: string[] = [];
	if (valorTotalDocumento !== null) {
		// Frete e desconto gerais não são itens: entram na conta antes de comparar.
		const esperado = extracted.origem === "XML" ? somaItens : roundToCents(somaItens + (valorFrete ?? 0) - (valorDesconto ?? 0));
		if (Math.abs(esperado - valorTotalDocumento) > DOCUMENT_TOTAL_MISMATCH_TOLERANCE)
			avisos.push(
				`A soma dos itens lidos (R$ ${esperado.toFixed(2)}) diverge do total declarado no documento (R$ ${valorTotalDocumento.toFixed(2)}). A leitura pode estar incompleta.`,
			);
	} else {
		avisos.push("O documento não declara um valor total legível. Confira o valor efetivo da compra antes de salvar.");
	}
	if (valorFrete !== null && extracted.origem !== "XML")
		avisos.push(`O documento destaca R$ ${valorFrete.toFixed(2)} de frete, que entra no valor total mas não aparece como item da composição.`);
	const impostosPendentes = extracted.itens.reduce(
		(total, item) => total + (item.modificadoresCusto ?? []).filter((modifier) => modifier.tratamento === null).length,
		0,
	);
	if (impostosPendentes > 0)
		avisos.push(
			`${impostosPendentes} ${impostosPendentes === 1 ? "imposto exige" : "impostos exigem"} revisão do tratamento contábil antes de adicionar os itens.`,
		);

	const documentReference = randomUUID();
	const safeFileName = (input.file.fileName?.split(/[\\/]/).pop() || `documento-${documentReference}`)
		.normalize("NFKD")
		.replace(/[^a-zA-Z0-9._-]+/g, "-")
		.slice(0, 120);
	const privatePath = await storePrivateFile({
		path: `organizations/${userOrgId}/purchase-imports/${documentReference}/${safeFileName}`,
		data: fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength),
		contentType: input.file.mimeType,
	});
	const importedDocumentOrigin: "XML" | "PDF" | "IMAGEM" =
		extracted.origem === "XML" ? "XML" : input.file.mimeType === "application/pdf" ? "PDF" : "IMAGEM";

	return {
		data: {
			fornecedor: {
				existente: existingSupplier,
				extraido: extracted.fornecedor ? { nome: extracted.fornecedor.nome, cnpj: extractedCnpj || null } : null,
			},
			documento: {
				origem: extracted.origem ?? "IA",
				numero: extracted.numeroDocumento?.trim() || null,
				serie: extracted.serieDocumento?.trim() || null,
				chaveAcesso: extracted.chaveAcesso?.trim() || null,
				dataEmissao,
				valorTotal: valorTotalDocumento,
				valorFrete,
				valorDesconto,
				somaItens,
				totaisOriginais: extracted.totaisOriginais ?? null,
				importado: {
					referencia: documentReference,
					origem: importedDocumentOrigin,
					chaveAcesso: extracted.chaveAcesso?.trim() || null,
					numero: extracted.numeroDocumento?.trim() || null,
					serie: extracted.serieDocumento?.trim() || null,
					dataEmissao: extracted.dataEmissao ?? null,
					arquivo: {
						bucket: process.env.SUPABASE_PRIVATE_FILES_BUCKET ?? "private-files",
						caminho: privatePath,
						sha256: createHash("sha256").update(fileBuffer).digest("hex"),
						mimeType: input.file.mimeType,
						tamanhoBytes: fileBuffer.byteLength,
					},
					totaisOriginais: extracted.totaisOriginais ?? null,
				},
			},
			itens,
			avisos,
		},
		message: `${itens.length} ${itens.length === 1 ? "item identificado" : "itens identificados"} no documento.`,
	};
}

function roundToCents(value: number) {
	return Math.round(value * 100) / 100;
}

function parseIsoDate(value?: string | null) {
	if (!value) return null;
	const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
	if (!match) return null;
	const parsed = new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00.000Z`);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
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
