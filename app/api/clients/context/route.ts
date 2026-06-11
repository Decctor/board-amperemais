import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { db } from "@/services/drizzle";
import { clients, sales } from "@/services/drizzle/schema";
import { and, count, eq, isNotNull, max, min, sum } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const LAST_PURCHASES_LIMIT = 5;

const GetClientContextInputSchema = z.object({
	clientId: z.string({
		required_error: "ID do cliente não informado.",
		invalid_type_error: "Tipo inválido para ID do cliente.",
	}),
});
export type TGetClientContextInput = z.infer<typeof GetClientContextInputSchema>;

async function getClientContext({ input, session }: { input: TGetClientContextInput; session: TAuthUserSession }) {
	const organizacaoId = session.membership?.organizacao.id;
	if (!organizacaoId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const client = await db.query.clients.findFirst({
		where: and(eq(clients.id, input.clientId), eq(clients.organizacaoId, organizacaoId)),
		columns: {
			id: true,
			nome: true,
			telefone: true,
			email: true,
			localizacaoCidade: true,
			localizacaoEstado: true,
			dataNascimento: true,
			dataInsercao: true,
			canalAquisicao: true,
			analiseRFMTitulo: true,
		},
	});
	if (!client) throw new createHttpError.NotFound("Cliente não encontrado.");

	const saleWhere = and(eq(sales.organizacaoId, organizacaoId), eq(sales.clienteId, input.clientId), isNotNull(sales.dataVenda));

	const summaryRows = await db
		.select({
			qtde: count(sales.id),
			total: sum(sales.valorTotal),
			primeiraCompra: min(sales.dataVenda),
			ultimaCompra: max(sales.dataVenda),
		})
		.from(sales)
		.where(saleWhere);
	const summaryRow = summaryRows[0];

	const qtdeCompras = summaryRow?.qtde ?? 0;
	const valorTotalCompras = summaryRow?.total ? Number(summaryRow.total) : 0;
	const ticketMedio = qtdeCompras > 0 ? valorTotalCompras / qtdeCompras : 0;

	const lastPurchasesRaw = await db.query.sales.findMany({
		where: saleWhere,
		columns: { id: true, dataVenda: true, valorTotal: true },
		with: {
			itens: {
				columns: { id: true, quantidade: true, valorVendaTotalLiquido: true },
				with: {
					produto: { columns: { id: true, nome: true, imagemCapaUrl: true } },
				},
			},
		},
		orderBy: (fields, { desc: descOrder }) => [descOrder(fields.dataVenda)],
		limit: LAST_PURCHASES_LIMIT,
	});

	const lastPurchases = lastPurchasesRaw.map((sale) => ({
		id: sale.id,
		dataVenda: sale.dataVenda,
		valorTotal: sale.valorTotal,
		itens: sale.itens.map((item) => ({
			id: item.id,
			quantidade: item.quantidade,
			valorTotalLiquido: item.valorVendaTotalLiquido,
			produtoId: item.produto?.id ?? null,
			produtoNome: item.produto?.nome ?? "Produto removido",
			produtoImagemUrl: item.produto?.imagemCapaUrl ?? null,
		})),
	}));

	return {
		data: {
			cliente: client,
			historico: {
				qtdeCompras,
				valorTotalCompras,
				ticketMedio,
				primeiraCompraData: summaryRow?.primeiraCompra ?? null,
				ultimaCompraData: summaryRow?.ultimaCompra ?? null,
			},
			ultimasCompras: lastPurchases,
		},
		message: "Contexto do cliente carregado com sucesso.",
	};
}
export type TGetClientContextOutput = Awaited<ReturnType<typeof getClientContext>>;

async function getClientContextRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	if (!session.membership) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");

	const { searchParams } = new URL(request.url);
	const input = GetClientContextInputSchema.parse({
		clientId: searchParams.get("clientId"),
	});
	const result = await getClientContext({ input, session });
	return NextResponse.json(result, { status: 200 });
}

export const GET = appApiHandler({
	GET: getClientContextRoute,
});
