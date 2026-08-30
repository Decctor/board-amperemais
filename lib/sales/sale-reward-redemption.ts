import { type TValidatedPrizeForRedemption, validatePrizeForRedemption } from "@/lib/cashback/prizes";
import { loadChannelState } from "@/lib/products/sales-channels-store";
import { POS_REWARD_SALE_ITEM_ORIGIN, type TSaleRewardDraftSnapshot } from "@/lib/sales/sale-reward-snapshot";
import type { DB, DBTransaction } from "@/services/drizzle";
import createHttpError from "http-errors";

// Parte client-safe (tipo do snapshot, origem do item, parser) mora em sale-reward-snapshot.ts;
// reexportada aqui para os consumidores de servidor não precisarem de dois imports.
export { POS_REWARD_SALE_ITEM_ORIGIN, parseSaleRewardDraftSnapshot, type TSaleRewardDraftSnapshot } from "@/lib/sales/sale-reward-snapshot";

export type TAdmittedSaleReward = {
	programaId: string;
	prize: TValidatedPrizeForRedemption;
};

/**
 * Admissão do resgate de recompensa em uma venda: exige cliente vinculado, aplica as
 * regras de exclusividade (cupom e resgate-desconto não são combináveis — a idempotência do
 * ledger é "1 RESGATE por venda"), resolve o programa, exige a modalidade de recompensas,
 * valida o prêmio contra o catálogo (com o preço do canal, quando informado) e pré-checa o
 * saldo do cliente. Tudo que vira item/ledger sai daqui — o cliente informa apenas o id do prêmio.
 */
export async function admitSaleRewardRedemption({
	tx,
	organizacaoId,
	clienteId,
	recompensaId,
	programaId,
	hasCoupon,
	cashbackResgate,
	canal,
}: {
	tx: DB | DBTransaction;
	organizacaoId: string;
	clienteId: string | null | undefined;
	recompensaId: string;
	programaId?: string | null;
	hasCoupon: boolean;
	cashbackResgate: number;
	canal?: Parameters<typeof loadChannelState>[0]["canal"] | null;
}): Promise<TAdmittedSaleReward> {
	if (!clienteId) throw new createHttpError.BadRequest("Vincule um cliente para resgatar uma recompensa.");
	if (hasCoupon) throw new createHttpError.BadRequest("Cupons não podem ser combinados com resgate de recompensa.");
	if (cashbackResgate > 0) throw new createHttpError.BadRequest("Resgate de recompensa não pode ser combinado com desconto em cashback.");

	let resolvedProgramId = programaId ?? null;
	if (!resolvedProgramId) {
		const balance = await tx.query.cashbackProgramBalances.findFirst({
			where: (fields, { and, eq }) => and(eq(fields.organizacaoId, organizacaoId), eq(fields.clienteId, clienteId)),
			columns: { programaId: true },
		});
		resolvedProgramId = balance?.programaId ?? null;
	}
	if (!resolvedProgramId) throw new createHttpError.BadRequest("Programa de cashback não informado.");

	const program = await tx.query.cashbackPrograms.findFirst({
		where: (fields, { and, eq }) => and(eq(fields.id, resolvedProgramId), eq(fields.organizacaoId, organizacaoId), eq(fields.ativo, true)),
		columns: { id: true, modalidadeRecompensasPermitida: true },
	});
	if (!program) throw new createHttpError.NotFound("Programa de cashback não encontrado.");
	if (!program.modalidadeRecompensasPermitida) {
		throw new createHttpError.BadRequest("O programa de cashback não permite resgate de recompensas.");
	}

	const channelState = canal ? await loadChannelState({ orgId: organizacaoId, canal }) : null;
	const prize = await validatePrizeForRedemption({
		tx,
		organizacaoId,
		programaId: program.id,
		recompensaId,
		channelState,
	});

	// Pré-checagem de saldo. O débito autoritativo continua sendo o FIFO da confirmação, mas sem
	// esta guarda a venda inteira é gravada antes de o débito estourar — na loja digital isso
	// deixava um ORCAMENTO órfão com o item grátis e o pedido irrepetível (request ERRO com vendaId).
	const balance = await tx.query.cashbackProgramBalances.findFirst({
		where: (fields, { and, eq }) => and(eq(fields.organizacaoId, organizacaoId), eq(fields.clienteId, clienteId), eq(fields.programaId, program.id)),
		columns: { saldoValorDisponivel: true },
	});
	if ((balance?.saldoValorDisponivel ?? 0) < prize.valor) {
		throw new createHttpError.BadRequest("Saldo insuficiente para resgatar a recompensa.");
	}

	return { programaId: program.id, prize };
}

/**
 * Valores do saleItem da recompensa: item normal com 100% de desconto (líquido 0) e custo real
 * do catálogo. Sendo um saleItem comum, baixa estoque, compõe COGS e aparece no documento
 * fiscal com vProd/vDesc — o débito de saldo acontece na confirmação, à parte.
 */
export function buildRewardSaleItemValues({
	organizacaoId,
	vendaId,
	clienteId,
	prize,
}: {
	organizacaoId: string;
	vendaId: string;
	clienteId: string | null;
	prize: TValidatedPrizeForRedemption;
}) {
	return {
		organizacaoId,
		vendaId,
		clienteId,
		produtoId: prize.produtoId,
		produtoVarianteId: prize.produtoVarianteId,
		quantidade: 1,
		valorVendaUnitario: prize.valorVenda,
		valorCustoUnitario: prize.precoCusto,
		valorVendaTotalBruto: prize.valorVenda,
		valorTotalDesconto: prize.valorVenda,
		valorVendaTotalLiquido: 0,
		valorCustoTotal: prize.precoCusto,
		metadados: {
			origem: POS_REWARD_SALE_ITEM_ORIGIN,
			recompensaId: prize.id,
			valorResgate: prize.valor,
			valorComercial: prize.valorVenda,
			nome: prize.produtoNome,
			codigo: prize.produtoCodigo,
			imagemUrl: prize.produtoImagemUrl,
		},
	};
}

export function buildSaleRewardDraftSnapshot({ programaId, prize }: TAdmittedSaleReward): TSaleRewardDraftSnapshot {
	return {
		recompensaId: prize.id,
		programaId,
		titulo: prize.titulo,
		valor: prize.valor,
		valorVenda: prize.valorVenda,
	};
}
