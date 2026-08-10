import type { TPoiRegistrationFieldDefinition } from "@/lib/point-of-interaction/registration";
import type { TCustomFieldValue, TCustomFieldValueInput } from "@/schemas/custom-fields";
import { parseBirthDateDigitsToIso, parseDateDigitsToIso } from "../helpers/date-digits";

/**
 * O que o assistente guarda enquanto o cliente digita, antes de virar payload.
 *
 * Sempre string (ou lista de strings), nunca o valor canônico: a data mora aqui como os oito
 * dígitos DDMMAAAA que o teclado produz, e o número como o texto cru. A conversão para o formato
 * que a API aceita acontece uma única vez, em `resolveAnswerValue` — assim o campo continua
 * editável no meio do preenchimento (uma data pela metade não é uma data inválida, é uma data
 * incompleta).
 */
export type TRegistrationAnswerDraft = string | string[];

/** Rascunhos indexados por `campoId`. Campo ausente = ainda não respondido. */
export type TRegistrationAnswers = Record<string, TRegistrationAnswerDraft | undefined>;

// Validação deliberadamente frouxa: barra o erro de digitação óbvio (falta de "@" ou de domínio)
// sem recusar endereços exóticos porém válidos. A validação séria é o e-mail chegar.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * O campo tem como ser respondido nesta tela?
 *
 * Um campo de escolha que ficou sem opções (a organização apagou todas depois de configurá-lo no
 * assistente) não aceita nenhum valor — o servidor recusaria qualquer um. Marcá-lo como
 * inrespondível é o que impede um passo obrigatório de virar um beco sem saída no balcão.
 */
export function isFieldAnswerable(campo: TPoiRegistrationFieldDefinition): boolean {
	if (campo.tipo !== "ESCOLHA_UNICA" && campo.tipo !== "ESCOLHA_MULTIPLA") return true;
	return (campo.opcoes ?? []).length > 0;
}

/** Houve resposta? Vazio, só espaços ou lista sem itens contam como não respondido. */
export function isAnswerFilled(draft: TRegistrationAnswerDraft | undefined): boolean {
	if (draft === undefined) return false;
	if (Array.isArray(draft)) return draft.length > 0;
	return draft.trim().length > 0;
}

type TResolvedAnswer = { valor: TCustomFieldValue; erro: null } | { valor: null; erro: string };

/**
 * Converte o rascunho de um campo no valor canônico que `saveClientCustomFieldValues` espera,
 * ou devolve a mensagem em português que o passo mostra ao cliente.
 *
 * Só é chamado para campos respondidos — "não respondido" é decidido antes, por `isAnswerFilled`,
 * porque a resposta vazia de um campo opcional não é um erro.
 */
export function resolveAnswerValue({
	campo,
	draft,
}: {
	campo: TPoiRegistrationFieldDefinition;
	draft: TRegistrationAnswerDraft;
}): TResolvedAnswer {
	switch (campo.tipo) {
		case "ESCOLHA_UNICA": {
			if (Array.isArray(draft)) return { valor: null, erro: "Escolha uma opção para continuar." };
			return { valor: draft, erro: null };
		}
		case "ESCOLHA_MULTIPLA": {
			const selecionadas = Array.isArray(draft) ? draft : [draft];
			if (selecionadas.length === 0) return { valor: null, erro: "Escolha ao menos uma opção para continuar." };
			return { valor: selecionadas, erro: null };
		}
		case "TEXTO": {
			if (Array.isArray(draft)) return { valor: null, erro: "Preencha o campo para continuar." };
			const texto = draft.trim();
			if (!texto) return { valor: null, erro: "Preencha o campo para continuar." };
			if (campo.chaveNativa === "email" && !EMAIL_PATTERN.test(texto)) {
				return { valor: null, erro: "Confira o e-mail digitado — algo como nome@email.com." };
			}
			return { valor: texto, erro: null };
		}
		case "NUMERO": {
			if (Array.isArray(draft)) return { valor: null, erro: "Digite um número para continuar." };
			// Vírgula é o separador decimal que o cliente brasileiro digita; Number() só entende ponto.
			const numero = Number(draft.trim().replace(",", "."));
			if (!Number.isFinite(numero)) return { valor: null, erro: "Digite um número válido para continuar." };
			return { valor: numero, erro: null };
		}
		case "DATA": {
			if (Array.isArray(draft)) return { valor: null, erro: "Digite a data completa (DD/MM/AAAA)." };
			const digitos = draft.replace(/\D/g, "");
			// Data de nascimento não pode estar no futuro; um campo de data qualquer pode.
			const isoDate = campo.chaveNativa === "birth-date" ? parseBirthDateDigitsToIso(digitos) : parseDateDigitsToIso(digitos);
			if (!isoDate) {
				return {
					valor: null,
					erro:
						campo.chaveNativa === "birth-date"
							? "Data de nascimento inválida. Confira o formato DD/MM/AAAA."
							: "Data inválida. Confira o formato DD/MM/AAAA.",
				};
			}
			return { valor: isoDate, erro: null };
		}
		default:
			return { valor: null, erro: "Tipo de campo não suportado." };
	}
}

type TBuiltRespostas = { respostas: TCustomFieldValueInput[]; erro: null } | { respostas: null; erro: string };

/**
 * Monta o `customFieldAnswers` do payload a partir de todos os rascunhos.
 *
 * Campos não respondidos simplesmente não entram na lista — o servidor não distingue "pulei" de
 * "a organização não perguntou", e essa distinção não vale uma linha vazia no banco.
 */
export function buildRespostasCampos({
	campos,
	answers,
}: {
	campos: TPoiRegistrationFieldDefinition[];
	answers: TRegistrationAnswers;
}): TBuiltRespostas {
	const respostas: TCustomFieldValueInput[] = [];

	for (const campo of campos) {
		const draft = answers[campo.campoId];
		if (!isAnswerFilled(draft)) {
			if (campo.obrigatorio && isFieldAnswerable(campo)) return { respostas: null, erro: `Responda "${campo.titulo}" para concluir o cadastro.` };
			continue;
		}
		const resolved = resolveAnswerValue({ campo, draft: draft as TRegistrationAnswerDraft });
		// Comparação explícita com null: a união se discrimina por `erro: null`, não por veracidade.
		if (resolved.erro !== null) return { respostas: null, erro: resolved.erro };
		respostas.push({ campoId: campo.campoId, valor: resolved.valor });
	}

	return { respostas, erro: null };
}
