import type { TCouponEntity } from "@/services/drizzle/schema";
import { couponGrants, couponRedemptions, coupons } from "@/services/drizzle/schema";
import { and, desc, eq, gt, isNull, lte, or } from "drizzle-orm";
import z from "zod";
import { defineAgentTool } from "./define-tool";

/** Traduz o benefício estruturado para uma frase que o agente pode repassar ao cliente. */
function descreverBeneficio(
	cupom: Pick<
		TCouponEntity,
		"beneficioTipo" | "beneficioValor" | "beneficioDescontoMaximo" | "beneficioCompreQuantidade" | "beneficioLeveQuantidade" | "beneficioAplicacao"
	>,
): string {
	const valor = cupom.beneficioValor ?? 0;
	switch (cupom.beneficioTipo) {
		case "DESCONTO_FIXO":
			return `R$ ${valor.toFixed(2)} de desconto`;
		case "DESCONTO_PERCENTUAL":
			return cupom.beneficioDescontoMaximo
				? `${valor}% de desconto (limitado a R$ ${cupom.beneficioDescontoMaximo.toFixed(2)})`
				: `${valor}% de desconto`;
		case "PRECO_FIXO":
			return `preço promocional de R$ ${valor.toFixed(2)}`;
		case "COMPRE_X_LEVE_Y":
			return `compre ${cupom.beneficioCompreQuantidade ?? "?"} e leve ${cupom.beneficioLeveQuantidade ?? "?"}`;
		case "BRINDE":
			return "brinde";
		default:
			return "benefício especial";
	}
}

function montarCondicoes(
	cupom: Pick<TCouponEntity, "condicaoValorMinimoVenda" | "condicaoQuantidadeMinimaItens" | "condicoesTexto" | "validacaoModo">,
) {
	return {
		valorMinimoVenda: cupom.condicaoValorMinimoVenda,
		quantidadeMinimaItens: cupom.condicaoQuantidadeMinimaItens,
		// Cupons de validação MANUAL têm as regras em texto livre — o resgate é feito no balcão.
		regrasEmTexto: cupom.condicoesTexto,
		exigeConferenciaManual: cupom.validacaoModo === "MANUAL",
	};
}

/**
 * Consulta os cupons que o cliente pode usar e os que já usou.
 *
 * "Disponíveis" reúne duas fontes distintas: os cupons GLOBAIS vigentes da organização e as
 * atribuições individuais do cliente (`coupon_grants`), cuja `expiracaoData` sobrepõe a
 * vigência do cupom.
 */
