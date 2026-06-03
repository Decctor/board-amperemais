import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { computeSaleFinancialStatus, computeSaleFiscalStatus } from "@/lib/sales/derived-status";
import { db } from "@/services/drizzle";
import { sales } from "@/services/drizzle/schema";
import { and, eq, gte, inArray, or } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";

// ============================================================================
// SERVICE
// ============================================================================

// Etapas operacionais ativas (sempre exibidas no quadro).
const ACTIVE_ATTENDANCE_STATUSES = ["NAO_INICIADO", "EM_PREPARO", "PRONTO", "EM_ENTREGA"] as const;
// Janela para manter pedidos ja ENTREGUES visiveis no quadro (em dias).
const DELIVERED_VISIBILITY_DAYS = 2;

async function getSalesFulfillment({ orgId }: { orgId: string }) {
	const deliveredCutoff = new Date(Date.now() - DELIVERED_VISIBILITY_DAYS * 24 * 60 * 60 * 1000);

	const result = await db.query.sales.findMany({
		where: and(
			eq(sales.organizacaoId, orgId),
			eq(sales.statusVenda, "CONFIRMADA"),
			eq(sales.processamentoOrigem, "INTERNO"),
			or(
				inArray(sales.statusAtendimento, [...ACTIVE_ATTENDANCE_STATUSES]),
				and(eq(sales.statusAtendimento, "ENTREGUE"), gte(sales.dataVenda, deliveredCutoff)),
			),
		),
		columns: {
			id: true,
			idExterno: true,
			valorTotal: true,
			statusVenda: true,
			statusAtendimento: true,
			entregaModalidade: true,
			observacoes: true,
			dataVenda: true,
		},
		with: {
			cliente: { columns: { id: true, nome: true, telefone: true } },
			documentosFiscais: { columns: { statusInterno: true, dataInsercao: true } },
			lancamentosContabeis: {
				columns: { id: true },
				with: {
					transacoesFinanceiras: {
						columns: {
							id: true,
							titulo: true,
							valor: true,
							tipo: true,
							metodo: true,
							contaFinanceiraId: true,
							dataEfetivacao: true,
							dataPrevisao: true,
							provedorStatus: true,
						},
					},
				},
			},
		},
		orderBy: (fields, { asc }) => asc(fields.dataVenda),
	});

	const now = new Date();
	const cards = result.map((sale) => {
		const transactions = sale.lancamentosContabeis.flatMap((entry) => entry.transacoesFinanceiras);
		const paymentNotes =
			transactions
				.find((transaction) => transaction.titulo.includes(" - "))
				?.titulo.split(" - ")
				.slice(1)
				.join(" - ") || null;
		return {
			id: sale.id,
			idExterno: sale.idExterno,
			valorTotal: sale.valorTotal,
			statusVenda: sale.statusVenda,
			statusAtendimento: sale.statusAtendimento,
			entregaModalidade: sale.entregaModalidade,
			observacoes: sale.observacoes,
			dataVenda: sale.dataVenda,
			cliente: sale.cliente,
			financeiro: computeSaleFinancialStatus({ transactions, saleTotal: sale.valorTotal, now }),
			pagamentos: transactions,
			pagamentoObservacoes: paymentNotes === "Venda" || paymentNotes === sale.observacoes ? null : paymentNotes,
			fiscal: computeSaleFiscalStatus({ documents: sale.documentosFiscais }),
		};
	});

	return {
		data: { cards },
		message: "Pedidos de atendimento carregados com sucesso.",
	};
}
export type TGetSalesFulfillmentOutput = Awaited<ReturnType<typeof getSalesFulfillment>>;
export type TSalesFulfillmentCard = TGetSalesFulfillmentOutput["data"]["cards"][number];

// ============================================================================
// HANDLER
// ============================================================================

async function getSalesFulfillmentRoute(_request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	if (!session.membership) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");
	if (!session.membership.organizacao.configuracao.recursos.erp.acesso) {
		throw new createHttpError.Forbidden("Sua organização não possui acesso ao módulo de ERP.");
	}

	const result = await getSalesFulfillment({ orgId: session.membership.organizacao.id });
	return NextResponse.json(result);
}

export const GET = appApiHandler({ GET: getSalesFulfillmentRoute });
