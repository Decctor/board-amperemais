import type { TPoiRegistrationFieldDefinition } from "@/lib/point-of-interaction/registration";
import { CircleUserRound, ListChecks, type LucideIcon, ShieldCheck } from "lucide-react";

/**
 * Um passo do assistente. Três, no máximo: quem é você, o que a organização quis perguntar, e o que
 * podemos fazer com os seus dados.
 *
 * Os campos configurados moram TODOS no passo do meio, empilhados numa tela só. Uma pergunta por
 * tela parecia mais leve, mas oito perguntas viram oito toques em "Continuar" com oito telas quase
 * vazias — e a trilha de progresso, que deveria tranquilizar, vira uma fileira ilegível de bolinhas.
 * Numa tela só o cliente vê de uma vez o que falta e responde na ordem que quiser.
 *
 * A boas-vindas e o sucesso não estão aqui de propósito: nenhuma das duas é um passo que o cliente
 * preenche, e nenhuma das duas aparece na trilha de progresso.
 */
export type TRegistrationStep =
	| { tipo: "identity"; chave: string; rotulo: string; icone: LucideIcon }
	| { tipo: "campos"; chave: string; rotulo: string; icone: LucideIcon; campos: TPoiRegistrationFieldDefinition[] }
	| { tipo: "consent"; chave: string; rotulo: string; icone: LucideIcon };

/** Monta a sequência de passos a partir dos campos já ordenados pela configuração da superfície. */
export function buildRegistrationSteps(campos: TPoiRegistrationFieldDefinition[]): TRegistrationStep[] {
	const steps: TRegistrationStep[] = [{ tipo: "identity", chave: "identity", rotulo: "Seus dados", icone: CircleUserRound }];

	// Sem campos configurados não existe passo do meio — o cadastro COMPLETO vira nome + consentimento.
	if (campos.length > 0) {
		steps.push({ tipo: "campos", chave: "campos", rotulo: "Sobre você", icone: ListChecks, campos });
	}

	steps.push({ tipo: "consent", chave: "consent", rotulo: "Suas preferências", icone: ShieldCheck });

	return steps;
}
