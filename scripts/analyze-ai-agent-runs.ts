import "dotenv/config";
import { connection, db } from "@/services/drizzle";
import { aiAgentOperations, aiAgentRuns, aiAgentToolCalls, chatMessages, chats, clients } from "@/services/drizzle/schema";
import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { writeFileSync } from "node:fs";

/**
 * Diagnóstico das execuções do agente de IA.
 *
 * Estritamente somente leitura. Gera um relatório markdown com:
 *  - estatísticas agregadas (runs por status, tool calls por ferramenta/status, erros mais comuns);
 *  - detecção de filtros de preço espúrios em `produtos.consultar`;
 *  - transcrição completa de cada run (mensagens do chat + tool calls com input/output + erro).
 *
 * Uso:
 *   npx tsx ./scripts/analyze-ai-agent-runs.ts --days=7
 *   npx tsx ./scripts/analyze-ai-agent-runs.ts --days=7 --orgId=<uuid> --out=report.md
 *   npx tsx ./scripts/analyze-ai-agent-runs.ts --chatId=<uuid>   (todas as runs de um chat)
 */

type ScriptArgs = {
	days: number;
	orgId: string | null;
	chatId: string | null;
	limit: number;
	out: string;
	maxFieldLength: number;
};

const LOG = "[AI_AGENT_RUNS_ANALYSIS]";

function getArgValue(name: string) {
	const prefix = `--${name}=`;
	const inlineArg = process.argv.find((argument) => argument.startsWith(prefix));
	if (inlineArg) return inlineArg.slice(prefix.length);

	const index = process.argv.indexOf(`--${name}`);
	if (index >= 0 && process.argv[index + 1] && !process.argv[index + 1].startsWith("--")) return process.argv[index + 1];
	return null;
}

function parseArgs(): ScriptArgs {
	return {
		days: Number(getArgValue("days") ?? 7),
		orgId: getArgValue("orgId"),
		chatId: getArgValue("chatId"),
		limit: Number(getArgValue("limit") ?? 200),
		out: getArgValue("out") ?? "./ai-agent-runs-report.md",
		maxFieldLength: Number(getArgValue("maxFieldLength") ?? 4000),
	};
}

function truncate(value: unknown, maxLength: number) {
	const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
	if (!text) return "";
	if (text.length <= maxLength) return text;
	return `${text.slice(0, maxLength)}\n… [truncado: ${text.length - maxLength} caracteres omitidos]`;
}

function formatDate(date: Date | string | null | undefined) {
	if (!date) return "—";
	return new Date(date).toISOString().replace("T", " ").slice(0, 19);
}

function durationSeconds(start: Date | null, end: Date | null) {
	if (!start || !end) return null;
	return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 100) / 10;
}

