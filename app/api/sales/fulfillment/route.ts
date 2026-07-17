import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { getChannelErpPolicy, type TChannelErpPolicy } from "@/lib/sales/fulfillment-channels";
import { mapSaleRowToFulfillmentCard } from "@/lib/sales/sale-processing/map-sale-to-fulfillment-card";
import { processSaleFulfillmentCorrection } from "@/lib/sales/sale-processing/process-sale-fulfillment-correction";
import { DeliveryModeEnum, PaymentMethodEnum } from "@/schemas/enums";
import { db } from "@/services/drizzle";
import { sales } from "@/services/drizzle/schema";
import { and, desc, eq, gte, inArray, isNull, or } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

// ============================================================================
// CONSTANTS
// ============================================================================

const ACTIVE_ATTENDANCE_STATUSES = ["NAO_INICIADO", "EM_PREPARO", "PRONTO", "EM_ENTREGA"] as const;
const DELIVERED_VISIBILITY_DAYS = 2;

const SALE_FULFILLMENT_WITH = {
	cliente: { columns: { id: true, nome: true, telefone: true } },
	documentosFiscais: { columns: { statusInterno: true, dataInsercao: true } },
	lancamentosContabeis: {
		columns: { id: true },
		with: {
			transacoesFinanceiras: {
				columns: {
					id: true,
					lancamentoContabilId: true,
					titulo: true,
					valor: true,
					tipo: true,
					metodo: true,
					contaFinanceiraId: true,
					parcela: true,
					totalParcelas: true,
					dataEfetivacao: true,
					dataPrevisao: true,
					provedorStatus: true,
				},
			},
		},
	},
} as const;

// ============================================================================
// INPUT SCHEMA
// ============================================================================

const PatchSalesFulfillmentEntregaSchema = z.object({
	modalidade: DeliveryModeEnum,
	comandaNumero: z.string({ invalid_type_error: "Tipo inválido para número da comanda." }).optional().nullable(),
});

const PatchSalesFulfillmentPagamentoSchema = z.object({
	transacaoId: z.string({ required_error: "ID da transação não informado." }),
	metodo: PaymentMethodEnum,
});

const PatchSalesFulfillmentInputSchema = z
	.object({
		id: z.string({ required_error: "ID da venda não informado." }),
		entrega: PatchSalesFulfillmentEntregaSchema.optional(),
		pagamento: PatchSalesFulfillmentPagamentoSchema.optional(),
	})
	.superRefine((value, ctx) => {
		const hasEntrega = value.entrega != null;
		const hasPagamento = value.pagamento != null;
		if (hasEntrega === hasPagamento) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Informe entrega ou pagamento.",
			});
		}
	});

export type TPatchSalesFulfillmentInput = z.infer<typeof PatchSalesFulfillmentInputSchema>;

// ============================================================================
// GET SERVICE
// ============================================================================

const PENDING_CONFIRMATION_VISIBILITY_HOURS = 24;

