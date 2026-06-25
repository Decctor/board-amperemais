import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { mapSaleRowToFulfillmentCard } from "@/lib/sales/sale-processing/map-sale-to-fulfillment-card";
import { processSaleFulfillmentCorrection } from "@/lib/sales/sale-processing/process-sale-fulfillment-correction";
import { DeliveryModeEnum, PaymentMethodEnum } from "@/schemas/enums";
import { db } from "@/services/drizzle";
import { sales } from "@/services/drizzle/schema";
import { and, eq, gte, inArray, or } from "drizzle-orm";
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
	comandaNumero: z
		.string({ invalid_type_error: "Tipo inválido para número da comanda." })
		.optional()
		.nullable(),
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
			comandaNumero: true,
			clienteId: true,
			observacoes: true,
			dataVenda: true,
		},
		with: SALE_FULFILLMENT_WITH,
		orderBy: (fields, { asc }) => asc(fields.dataVenda),
	});

	const cards = result.map((sale) => mapSaleRowToFulfillmentCard(sale));

	return {
		data: { cards },
		message: "Pedidos de atendimento carregados com sucesso.",
	};
}

export type TGetSalesFulfillmentOutput = Awaited<ReturnType<typeof getSalesFulfillment>>;
export type TSalesFulfillmentCard = TGetSalesFulfillmentOutput["data"]["cards"][number];

// ============================================================================
// PATCH SERVICE
// ============================================================================

async function patchSalesFulfillment({
	input,
	orgId,
}: {
	input: TPatchSalesFulfillmentInput;
	orgId: string;
}) {
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

	const result = await getSalesFulfillment({ orgId: session.membership.organizacao.id });
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
