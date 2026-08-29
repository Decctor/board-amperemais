import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { getReplenishmentAnalysis } from "@/lib/replenishment/get-replenishment-analysis";
import { buildQuotationSpreadsheetBuffer } from "@/lib/replenishment/quotation-spreadsheet";
import createHttpError from "http-errors";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { buildReplenishmentAnalysisInput, parseReplenishmentSearchParams, resolveReplenishmentContext } from "../route";

// Teto de linhas de uma cotação. Acima disso a planilha deixa de ser negociável — e o pedido de
// compra que sai dela também. É um limite de produto, não de tecnologia.
const MAX_EXPORT_ROWS = 2000;

const ExportReplenishmentInputSchema = z.object({
	fornecedores: z
		.array(z.string({ invalid_type_error: "Tipo não válido para fornecedor." }), { invalid_type_error: "Tipo não válido para fornecedores." })
		.max(8, { message: "A cotação comporta no máximo 8 fornecedores." })
		.optional()
		.nullable()
		.transform((value) => (value ?? []).map((nome) => nome.trim()).filter(Boolean)),
	produtoIds: z
		.array(z.string({ invalid_type_error: "Tipo não válido para produto." }), { invalid_type_error: "Tipo não válido para produtos." })
		.optional()
		.nullable()
		.transform((value) => value ?? []),
	// Quantidades revisadas na tela antes de exportar. A compradora quase sempre ajusta a sugestão
	// antes de mandar para o fornecedor, e é a quantidade dela que precisa sair na planilha.
	quantidades: z
		.record(z.string(), z.number({ invalid_type_error: "Tipo não válido para quantidade." }))
		.optional()
		.nullable()
		.transform((value) => value ?? {}),
});
export type TExportReplenishmentInput = z.infer<typeof ExportReplenishmentInputSchema>;

async function exportReplenishmentRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");

	const filters = parseReplenishmentSearchParams(request.nextUrl.searchParams);
	const body = ExportReplenishmentInputSchema.parse(await request.json().catch(() => ({})));
	const { organizationId, settings } = await resolveReplenishmentContext({ input: filters, session });

	const analysis = await getReplenishmentAnalysis({
		input: {
			...buildReplenishmentAnalysisInput(filters, null),
			// A seleção manual da tela vence os filtros: se ela marcou 40 itens, a planilha tem 40.
			productIds: body.produtoIds.length > 0 ? body.produtoIds : filters.productIds,
		},
		organizationId,
		settings,
	});

	if (analysis.items.length === 0) throw new createHttpError.BadRequest("Nenhum produto no filtro atual para exportar.");
	if (analysis.items.length > MAX_EXPORT_ROWS) {
		throw new createHttpError.BadRequest(
			`A cotação ficou com ${analysis.items.length} itens. Refine os filtros (fornecedor, grupo ou cobertura) para no máximo ${MAX_EXPORT_ROWS} linhas.`,
		);
	}

	const items = analysis.items.map((item) => {
		const quantidadeRevisada = body.quantidades[item.produtoId];
		if (quantidadeRevisada == null || !Number.isFinite(quantidadeRevisada)) return item;
		return { ...item, plano: { ...item.plano, quantidadeSugerida: Math.max(quantidadeRevisada, 0) } };
	});

	const buffer = buildQuotationSpreadsheetBuffer({
		items,
		resumo: analysis.resumo,
		settings,
		periodo: analysis.periodo,
		fornecedores: body.fornecedores,
	});

	const fileName = `cotacao-reposicao-${new Date().toISOString().slice(0, 10)}.xlsx`;
	return new NextResponse(new Uint8Array(buffer), {
		status: 200,
		headers: {
			"Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			"Content-Disposition": `attachment; filename="${fileName}"`,
			"Cache-Control": "no-store",
		},
	});
}

export const POST = appApiHandler({ POST: exportReplenishmentRoute });