export const cuponsConsultarTool = defineAgentTool({
	name: "cupons.consultar",
	description: `Consulta cupons de desconto — os que o cliente pode usar agora e os que já usou.

Use visao="DISPONIVEIS" (padrão) para os cupons válidos para este cliente neste momento:
inclui tanto os cupons abertos a todos os clientes quanto os atribuídos individualmente a ele.
Retorna código, benefício, condições de uso e validade.
Use visao="RESGATES" para o histórico de cupons já utilizados pelo cliente.

Informe "codigo" para verificar um cupom específico (ex.: o cliente pergunta "o cupom PROMO10
ainda vale?").

Nunca prometa um desconto que não apareça nesta consulta, e sempre mencione as condições
(valor mínimo, quantidade mínima) junto do benefício.`,
	inputSchema: z.object({
		visao: z.enum(["DISPONIVEIS", "RESGATES"]).optional().describe("O que consultar. Padrão: DISPONIVEIS."),
		codigo: z.string().min(1).optional().describe("Verificar apenas o cupom com este código."),
		limite: z.number().int().min(1).max(50).optional().describe("Máximo de cupons retornados. Padrão: 10."),
	}),
	async execute(input, context) {
		const { db, organizacaoId, chat } = context;
		const visao = input.visao ?? "DISPONIVEIS";
		const limite = input.limite ?? 10;
		const agora = new Date();

		if (visao === "RESGATES") {
			const conditions = [eq(couponRedemptions.organizacaoId, organizacaoId), eq(couponRedemptions.clienteId, chat.clienteId)];
			if (input.codigo) conditions.push(eq(couponRedemptions.cupomCodigo, input.codigo));

			const resgates = await db.query.couponRedemptions.findMany({
				where: and(...conditions),
				orderBy: [desc(couponRedemptions.dataInsercao)],
				limit: limite,
				columns: { cupomTitulo: true, cupomCodigo: true, status: true, valorDesconto: true, vendaValor: true, dataInsercao: true },
			});

			return {
				success: true,
				message: resgates.length > 0 ? `${resgates.length} resgate(s) de cupom encontrado(s).` : "O cliente ainda não utilizou nenhum cupom.",
				result: { resgates },
			};
		}

		// Vigência: início já passou (ou não definido) e fim ainda não chegou (ou não expira).
		const globaisConditions = [
			eq(coupons.organizacaoId, organizacaoId),
			eq(coupons.ativo, true),
			eq(coupons.escopo, "GLOBAL"),
			or(isNull(coupons.vigenciaInicio), lte(coupons.vigenciaInicio, agora)),
			or(isNull(coupons.vigenciaFim), gt(coupons.vigenciaFim, agora)),
		];
		if (input.codigo) globaisConditions.push(eq(coupons.codigo, input.codigo));

		const globais = await db.query.coupons.findMany({
			where: and(...globaisConditions),
			orderBy: [desc(coupons.dataInsercao)],
			limit: limite,
		});

		const atribuicoes = await db.query.couponGrants.findMany({
			where: and(
				eq(couponGrants.organizacaoId, organizacaoId),
				eq(couponGrants.clienteId, chat.clienteId),
				gt(couponGrants.quantidadeDisponivel, 0),
				or(isNull(couponGrants.expiracaoData), gt(couponGrants.expiracaoData, agora)),
			),
			orderBy: [desc(couponGrants.dataInsercao)],
			limit: limite,
			with: { cupom: true },
		});

		const disponiveis = [
			...globais.map((cupom) => ({
				codigo: cupom.codigo,
				titulo: cupom.titulo,
				descricao: cupom.descricao,
				beneficio: descreverBeneficio(cupom),
				aplicacao: cupom.beneficioAplicacao,
				condicoes: montarCondicoes(cupom),
				validoAte: cupom.vigenciaFim,
				origem: "GLOBAL" as const,
			})),
			...atribuicoes
				.filter((grant) => {
					const cupom = grant.cupom;
					if (!cupom || !cupom.ativo || cupom.organizacaoId !== organizacaoId) return false;
					if (input.codigo && cupom.codigo !== input.codigo && grant.codigo !== input.codigo) return false;
					if (cupom.vigenciaInicio && cupom.vigenciaInicio > agora) return false;
					// A expiração do grant já foi filtrada no WHERE; a do cupom ainda precisa valer.
					if (cupom.vigenciaFim && cupom.vigenciaFim <= agora && !grant.expiracaoData) return false;
					return true;
				})
				.map((grant) => ({
					codigo: grant.codigo ?? grant.cupom.codigo,
					titulo: grant.cupom.titulo,
					descricao: grant.cupom.descricao,
					beneficio: descreverBeneficio(grant.cupom),
					aplicacao: grant.cupom.beneficioAplicacao,
					condicoes: montarCondicoes(grant.cupom),
					validoAte: grant.expiracaoData ?? grant.cupom.vigenciaFim,
					quantidadeDisponivel: grant.quantidadeDisponivel,
					origem: "ATRIBUIDO_AO_CLIENTE" as const,
				})),
		].slice(0, limite);

		if (disponiveis.length === 0) {
			return {
				success: true,
				message: input.codigo
					? `Nenhum cupom válido encontrado com o código "${input.codigo}" para este cliente.`
					: "Nenhum cupom disponível para este cliente no momento.",
				result: { totalEncontrado: 0, cupons: [] },
			};
		}

		return {
			success: true,
			message: `${disponiveis.length} cupom(ns) disponível(is) para este cliente.`,
			result: { totalEncontrado: disponiveis.length, cupons: disponiveis },
		};
	},
});
