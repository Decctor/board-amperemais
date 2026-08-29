import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { parseStockPositionPdf, parseStockPositionSpreadsheet } from "@/lib/replenishment/stock-position-parser";
import createHttpError from "http-errors";
import { NextResponse, type NextRequest } from "next/server";

// O arquivo é lido em memória e nada é gravado: esta rota devolve o que o parser entendeu para a
// tela conferir. A gravação só acontece depois, quando a compradora confirma o vínculo das colunas.
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;
const MAX_PREVIEW_ROWS = 200;

const SPREADSHEET_EXTENSIONS = [".xlsx", ".xls", ".xlsm", ".csv", ".txt"];

async function parseStockPositionRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	if (!session.membership?.organizacao.id)
		throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");
	if (!session.membership?.permissoes.compras.editar)
		throw new createHttpError.Unauthorized("Você não possui permissão para importar posições de estoque.");

	const formData = await request.formData();
	const file = formData.get("file");
	if (!(file instanceof File)) throw new createHttpError.BadRequest("Nenhum arquivo enviado.");
	if (file.size === 0) throw new createHttpError.BadRequest("O arquivo enviado está vazio.");
	if (file.size > MAX_FILE_SIZE_BYTES) throw new createHttpError.BadRequest("O arquivo excede o limite de 15MB.");

	const fileName = file.name.toLowerCase();
	const buffer = Buffer.from(await file.arrayBuffer());

	const result = fileName.endsWith(".pdf")
		? await parseStockPositionPdf(buffer)
		: SPREADSHEET_EXTENSIONS.some((extension) => fileName.endsWith(extension))
			? parseStockPositionSpreadsheet(buffer)
			: null;

	if (!result) throw new createHttpError.BadRequest("Formato não suportado. Envie um arquivo .xlsx, .xls, .csv ou .pdf.");

	return NextResponse.json({
		data: {
			arquivoNome: file.name,
			origem: result.origem,
			colunas: result.colunas,
			mapeamentoSugerido: result.mapeamentoSugerido,
			avisos: result.avisos,
			totalLinhas: result.linhas.length,
			// A prévia é limitada para não trafegar um relatório de 20 mil linhas até a tela só para
			// a conferência visual — a importação em si recebe o arquivo inteiro de volta.
			linhas: result.linhas.slice(0, MAX_PREVIEW_ROWS),
			linhasCompletas: result.linhas,
		},
		message: "Arquivo lido com sucesso.",
	});
}

export const POST = appApiHandler({ POST: parseStockPositionRoute });
