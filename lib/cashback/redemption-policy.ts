import type { TBenefitRedemptionSurface } from "@/schemas/enums";
import type { TCashbackProgramEntity } from "@/services/drizzle/schema";

/**
 * Política de superfície de resgate do programa de cashback.
 *
 * Único lugar onde a regra "este programa resgata nesta superfície?" é escrita. Vale para as
 * duas modalidades (desconto em cashback e recompensa): a modalidade é um eixo ortogonal, checado
 * pelo chamador via `modalidadeDescontosPermitida`/`modalidadeRecompensasPermitida`.
 *
 * Funções puras, compartilhadas por PDV, ponto de interação e loja digital — mesmo desenho do
 * motor de cupons (`lib/coupons/engine.ts`).
 */
export type TCashbackRedemptionPolicyProgram = Pick<
	TCashbackProgramEntity,
	"resgatePermitirViaPos" | "resgatePermitirViaPontoIntegracao" | "resgatePermitirViaLojaDigital"
>;

const SURFACE_FLAG: Record<TBenefitRedemptionSurface, keyof TCashbackRedemptionPolicyProgram> = {
	POS: "resgatePermitirViaPos",
	PONTO_INTERACAO: "resgatePermitirViaPontoIntegracao",
	LOJA_DIGITAL: "resgatePermitirViaLojaDigital",
};

const SURFACE_BLOCK_REASON: Record<TBenefitRedemptionSurface, string> = {
	POS: "Resgates pelo PDV estão desativados neste programa de cashback.",
	PONTO_INTERACAO: "Resgates pelo ponto de interação estão desativados neste programa de cashback.",
	LOJA_DIGITAL: "Resgates pela loja digital estão desativados neste programa de cashback.",
};

export function isCashbackRedemptionAllowedOnSurface(program: TCashbackRedemptionPolicyProgram, surface: TBenefitRedemptionSurface): boolean {
	return program[SURFACE_FLAG[surface]];
}

/** Mensagem de bloqueio para o usuário, ou `null` quando o resgate é permitido na superfície. */
export function getCashbackRedemptionBlockReason({
	program,
	surface,
}: {
	program: TCashbackRedemptionPolicyProgram;
	surface: TBenefitRedemptionSurface;
}): string | null {
	return isCashbackRedemptionAllowedOnSurface(program, surface) ? null : SURFACE_BLOCK_REASON[surface];
}

/**
 * Um programa sem nenhuma superfície de resgate seria "só acumula" — não faz sentido como
 * produto. Validado no cadastro (rota e formulário), como o construtor de cupons já faz.
 */
export function hasAnyCashbackRedemptionSurface(program: TCashbackRedemptionPolicyProgram): boolean {
	return program.resgatePermitirViaPos || program.resgatePermitirViaPontoIntegracao || program.resgatePermitirViaLojaDigital;
}

export const NO_CASHBACK_REDEMPTION_SURFACE_MESSAGE = "Ative ao menos uma superfície de resgate (PDV, ponto de interação ou loja digital).";
