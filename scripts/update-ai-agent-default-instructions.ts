import "dotenv/config";
import { buildDefaultAgentInstructions } from "@/lib/ai/agent/provisioning";
import { connection, db } from "@/services/drizzle";
import { aiAgents, organizations } from "@/services/drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Atualiza as instruções dos agentes que ainda carregam um default antigo.
 *
 * O provisionamento é lazy: `buildDefaultAgentInstructions` só roda na criação do agente, então
 * mudar o texto padrão não alcança quem já existe. Este script fecha essa lacuna.
 *
 * A comparação é byte a byte contra os defaults históricos (com o nome da organização
 * interpolado). Instrução que não casa com nenhum deles foi personalizada pela organização e é
 * preservada — sobrescrevê-la exige `--orgId` + `--force`, um por um.
 *
 * Uso:
 *   npx tsx ./scripts/update-ai-agent-default-instructions.ts
 *   npx tsx ./scripts/update-ai-agent-default-instructions.ts --apply
 *   npx tsx ./scripts/update-ai-agent-default-instructions.ts --orgId=<uuid> --force --apply
 */

const LOG = "[AI_AGENT_INSTRUCTIONS]";

/**
 * Defaults históricos, do mais antigo para o mais recente. Ao mudar
 * `buildDefaultAgentInstructions`, acrescente aqui o texto que saiu de circulação — é isso que
 * permite reconhecer um agente "nunca personalizado" em qualquer geração.
 */
const LEGACY_DEFAULT_INSTRUCTION_BUILDERS: Array<(nomeOrganizacao: string) => string> = [
	// v1 (até julho/2026): atendente reativo. O "responda apenas o que foi perguntado" tornava o
	// agente inquisitivo — ele acumulava perguntas em vez de mostrar produtos.
	(nomeOrganizacao) => `Você é o assistente virtual de atendimento da ${nomeOrganizacao}, conversando com clientes pelo WhatsApp.

## Como você atende
- Seja cordial, direto e resolutivo. Fale como uma pessoa da equipe, não como um robô.
- Trate o cliente pelo nome quando souber.
- Responda apenas o que foi perguntado; não despeje informação que ninguém pediu.
- Se não souber ou não tiver como confirmar algo, diga isso com naturalidade e ofereça
  encaminhar para um atendente.

## O que você NÃO faz
- Não invente preços, prazos, estoque, políticas ou promoções. Toda informação factual vem das
  suas ferramentas ou da base de conhecimento.
- Não prometa descontos, exceções ou condições comerciais por conta própria.
- Não peça dados sensíveis (senha, cartão, documentos) em nenhuma hipótese.`,
];

function getArgValue(name: string) {
	const prefix = `--${name}=`;
	const inlineArg = process.argv.find((argument) => argument.startsWith(prefix));
	if (inlineArg) return inlineArg.slice(prefix.length);

	const index = process.argv.indexOf(`--${name}`);
	if (index >= 0 && process.argv[index + 1] && !process.argv[index + 1].startsWith("--")) return process.argv[index + 1];
	return null;
}

function hasFlag(name: string) {
	return process.argv.includes(`--${name}`);
}

function isLegacyDefault(instrucoes: string, nomeOrganizacao: string) {
	return LEGACY_DEFAULT_INSTRUCTION_BUILDERS.some((build) => build(nomeOrganizacao).trim() === instrucoes.trim());
}

async function main() {
	const apply = hasFlag("apply");
	const force = hasFlag("force");
	const orgId = getArgValue("orgId");

	if (force && !orgId) {
		console.error(`${LOG} --force exige --orgId: sobrescrever instrução personalizada é decisão por organização.`);
		process.exitCode = 1;
		return;
	}

	const agents = await db
		.select({
			id: aiAgents.id,
			organizacaoId: aiAgents.organizacaoId,
			organizacaoNome: organizations.nome,
			instrucoes: aiAgents.instrucoes,
		})
		.from(aiAgents)
		.innerJoin(organizations, eq(aiAgents.organizacaoId, organizations.id))
		.where(orgId ? eq(aiAgents.organizacaoId, orgId) : undefined);

	if (agents.length === 0) {
		console.log(`${LOG} Nenhum agente encontrado${orgId ? ` para a organização ${orgId}` : ""}.`);
		return;
	}

	const planned: Array<{ id: string; organizacaoNome: string; motivo: string; novasInstrucoes: string }> = [];
	const skipped: Array<{ organizacaoNome: string; motivo: string }> = [];

	for (const agent of agents) {
		const novasInstrucoes = buildDefaultAgentInstructions(agent.organizacaoNome);

		if (agent.instrucoes.trim() === novasInstrucoes.trim()) {
			skipped.push({ organizacaoNome: agent.organizacaoNome, motivo: "já está no default atual" });
			continue;
		}
		if (isLegacyDefault(agent.instrucoes, agent.organizacaoNome)) {
			planned.push({ id: agent.id, organizacaoNome: agent.organizacaoNome, motivo: "default antigo", novasInstrucoes });
			continue;
		}
		if (force) {
			planned.push({ id: agent.id, organizacaoNome: agent.organizacaoNome, motivo: "personalizado, sobrescrito por --force", novasInstrucoes });
			continue;
		}
		skipped.push({ organizacaoNome: agent.organizacaoNome, motivo: "personalizado pela organização (use --orgId + --force para sobrescrever)" });
	}

	console.log(`${LOG} ${agents.length} agente(s) analisado(s): ${planned.length} a atualizar, ${skipped.length} preservado(s).`);
	for (const item of planned) console.log(`  ATUALIZAR  ${item.organizacaoNome} — ${item.motivo}`);
	for (const item of skipped) console.log(`  PRESERVAR  ${item.organizacaoNome} — ${item.motivo}`);

	if (planned.length === 0) return;

	if (!apply) {
		console.log(`\n${LOG} Execução somente leitura. Repita com --apply para gravar.`);
		console.log(`\n${LOG} Instruções que seriam aplicadas a ${planned[0]?.organizacaoNome}:\n`);
		console.log(planned[0]?.novasInstrucoes);
		return;
	}

	for (const item of planned) {
		await db.update(aiAgents).set({ instrucoes: item.novasInstrucoes }).where(eq(aiAgents.id, item.id));
		console.log(`${LOG} Instruções atualizadas: ${item.organizacaoNome}`);
	}
}

main()
	.catch((error) => {
		console.error(`${LOG} Falha:`, error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await connection.end();
	});
