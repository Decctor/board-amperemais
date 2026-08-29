import "dotenv/config";
import { ensureNativeAccessClients, getDefaultAgentAccessScopes } from "@/lib/access/clients-catalog";
import { provisionAgentPrincipal } from "@/lib/access/credentials";
import { connection, db } from "@/services/drizzle";
import { organizations } from "@/services/drizzle/schema";
import { eq, or } from "drizzle-orm";

/**
 * Emite uma credencial de agente de IA (MCP) — o caminho de provisionamento enquanto a tela de
 * "Conexões de IA" não existe (fase 1 do plano).
 *
 * Uso:
 *   npm run access:issue-agent -- --client AGENT_CLAUDE --org minha-loja --nome "Claude do João"
 *   npm run access:issue-agent -- --client AGENT_CONTROL --plataforma --nome "Agentes do Control"
 *
 * Flags:
 *   --client     Código da aplicação (AGENT_CLAUDE | AGENT_CHATGPT | AGENT_CONTROL)
 *   --org        Id ou slug da organização (modo ORG)
 *   --plataforma Sem organização — enxerga todas (modo PLATAFORMA)
 *   --nome       Nome do principal, como aparece na auditoria
 *   --scopes     Lista separada por vírgula; padrão é a leitura completa do agente
 */

function readFlag(name: string): string | null {
	const index = process.argv.indexOf(`--${name}`);
	if (index === -1) return null;
	const value = process.argv[index + 1];
	return value && !value.startsWith("--") ? value : null;
}

function hasFlag(name: string) {
	return process.argv.includes(`--${name}`);
}

async function main() {
	const accessClientCodigo = readFlag("client");
	const orgReference = readFlag("org");
	const isPlatform = hasFlag("plataforma");
	const nome = readFlag("nome");
	const scopesFlag = readFlag("scopes");

	if (!accessClientCodigo) throw new Error("Informe --client (ex.: AGENT_CLAUDE).");
	if (!nome) throw new Error("Informe --nome para identificar esta conexão na auditoria.");
	if (isPlatform && orgReference) throw new Error("Use --org OU --plataforma, nunca os dois.");
	if (!isPlatform && !orgReference) throw new Error("Informe --org <id|slug> ou --plataforma.");
	if (isPlatform && accessClientCodigo !== "AGENT_CONTROL") {
		throw new Error("Modo plataforma é restrito ao cliente AGENT_CONTROL.");
	}

	// Garante que as aplicações do catálogo existam antes de referenciá-las.
	await ensureNativeAccessClients();

	let organizacaoId: string | null = null;
	if (orgReference) {
		const organization = await db.query.organizations.findFirst({
			where: or(eq(organizations.id, orgReference), eq(organizations.slug, orgReference)),
			columns: { id: true, nome: true },
		});
		if (!organization) throw new Error(`Organização não encontrada: ${orgReference}.`);
		organizacaoId = organization.id;
		console.log(`[ACESSO] Organização: ${organization.nome} (${organization.id})`);
	} else {
		console.log("[ACESSO] Principal de PLATAFORMA — enxerga todas as organizações.");
	}

	const scopes = scopesFlag
		? scopesFlag
				.split(",")
				.map((scope) => scope.trim())
				.filter(Boolean)
		: getDefaultAgentAccessScopes({ isPlatform });

	const result = await provisionAgentPrincipal({
		accessClientCodigo,
		organizacaoId,
		nome,
		scopes,
		descricao: "Credencial emitida via scripts/issue-agent-credential.ts.",
	});

	console.log(`\n[ACESSO] Principal criado: ${result.principal.nome} (${result.principal.id}) — tipo ${result.principal.tipo}`);
	console.log(`[ACESSO] Scopes concedidos: ${result.scopes.join(", ")}`);
	console.log("\n=== TOKEN (exibido uma única vez) ===");
	console.log(result.token);
	console.log("=====================================");
	console.log("\nConfigure no cliente MCP como header:");
	console.log(`  Authorization: Bearer ${result.token}`);
	console.log(`  Endpoint: ${process.env.NEXT_PUBLIC_APP_URL ?? "https://SEU-DOMINIO"}/api/mcp\n`);
}

main()
	.catch((error) => {
		console.error("[ACESSO] Erro ao emitir credencial:", error instanceof Error ? error.message : error);
		process.exitCode = 1;
	})
	.finally(() => connection.end());
