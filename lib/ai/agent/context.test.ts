import assert from "node:assert/strict";
import test from "node:test";
import type { TChatRunContext } from "./context";
import { formatChatRunContext } from "./context";

function contextAt(agora: string): TChatRunContext {
	return {
		chatId: "chat-1",
		cliente: {
			id: "cliente-1",
			nome: "Lucas",
			telefone: null,
			email: null,
			cidade: null,
			estado: null,
			aniversario: null,
		},
		conversa: [],
		atendimento: null,
		tempo: {
			agora,
			fusoHorario: "America/Sao_Paulo (BRT, UTC-03:00)",
			janelaWhatsapp: { aberta: true, expiraEm: null },
			ultimaMensagemDoClienteEm: null,
			ultimaMensagemEnviadaEm: null,
		},
	};
}

test("expõe horário local de São Paulo e período do dia sem exigir conversão do modelo", () => {
	const prompt = formatChatRunContext(contextAt("2026-08-31T20:14:00.000Z"));

	assert.match(prompt, /Agora em São Paulo: 31\/08\/2026, 17:14 \(tarde\)/);
	assert.doesNotMatch(prompt, /Agora: 2026-08-31T20:14/);
});

test("classifica o início da noite no horário de São Paulo", () => {
	const prompt = formatChatRunContext(contextAt("2026-08-31T21:00:00.000Z"));

	assert.match(prompt, /18:00 \(noite\)/);
});
