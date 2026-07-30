/**
 * Backstop contra o turno que não entrega nada.
 *
 * O agente responde uma vez por mensagem do cliente: se ele promete uma ação e encerra sem
 * executá-la, ninguém continua o trabalho — o chat trava até o cliente cutucar. Nos testes de
 * julho/2026 um cliente que já havia confirmado "1 unidade" recebeu três turnos seguidos de
 * "vou criar o orçamento", "vou confirmar o ID" e "um momento, já te mando", nenhum com tool
 * call, e o orçamento nunca existiu.
 *
 * A defesa principal é o prompt (o canal avisa que não há segundo momento) — este arquivo é
 * alarme, e um retry que dispare muito é sinal de regressão do prompt, não de tuning a fazer.
 */

const DEFERRED_ACTION_PATTERNS = [
	/\b(?:vou|vamos|irei)\s+(?:j[aá]\s+|agora\s+|logo\s+|ent[aã]o\s+)?(?:consultar|verificar|conferir|checar|criar|gerar|preparar|montar|buscar|procurar|olhar|confirmar|separar|levantar|providenciar|validar|pesquisar|ver)\b/i,
	// "deixa eu ver", "deixe-me confirmar", "me deixa checar"
	/\b(?:deixa?|deixe)\s+(?:eu|me|-me)\b/i,
	/\b(?:um momento|um instante|um segundo|um minuto|s[oó] um|aguarde|aguarda|j[aá] volto|j[aá] retorno|volto j[aá])\b/i,
	/\b(?:j[aá]\s+)?(?:te|lhe)\s+(?:envio|mando|retorno|aviso|confirmo|passo|respondo)\b/i,
	/\b(?:estou|vou estar|estarei)\s+(?:consultando|verificando|conferindo|checando|buscando|preparando|montando|pesquisando)\b/i,
	/\b(?:dar|dou|vou dar)\s+uma\s+olhada\b/i,
];

const QUOTE_PROMISE_PATTERN =
	/\b(?:criar|gerar|preparar|montar|fazer|fechar)\b[^.\n]{0,30}\bor[çc]amento\b|\bor[çc]amento\b[^.\n]{0,30}\b(?:criar|gerar|preparar|montar|fazer|fechar)\b/i;

export function hasDeferredActionPromise(message: string | null): boolean {
	if (!message?.trim()) return false;
	return DEFERRED_ACTION_PATTERNS.some((pattern) => pattern.test(message));
}

export type TDeferredActionCheck = {
	mensagem: string | null;
	/** Resumo interno do turno: pega a promessa que ficou fora da mensagem do cliente. */
	resumoAtendimento: string;
	/** Nomes no formato do AI SDK (`orcamentos_criar`), como vêm dos steps da geração. */
	calledTools: string[];
};

export function shouldRetryDeferredAction({ mensagem, resumoAtendimento, calledTools }: TDeferredActionCheck): boolean {
	// Turno morto: nada para o cliente e nada executado. `mensagem: null` só se justifica quando
	// alguma ferramenta agiu (tipicamente a transferência para humano).
	if (!mensagem?.trim()) return calledTools.length === 0;

	if (QUOTE_PROMISE_PATTERN.test(mensagem)) return !calledTools.includes("orcamentos_criar");
	if (hasDeferredActionPromise(mensagem)) return calledTools.length === 0;

	// Promessa que ficou só no resumo interno enquanto o cliente recebeu texto de espera.
	if (calledTools.length === 0 && hasDeferredActionPromise(resumoAtendimento)) return true;

	return false;
}
