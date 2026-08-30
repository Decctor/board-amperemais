import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { CheckoutPaymentSplitSchema, resolvePaymentFinancialAccounts } from "@/lib/payments";
import { toSalesChannelType } from "@/lib/products/sales-channels";
import { computeSaleItemsPricingDrift } from "@/lib/sales/sale-pricing-validation";
import { resolveActiveSalesSession } from "@/lib/sales-sessions";
import { authorizeSaleDiscount, computeSaleAggregatedDiscount, consumeSaleDiscountApproval } from "@/lib/sales/sale-discount-authorization";
import {
	type TProcessSaleConfirmationInput,
	processSaleConfirmationInTransaction,
	processSaleConfirmationPostCommit,
} from "@/lib/sales/sale-processing";
import {
	POS_REWARD_SALE_ITEM_ORIGIN,
	admitSaleRewardRedemption,
	buildRewardSaleItemValues,
	parseSaleRewardDraftSnapshot,
} from "@/lib/sales/sale-reward-redemption";
import { AppliedCouponSchema, type TAppliedCoupon } from "@/schemas/coupons";
import { db } from "@/services/drizzle";
import { saleItems, sales } from "@/services/drizzle/schema";
import { and, eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const ConfirmSaleInputSchema = z.object({
	id: z.string({ required_error: "ID da venda nao informado." }),
	clienteId: z.string({ invalid_type_error: "Tipo nao valido para ID do cliente." }).optional().nullable(),
	pagamentos: z.array(CheckoutPaymentSplitSchema.omit({ id: true })),
	cashbackResgate: z.number({ invalid_type_error: "Tipo nao valido para resgate de cashback." }).default(0),
	cashbackProgramaId: z.string({ invalid_type_error: "Tipo nao valido para ID do programa de cashback." }).optional().nullable(),
	cupomResgate: AppliedCouponSchema.optional().nullable(),
	contaDebitoId: z.string({ invalid_type_error: "Tipo nao valido para conta de debito." }).optional().nullable(),
	contaCreditoId: z.string({ invalid_type_error: "Tipo nao valido para conta de credito." }).optional().nullable(),
	sessaoVendaId: z.string({ invalid_type_error: "Tipo nao valido para o ID da sessao de venda." }).optional().nullable(),
	// Aprovacao VENDA_DESCONTO exigida quando o desconto agregado do orcamento excede o teto do vendedor.
	descontoAprovacaoId: z.string({ invalid_type_error: "Tipo nao valido para o ID da aprovacao de desconto." }).optional().nullable(),
});
export type TConfirmSaleInput = z.infer<typeof ConfirmSaleInputSchema>;

async function confirmSale({ input, session }: { input: TConfirmSaleInput; session: TAuthUserSession }) {
	const orgId = session.membership!.organizacao.id;

	const [organization, saleDraft] = await Promise.all([
		db.query.organizations.findFirst({
			where: (fields, { eq }) => eq(fields.id, orgId),
		}),
		db.query.sales.findFirst({
			where: and(eq(sales.id, input.id), eq(sales.organizacaoId, orgId)),
			columns: {
				id: true,
				canal: true,
				rascunhoMetadados: true,
				vendedorId: true,
				clienteId: true,
				descontosTotal: true,
				custoTotal: true,
				tabId: true,
			},
			with: {
				itens: {
					columns: {
						id: true,
						produtoId: true,
						produtoVarianteId: true,
						quantidade: true,
						valorVendaUnitario: true,
						valorVendaTotalBruto: true,
						valorTotalDesconto: true,
						metadados: true,
					},
					with: {
						adicionais: { columns: { opcaoId: true, quantidade: true } },
						produto: { columns: { nome: true } },
						produtoVariante: { columns: { nome: true } },
					},
				},
			},
		}),
	]);

	if (!organization) throw new createHttpError.NotFound("Organizacao nao encontrada.");
	if (!saleDraft) throw new createHttpError.NotFound("Venda nao encontrada.");
	// Venda de conta de atendimento so e confirmada pelo fechamento da tab (lib/tabs/close-tab),
	// que garante lock, pedidos resolvidos, delta de estoque e sessao de caixa de quem fecha.
	if (saleDraft.tabId) throw new createHttpError.BadRequest("Esta venda pertence a uma conta de atendimento. Feche a conta para confirma-la.");

	// Rascunhos da loja digital já nascem com o item da recompensa gravado (o pedido é criado e
	// confirmado na mesma request); rascunhos do PDV só ganham o item aqui, na confirmação. O item
	// pré-existente fica fora do drift de preços e do teto de desconto (a recompensa não é desconto
	// do vendedor) e sinaliza que a inserção/ajuste de totais já aconteceu.
	const existingRewardItem = saleDraft.itens.find((item) => (item.metadados as { origem?: string } | null)?.origem === POS_REWARD_SALE_ITEM_ORIGIN);
	const draftItemsWithoutReward = saleDraft.itens.filter((item) => item !== existingRewardItem);

	// Preços congelados no rascunho precisam valer no momento da confirmação: um orçamento antigo
	// confirmado ao preço de semanas atrás é perda de margem silenciosa. O checkout mostra a
	// divergência e oferece a atualização antes de chegar aqui; esta guarda fecha o caminho.
	const pricing = await computeSaleItemsPricingDrift({
		orgId,
		// Drift contra os preços do canal da venda: um orçamento do shop confere contra o SHOP.
		canal: toSalesChannelType(saleDraft.canal),
		itens: draftItemsWithoutReward.map((item) => ({
			id: item.id,
			nome: item.produtoVariante?.nome ?? item.produto?.nome ?? "Item",
			produtoId: item.produtoId,
			produtoVarianteId: item.produtoVarianteId,
			quantidade: item.quantidade,
			valorVendaUnitario: item.valorVendaUnitario,
			valorVendaTotalBruto: item.valorVendaTotalBruto,
			modificadores: item.adicionais.map((mod) => ({ opcaoId: mod.opcaoId, quantidade: mod.quantidade })),
		})),
	});
	if (pricing.algumIndisponivel) {
		throw new createHttpError.BadRequest("Há itens que saíram do catálogo. Revise o carrinho antes de confirmar.");
	}
	if (pricing.algumDivergente) {
		throw new createHttpError.BadRequest("Os preços deste orçamento mudaram no catálogo. Atualize os preços antes de confirmar.");
	}

	// Sessões de venda (caixa): enforcement opcional/obrigatório + validação da sessão informada pelo cliente.
	const sessaoObrigatoria = organization.configuracao.preferencias.sessoesVenda?.obrigatorio ?? false;
	if (sessaoObrigatoria && !input.sessaoVendaId) {
		throw new createHttpError.BadRequest("Nenhum caixa aberto. Abra uma sessao de venda para continuar.");
	}
	let sessaoVendaId: string | null = null;
	if (input.sessaoVendaId) {
		const activeSession = await resolveActiveSalesSession({ orgId, sessaoVendaId: input.sessaoVendaId });
		if (!activeSession) throw new createHttpError.BadRequest("Sessao de venda invalida ou nao esta aberta.");
		sessaoVendaId = activeSession.id;
	}

	const organizationSaleDefaults = organization.configuracao.defaults.contabilidade.lancamentosPadrao.vendas;
	const accountingEntryDebitAccountId = input.contaDebitoId ?? organizationSaleDefaults.debitoContaId;
	const accountingEntryCreditAccountId = input.contaCreditoId ?? organizationSaleDefaults.creditoContaId;
	if (!accountingEntryDebitAccountId || !accountingEntryCreditAccountId) {
		throw new createHttpError.InternalServerError("A organizacao nao possui contas padrao de vendas configuradas.");
	}
	// Contas informadas no request precisam pertencer a organizacao (FK de accountingEntries e global por id).
	const accountIds = [...new Set([accountingEntryDebitAccountId, accountingEntryCreditAccountId])];
	const validAccounts = await db.query.accountsCharts.findMany({
		where: (fields, { and, eq, inArray }) => and(inArray(fields.id, accountIds), eq(fields.organizacaoId, orgId)),
		columns: { id: true },
	});
	if (validAccounts.length !== accountIds.length) {
		throw new createHttpError.BadRequest("Conta contabil invalida para esta organizacao.");
	}

	const shopMetadata = saleDraft.rascunhoMetadados as {
		shop?: {
			cashbackResgateSolicitado?: number;
			cashbackProgramaId?: string | null;
			cupom?: TAppliedCoupon | null;
		};
		cupom?: TAppliedCoupon | null;
		descontoGeral?: number;
	} | null;
	const effectiveCashbackResgate = input.cashbackResgate > 0 ? input.cashbackResgate : (shopMetadata?.shop?.cashbackResgateSolicitado ?? 0);
	const effectiveCashbackProgramaId = input.cashbackProgramaId ?? shopMetadata?.shop?.cashbackProgramaId ?? null;
	// O cupom aplicado no rascunho ja esta refletido nos totais da venda; aqui apenas resolve qual registrar no ledger.
	const shopAppliedCoupon = shopMetadata?.shop?.cupom ?? null;
	const effectiveAppliedCoupon = input.cupomResgate ?? shopAppliedCoupon ?? shopMetadata?.cupom ?? null;

	// Recompensa: o rascunho guarda apenas o snapshot carimbado pelo servidor. Revalida tudo
	// aqui (premio pode ter sido desativado, precos podem ter mudado) e so entao cria o item e
	// o debito de saldo — nao se reserva saldo/estoque enquanto a venda e orcamento.
	const rewardSnapshot = parseSaleRewardDraftSnapshot(saleDraft.rascunhoMetadados);
	const admittedReward = rewardSnapshot
		? await admitSaleRewardRedemption({
				tx: db,
				organizacaoId: orgId,
				clienteId: input.clienteId ?? saleDraft.clienteId,
				recompensaId: rewardSnapshot.recompensaId,
				programaId: rewardSnapshot.programaId,
				hasCoupon: !!effectiveAppliedCoupon,
				cashbackResgate: effectiveCashbackResgate,
				// Preço do prêmio conferido no canal da venda: um orçamento do shop valida contra o SHOP.
				canal: toSalesChannelType(saleDraft.canal),
			})
		: null;

	// Teto de desconto do vendedor: orcamento com desconto acima do limite nao e confirmavel sem aprovacao.
	// Desconto geral vem do rascunhoMetadados do PDV; fallback deriva do total carimbado menos
	// cupom/cashback — e menos a recompensa quando ela ja esta nos totais (rascunho do shop),
	// senao o premio inteiro contaria como desconto do vendedor e exigiria aprovacao indevida.
	const descontosGerais =
		typeof shopMetadata?.descontoGeral === "number"
			? Math.max(0, shopMetadata.descontoGeral)
			: Math.max(
					0,
					(saleDraft.descontosTotal ?? 0) -
						(effectiveAppliedCoupon?.valorDesconto ?? 0) -
						effectiveCashbackResgate -
						(existingRewardItem?.valorTotalDesconto ?? 0),
				);
	const descontoAgregado = computeSaleAggregatedDiscount({
		itens: draftItemsWithoutReward.map((item) => ({ valorTotalBruto: item.valorVendaTotalBruto, valorDesconto: item.valorTotalDesconto })),
		descontosGerais,
		cupomResgate: effectiveAppliedCoupon,
	});
	const descontoAprovacaoId = await authorizeSaleDiscount({
		orgId,
		session,
		vendedorId: saleDraft.vendedorId,
		valorBase: descontoAgregado.valorBase,
		descontoTotal: descontoAgregado.descontoTotal,
		aprovacaoId: input.descontoAprovacaoId,
	});

	const salePayments = await resolvePaymentFinancialAccounts({ organization, payments: input.pagamentos });

	const confirmationInput: TProcessSaleConfirmationInput = {
		organization,
		saleId: input.id,
		salePayments,
		saleAuthorId: session.user.id,
		saleClientId: input.clienteId,
		saleCashbackProgramId: effectiveCashbackProgramaId,
		saleCashbackRedemptionValue: effectiveCashbackResgate,
		saleCouponId: effectiveAppliedCoupon?.cupomId ?? null,
		saleCouponDeclaredDiscountValue: effectiveAppliedCoupon?.valorDesconto ?? null,
		saleCouponRedemptionSurface: !input.cupomResgate && shopAppliedCoupon ? "LOJA_DIGITAL" : undefined,
		saleRewardRedemption: admittedReward
			? {
					recompensaId: admittedReward.prize.id,
					programaId: admittedReward.programaId,
					valorResgate: admittedReward.prize.valor,
				}
			: null,
		accountingEntryDebitAccountId,
		accountingEntryCreditAccountId,
		sessaoVendaId,
	};

	// Mesma transacao: item da recompensa + confirmacao + consumo one-shot da aprovacao de desconto.
	const confirmation = await db.transaction(async (tx) => {
		if (descontoAprovacaoId) {
			await consumeSaleDiscountApproval({ tx, aprovacaoId: descontoAprovacaoId, vendaId: input.id });
		}
		// O item nasce aqui (nao no rascunho do PDV) e antes da confirmacao, que le os itens da
		// venda para baixa de estoque. Liquido 0 nao altera valorTotal; desconto e custo sim.
		// Rascunho do shop ja tem o item e os totais ajustados — inserir de novo duplicaria o premio.
		if (admittedReward && !existingRewardItem) {
			await tx.insert(saleItems).values(
				buildRewardSaleItemValues({
					organizacaoId: orgId,
					vendaId: input.id,
					clienteId: input.clienteId ?? saleDraft.clienteId ?? null,
					prize: admittedReward.prize,
				}),
			);
			await tx
				.update(sales)
				.set({
					descontosTotal: (saleDraft.descontosTotal ?? 0) + admittedReward.prize.valorVenda,
					custoTotal: (saleDraft.custoTotal ?? 0) + admittedReward.prize.precoCusto,
				})
				.where(eq(sales.id, input.id));
		}
		return processSaleConfirmationInTransaction({ tx, input: confirmationInput });
	});
	const fiscal = await processSaleConfirmationPostCommit(confirmationInput);
	const result = { ...confirmation, fiscal };

	return {
		data: result,
		message: "Venda confirmada com sucesso.",
	};
}
export type TConfirmSaleOutput = Awaited<ReturnType<typeof confirmSale>>;

async function confirmSaleRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Voce nao esta autenticado.");
	if (!session.membership) throw new createHttpError.Unauthorized("Voce precisa estar vinculado a uma organizacao.");

	const { searchParams } = new URL(request.url);
	const body = await request.json();
	const input = ConfirmSaleInputSchema.parse({ ...body, id: searchParams.get("id") });
	const result = await confirmSale({ input, session });
	return NextResponse.json(result);
}

export const POST = appApiHandler({ POST: confirmSaleRoute });
