import { type TValidatedPrizeForRedemption, validatePrizeForRedemption } from "@/lib/cashback/prizes";
import type { DB, DBTransaction } from "@/services/drizzle";
import createHttpError from "http-errors";

export type TAdmittedSaleReward = {
	programaId: string;
	prize: TValidatedPrizeForRedemption;
};

// Snapshot da recompensa carimbado pelo servidor em sales.rascunhoMetadados.recompensa.
// É a chave autoritativa lida pela confirmação de orçamento — o blob enviado pelo cliente
// pode carregar o estado da UI em outra chave, mas nunca é lido para efeitos.
export type TSaleRewardDraftSnapshot = {
	recompensaId: string;
	programaId: string;
	titulo: string;
	valor: number;
	valorVenda: number;
};

/**
 * Admissão do resgate de recompensa em uma venda do PDV: exige cliente vinculado, aplica as
 * regras de exclusividade (cupom e resgate-desconto não são combináveis — a idempotência do
 * ledger é "1 RESGATE por venda"), resolve o programa, exige a modalidade de recompensas e
 * valida o prêmio contra o catálogo. Tudo que vira item/ledger sai daqui — o cliente informa
 * apenas o id do prêmio.
 */
export async function admitSaleRewardRedemption({
	tx,
	organizacaoId,
	clienteId,
	recompensaId,
	programaId,
	hasCoupon,
	cashbackResgate,
}: {
	tx: DB | DBTransaction;
	organizacaoId: string;
	clienteId: string | null | undefined;
	recompensaId: string;
	programaId?: string | null;
	hasCoupon: boolean;
	cashbackResgate: number;
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

	const prize = await validatePrizeForRedemption({
		tx,
		organizacaoId,
		programaId: program.id,
		recompensaId,
	});

	return { programaId: program.id, prize };
}

export const POS_REWARD_SALE_ITEM_ORIGIN = "POS-RESGATE-RECOMPENSA";

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

/** Lê o snapshot autoritativo da recompensa de um rascunho (rascunhoMetadados.recompensa). */
export function parseSaleRewardDraftSnapshot(rascunhoMetadados: unknown): TSaleRewardDraftSnapshot | null {
	if (!rascunhoMetadados || typeof rascunhoMetadados !== "object") return null;
	const recompensa = (rascunhoMetadados as { recompensa?: unknown }).recompensa;
	if (!recompensa || typeof recompensa !== "object") return null;
	const snapshot = recompensa as Partial<TSaleRewardDraftSnapshot>;
	if (typeof snapshot.recompensaId !== "string" || typeof snapshot.programaId !== "string") return null;
	return {
		recompensaId: snapshot.recompensaId,
		programaId: snapshot.programaId,
		titulo: typeof snapshot.titulo === "string" ? snapshot.titulo : "",
		valor: typeof snapshot.valor === "number" ? snapshot.valor : 0,
		valorVenda: typeof snapshot.valorVenda === "number" ? snapshot.valorVenda : 0,
	};
}