async function getSalesFulfillment({ orgId, policy }: { orgId: string; policy: TChannelErpPolicy }) {
	const deliveredCutoff = new Date(Date.now() - DELIVERED_VISIBILITY_DAYS * 24 * 60 * 60 * 1000);
	const attendanceVisibilityFilter = or(
		inArray(sales.statusAtendimento, [...ACTIVE_ATTENDANCE_STATUSES]),
		and(eq(sales.statusAtendimento, "ENTREGUE"), gte(sales.dataVenda, deliveredCutoff)),
	);

	const result = await db.query.sales.findMany({
		where: and(
			eq(sales.organizacaoId, orgId),
			eq(sales.statusVenda, "CONFIRMADA"),
			attendanceVisibilityFilter,
			// Vendas internas sempre; vendas de canais gerenciados (ex.: iFood) quando a política
			// de fulfillment de integrações está ligada.
			policy.fulfillment
				? or(eq(sales.processamentoOrigem, "INTERNO"), and(eq(sales.processamentoOrigem, "EXTERNO"), eq(sales.modelo, "IFOOD")))
				: eq(sales.processamentoOrigem, "INTERNO"),
		),
		columns: {
			id: true,
			idExterno: true,
			valorTotal: true,
			statusVenda: true,
			statusAtendimento: true,
			entregaModalidade: true,
			comandaNumero: true,
			clienteId: true,
			observacoes: true,
			dataVenda: true,
			modelo: true,
			processamentoOrigem: true,
		},
		with: SALE_FULFILLMENT_WITH,
		orderBy: (fields, { asc }) => asc(fields.dataVenda),
	});

	const cards = result.map((sale) => mapSaleRowToFulfillmentCard(sale));

	// Fila de pedidos a confirmar: pedidos de canal gerenciado ainda não confirmados no canal
	// (iFood PLACED: statusVenda nulo + atendimento NAO_INICIADO). SLA de confirmação: 8 minutos.
	const pendingConfirmationCutoff = new Date(Date.now() - PENDING_CONFIRMATION_VISIBILITY_HOURS * 60 * 60 * 1000);
	const pendingConfirmation = policy.fulfillment
		? (
				await db.query.sales.findMany({
					where: and(
						eq(sales.organizacaoId, orgId),
						eq(sales.processamentoOrigem, "EXTERNO"),
						eq(sales.modelo, "IFOOD"),
						isNull(sales.statusVenda),
						eq(sales.statusAtendimento, "NAO_INICIADO"),
						gte(sales.dataVenda, pendingConfirmationCutoff),
					),
					columns: {
						id: true,
						idExterno: true,
						documento: true,
						valorTotal: true,
						entregaModalidade: true,
						observacoes: true,
						dataVenda: true,
					},
					with: {
						cliente: { columns: { id: true, nome: true, telefone: true } },
						itens: { columns: { id: true } },
					},
					orderBy: desc(sales.dataVenda),
				})
			).map((sale) => ({
				vendaId: sale.id,
				orderId: sale.idExterno,
				displayId: sale.documento,
				valorTotal: sale.valorTotal,
				entregaModalidade: sale.entregaModalidade,
				observacoes: sale.observacoes,
				dataVenda: sale.dataVenda,
				cliente: sale.cliente,
				quantidadeItens: sale.itens.length,
				canal: "IFOOD" as const,
			}))
		: [];

	return {
		data: { cards, pendingConfirmation },
		message: "Pedidos de atendimento carregados com sucesso.",
	};
}

export type TGetSalesFulfillmentOutput = Awaited<ReturnType<typeof getSalesFulfillment>>;
export type TSalesFulfillmentCard = TGetSalesFulfillmentOutput["data"]["cards"][number];

// ============================================================================
// PATCH SERVICE
// ============================================================================

async function patchSalesFulfillment({ input, orgId }: { input: TPatchSalesFulfillmentInput; orgId: string }) {
	const organization = await db.query.organizations.findFirst({
		where: (fields, { eq }) => eq(fields.id, orgId),
	});
	if (!organization) throw new createHttpError.NotFound("Organização não encontrada.");

	const result = await processSaleFulfillmentCorrection(
		input.entrega
			? {
					organization,
					saleId: input.id,
					entrega: input.entrega,
				}
			: {
					organization,
					saleId: input.id,
					pagamento: input.pagamento!,
				},
	);

	return {
		data: { card: result.card },
		message: result.message,
	};
}

export type TPatchSalesFulfillmentOutput = Awaited<ReturnType<typeof patchSalesFulfillment>>;

// ============================================================================
// HANDLERS
// ============================================================================

async function getSalesFulfillmentRoute(_request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	if (!session.membership) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");
	if (!session.membership.organizacao.configuracao.recursos.erp.acesso) {
		throw new createHttpError.Forbidden("Sua organização não possui acesso ao módulo de ERP.");
	}

	const policy = getChannelErpPolicy(session.membership.organizacao.configuracao);
	const result = await getSalesFulfillment({ orgId: session.membership.organizacao.id, policy });
	return NextResponse.json(result);
}

async function patchSalesFulfillmentRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	if (!session.membership) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");
	if (!session.membership.organizacao.configuracao.recursos.erp.acesso) {
		throw new createHttpError.Forbidden("Sua organização não possui acesso ao módulo de ERP.");
	}

	const body = await request.json();
	const input = PatchSalesFulfillmentInputSchema.parse(body);
	const result = await patchSalesFulfillment({ input, orgId: session.membership.organizacao.id });
	return NextResponse.json(result);
}

export const GET = appApiHandler({ GET: getSalesFulfillmentRoute });
export const PATCH = appApiHandler({ PATCH: patchSalesFulfillmentRoute });
