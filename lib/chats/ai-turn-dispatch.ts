import { runAiTurnForMessage, type TAiTurnPayload } from "@/lib/chats/ai-turn-runner";

/**
 * Transporte do turno de IA disparado por mensagem.
 *
 * Inline: sleep de debounce e run na própria função, sob o waitUntil do webhook. As
 * garantias de idempotência não vivem aqui — vivem no banco, dentro de
 * `runAiTurnForMessage` — então trocar de transporte não muda a correção, só a
 * durabilidade.
 */
export async function dispatchAiTurn(payload: TAiTurnPayload, { delayMs }: { delayMs: number }): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, delayMs));
	await runAiTurnForMessage(payload);
}