async function main() {
	const args = parseArgs();
	const since = new Date(Date.now() - args.days * 24 * 60 * 60 * 1000);

	console.log(`${LOG} Buscando runs desde ${formatDate(since)} (limite ${args.limit})...`);

	const runFilters = [gte(aiAgentRuns.dataInsercao, since)];
	if (args.orgId) runFilters.push(eq(aiAgentRuns.organizacaoId, args.orgId));
	if (args.chatId) runFilters.push(eq(aiAgentRuns.chatId, args.chatId));

	const runs = await db
		.select()
		.from(aiAgentRuns)
		.where(and(...runFilters))
		.orderBy(desc(aiAgentRuns.dataInsercao))
		.limit(args.limit);

	if (runs.length === 0) {
		console.log(`${LOG} Nenhuma run encontrada no período.`);
		return;
	}

	const runIds = runs.map((run) => run.id);
	const chatIds = [...new Set(runs.map((run) => run.chatId))];

	const [chatRows, toolCalls, operations, messages] = await Promise.all([
		db
			.select({
				id: chats.id,
				origem: chats.origem,
				clienteId: chats.clienteId,
				clienteNome: clients.nome,
			})
			.from(chats)
			.leftJoin(clients, eq(chats.clienteId, clients.id))
			.where(inArray(chats.id, chatIds)),
		db.select().from(aiAgentToolCalls).where(inArray(aiAgentToolCalls.runId, runIds)).orderBy(aiAgentToolCalls.dataInsercao),
		db.select().from(aiAgentOperations).where(inArray(aiAgentOperations.runId, runIds)).orderBy(aiAgentOperations.dataInsercao),
		db
			.select({
				id: chatMessages.id,
				chatId: chatMessages.chatId,
				autorTipo: chatMessages.autorTipo,
				conteudoTexto: chatMessages.conteudoTexto,
				conteudoMidiaTipo: chatMessages.conteudoMidiaTipo,
				dataEnvio: chatMessages.dataEnvio,
			})
			.from(chatMessages)
			.where(inArray(chatMessages.chatId, chatIds))
			.orderBy(chatMessages.dataEnvio),
	]);

	const chatById = new Map(chatRows.map((chat) => [chat.id, chat]));

	const toolCallsByRun = new Map<string, typeof toolCalls>();
	for (const call of toolCalls) {
		const list = toolCallsByRun.get(call.runId) ?? [];
		list.push(call);
		toolCallsByRun.set(call.runId, list);
	}
	const operationsByRun = new Map<string, typeof operations>();
	for (const operation of operations) {
		if (!operation.runId) continue;
		const list = operationsByRun.get(operation.runId) ?? [];
		list.push(operation);
		operationsByRun.set(operation.runId, list);
	}
	const messagesByChat = new Map<string, typeof messages>();
	for (const message of messages) {
		const list = messagesByChat.get(message.chatId) ?? [];
		list.push(message);
		messagesByChat.set(message.chatId, list);
	}

	// ============================================================================
	// ESTATÍSTICAS AGREGADAS
	// ============================================================================

	const lines: string[] = [];
	lines.push(`# Diagnóstico de runs do agente de IA`);
	lines.push(``);
	lines.push(`- Período: últimos ${args.days} dias (desde ${formatDate(since)})`);
	lines.push(`- Runs analisadas: ${runs.length}${args.orgId ? ` | org: ${args.orgId}` : ""}${args.chatId ? ` | chat: ${args.chatId}` : ""}`);
	lines.push(``);

	const runsByStatus = new Map<string, number>();
	for (const run of runs) runsByStatus.set(run.status, (runsByStatus.get(run.status) ?? 0) + 1);
	lines.push(`## Runs por status`);
	lines.push(``);
	for (const [status, count] of [...runsByStatus.entries()].sort((a, b) => b[1] - a[1])) {
		lines.push(`- ${status}: ${count}`);
	}
	lines.push(``);

	const toolCallStats = new Map<string, { total: number; falhas: number; erros: Map<string, number> }>();
	for (const call of toolCalls) {
		const stats = toolCallStats.get(call.ferramentaNome) ?? { total: 0, falhas: 0, erros: new Map() };
		stats.total += 1;
		if (call.status !== "CONCLUIDO") {
			stats.falhas += 1;
			const errorKey = (call.erro ?? `status=${call.status} sem erro registrado`).slice(0, 160);
			stats.erros.set(errorKey, (stats.erros.get(errorKey) ?? 0) + 1);
		}
		toolCallStats.set(call.ferramentaNome, stats);
	}
	lines.push(`## Tool calls por ferramenta`);
	lines.push(``);
	for (const [name, stats] of [...toolCallStats.entries()].sort((a, b) => b[1].total - a[1].total)) {
		lines.push(`- **${name}**: ${stats.total} chamadas, ${stats.falhas} não concluídas`);
		for (const [error, count] of [...stats.erros.entries()].sort((a, b) => b[1] - a[1])) {
			lines.push(`  - ${count}x: ${error}`);
		}
	}
	lines.push(``);

	// Uso do filtro de preço: a métrica que expôs a falha original (56 de 57 chamadas com faixa
	// inventada). Reconhece o contrato atual (`faixaPreco`) e o legado (`precoMin`/`precoMax`),
	// para que runs anteriores à mudança continuem comparáveis.
	const productCalls = toolCalls.filter((call) => call.ferramentaNome === "produtos.consultar");
	const callsWithPriceRange = productCalls.filter((call) => {
		const input = call.input as Record<string, unknown> | null;
		return Boolean(input && (input.faixaPreco !== undefined || input.precoMin !== undefined || input.precoMax !== undefined));
	});
	const callsWithLegacyPriceRange = callsWithPriceRange.filter((call) => {
		const input = call.input as Record<string, unknown> | null;
		return Boolean(input && (input.precoMin !== undefined || input.precoMax !== undefined));
	});
	// A ferramenta sinaliza no output quando descartou a faixa por falta de pedido do cliente.
	const callsWithDiscardedRange = productCalls.filter((call) => {
		const output = call.output as { result?: Record<string, unknown> } | null;
		const result = output?.result;
		return Boolean(result && (result.faixaPrecoIgnorada === true || Array.isArray(result.filtrosIgnorados)));
	});
	lines.push(`## produtos.consultar — uso de filtro de preço`);
	lines.push(``);
	lines.push(`- Total de chamadas: ${productCalls.length}`);
	lines.push(
		`- Chamadas com faixa de preço: ${callsWithPriceRange.length}${
			callsWithLegacyPriceRange.length > 0 ? ` (${callsWithLegacyPriceRange.length} no contrato legado precoMin/precoMax)` : ""
		}`,
	);
	lines.push(`- Faixas descartadas pela ferramenta (cliente não pediu): ${callsWithDiscardedRange.length}`);
	lines.push(``);

	const runErrors = new Map<string, number>();
	for (const run of runs) {
		if (!run.erro) continue;
		const key = run.erro.slice(0, 200);
		runErrors.set(key, (runErrors.get(key) ?? 0) + 1);
	}
	if (runErrors.size > 0) {
		lines.push(`## Erros de run mais comuns`);
		lines.push(``);
		for (const [error, count] of [...runErrors.entries()].sort((a, b) => b[1] - a[1])) {
			lines.push(`- ${count}x: ${error}`);
		}
		lines.push(``);
	}

	// ============================================================================
	// DETALHE POR RUN
	// ============================================================================

	lines.push(`---`);
	lines.push(``);
	lines.push(`# Detalhe das runs (mais recentes primeiro)`);
	lines.push(``);

	for (const run of runs) {
		const runToolCalls = toolCallsByRun.get(run.id) ?? [];
		const runOperations = operationsByRun.get(run.id) ?? [];
		const chatHistory = messagesByChat.get(run.chatId) ?? [];
		const duration = durationSeconds(run.dataInicio, run.dataFim);
		const uso = run.uso as Record<string, unknown> | null;
		const configSnapshot = run.configSnapshot as Record<string, unknown> | null;
		const modelo =
			configSnapshot && typeof configSnapshot.modeloConfig === "object" && configSnapshot.modeloConfig
				? JSON.stringify(configSnapshot.modeloConfig)
				: "—";

		lines.push(`## Run ${run.id}`);
		lines.push(``);
		lines.push(`- **Status**: ${run.status}${run.erro ? ` | **Erro**: ${truncate(run.erro, 600)}` : ""}`);
		lines.push(`- **Quando**: ${formatDate(run.dataInsercao)} | duração: ${duration !== null ? `${duration}s` : "—"}`);
		const chat = chatById.get(run.chatId);
		lines.push(`- **Gatilho**: ${run.gatilho} | chat: ${run.chatId} (${chat?.origem ?? "?"}) | cliente: ${chat?.clienteNome ?? run.clienteId ?? "—"}`);
		lines.push(`- **Modelo**: ${modelo}`);
		if (uso) lines.push(`- **Uso**: ${JSON.stringify(uso)}`);
		lines.push(``);

		// Transcrição do chat até o fim da run (contexto que o agente viu + resposta).
		const runEnd = run.dataFim ?? run.dataInsercao;
		const relevantMessages = chatHistory.filter((message) => new Date(message.dataEnvio).getTime() <= new Date(runEnd).getTime() + 60 * 1000);
		const transcriptWindow = relevantMessages.slice(-30);
		lines.push(`### Conversa (últimas ${transcriptWindow.length} de ${relevantMessages.length} mensagens até a run)`);
		lines.push(``);
		for (const message of transcriptWindow) {
			const author = message.autorTipo === "CLIENTE" ? "🧑 CLIENTE" : message.autorTipo === "AI" ? "🤖 AGENTE" : `👤 ${message.autorTipo}`;
			const isTriggerMessage = message.id === run.mensagemGatilhoId ? " ⬅️ GATILHO" : "";
			const isSentMessage = message.id === run.mensagemEnviadaId ? " ⬅️ RESPOSTA DESTA RUN" : "";
			const content = message.conteudoTexto ?? `[mídia: ${message.conteudoMidiaTipo}]`;
			lines.push(`- \`${formatDate(message.dataEnvio)}\` **${author}**${isTriggerMessage}${isSentMessage}: ${truncate(content, 1200)}`);
		}
		lines.push(``);

		if (runToolCalls.length > 0) {
			lines.push(`### Tool calls (${runToolCalls.length})`);
			lines.push(``);
			for (const [callIndex, call] of runToolCalls.entries()) {
				lines.push(`#### ${callIndex + 1}. ${call.ferramentaNome} — ${call.status} (${formatDate(call.dataInsercao)})`);
				lines.push(``);
				lines.push(`**Input:**`);
				lines.push("```json");
				lines.push(truncate(call.input ?? {}, args.maxFieldLength));
				lines.push("```");
				if (call.erro) {
					lines.push(`**Erro:** ${truncate(call.erro, 1000)}`);
				}
				lines.push(`**Output:**`);
				lines.push("```json");
				lines.push(truncate(call.output ?? null, args.maxFieldLength));
				lines.push("```");
				lines.push(``);
			}
		} else {
			lines.push(`### Tool calls: nenhuma`);
			lines.push(``);
		}

		if (runOperations.length > 0) {
			lines.push(`### Operações duráveis (${runOperations.length})`);
			lines.push(``);
			for (const operation of runOperations) {
				lines.push(
					`- **${operation.tipo}** — ${operation.status} | recurso: ${operation.recursoTipo ?? "—"}/${operation.recursoId ?? "—"}${operation.erro ? ` | erro: ${truncate(operation.erro, 400)}` : ""}`,
				);
			}
			lines.push(``);
		}

		if (run.outputResumo) {
			lines.push(`### Resumo do output`);
			lines.push(``);
			lines.push(truncate(run.outputResumo, args.maxFieldLength));
			lines.push(``);
		}

		lines.push(`---`);
		lines.push(``);
	}

	writeFileSync(args.out, lines.join("\n"), "utf-8");
	console.log(`${LOG} Relatório com ${runs.length} runs gravado em ${args.out}`);
}

main()
	.catch((error) => {
		console.error(`${LOG} Falha:`, error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await connection.end();
	});
