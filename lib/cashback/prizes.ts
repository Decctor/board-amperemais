import type { DB, DBTransaction } from "@/services/drizzle";
import createHttpError from "http-errors";

export type TValidatedPrizeForRedemption = {
	id: string;
	titulo: string;
	imagemCapaUrl: string | null;
	// Débito de saldo do cliente, em moeda cashback (R$ ou pontos, conforme a terminologia do programa).
	valor: number;
	// Valor comercial do prêmio (sempre R$): precoVenda da variante ?? do produto.
	valorVenda: number;
	precoCusto: number;
	// produtoId é sempre resolvido (saleItems.produtoId é NOT NULL) — prêmios variante-only
	// devolvem o produto pai da variante.
	produtoId: string;
	produtoVarianteId: string | null;
	produtoNome: string;
	produtoCodigo: string;
	produtoImagemUrl: string | null;
};

/**
 * Valida um prêmio do programa de cashback para resgate e resolve os valores autoritativos
 * (comercial, custo e vínculo de produto) a partir do catálogo. Usado pelo POI e pelo PDV —
 * o cliente informa apenas o id do prêmio; tudo que vira item de venda sai daqui.
 */
export async function validatePrizeForRedemption({
	tx,
	organizacaoId,
	programaId,
	recompensaId,
}: {
	tx: DB | DBTransaction;
	organizacaoId: string;
	programaId: string;
	recompensaId: string;
}): Promise<TValidatedPrizeForRedemption> {
	const prize = await tx.query.cashbackProgramPrizes.findFirst({
		where: (fields, { and, eq }) =>
			and(eq(fields.id, recompensaId), eq(fields.organizacaoId, organizacaoId), eq(fields.programaId, programaId), eq(fields.ativo, true)),
		columns: {
			id: true,
			titulo: true,
			imagemCapaUrl: true,
			valor: true,
			produtoId: true,
			produtoVarianteId: true,
		},
		with: {
			produto: {
				columns: {
					id: true,
					nome: true,
					codigo: true,
					imagemCapaUrl: true,
					precoVenda: true,
					precoCusto: true,
				},
			},
			produtoVariante: {
				columns: {
					id: true,
					produtoId: true,
					nome: true,
					codigo: true,
					imagemCapaUrl: true,
					precoVenda: true,
					precoCusto: true,
				},
			},
		},
	});
	if (!prize) {
		throw new createHttpError.BadRequest("Recompensa não encontrada ou inativa.");
	}
	if (!prize.produtoId && !prize.produtoVarianteId) {
		throw new createHttpError.BadRequest("A recompensa selecionada não possui vínculo com produto ou variante.");
	}

	const variante = prize.produtoVariante;
	// Prêmio variante-only: o produto pai vem pela variante (saleItems.produtoId é NOT NULL).
	const produtoId = prize.produtoId ?? variante?.produtoId;
	if (!produtoId) {
		throw new createHttpError.BadRequest("A recompensa selecionada não possui vínculo com produto ou variante.");
	}
	const produto =
		prize.produto ??
		(await tx.query.products.findFirst({
			where: (fields, { eq }) => eq(fields.id, produtoId),
			columns: { id: true, nome: true, codigo: true, imagemCapaUrl: true, precoVenda: true, precoCusto: true },
		})) ??
		null;
	if (!produto) {
		throw new createHttpError.BadRequest("O produto vinculado à recompensa não foi encontrado.");
	}

	return {
		id: prize.id,
		titulo: prize.titulo,
		imagemCapaUrl: prize.imagemCapaUrl ?? null,
		valor: prize.valor,
		valorVenda: variante?.precoVenda ?? produto.precoVenda ?? 0,
		precoCusto: variante?.precoCusto ?? produto.precoCusto ?? 0,
		produtoId,
		produtoVarianteId: variante?.id ?? null,
		produtoNome: variante ? `${produto.nome} - ${variante.nome}` : produto.nome,
		produtoCodigo: variante?.codigo ?? produto.codigo,
		produtoImagemUrl: variante?.imagemCapaUrl ?? produto.imagemCapaUrl ?? null,
	};
}
