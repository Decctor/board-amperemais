import "dotenv/config";
import { AGENT_MUTATION_ACCESS_SCOPES, ensureNativeAccessClients } from "@/lib/access/clients-catalog";
import { recordAccessEvent } from "@/lib/access/events";
import { connection, db } from "@/services/drizzle";
import { accessGrants, accessPrincipals, organizationMembers, users } from "@/services/drizzle/schema";
import { and, eq, or } from "drizzle-orm";

function readFlag(name: string): string | null {
	const index = process.argv.indexOf(`--${name}`);
	if (index === -1) return null;
	const value = process.argv[index + 1];
	return value && !value.startsWith("--") ? value : null;
}

async function main() {
	const principalId = readFlag("principal");
	const responsibleReference = readFlag("responsavel");
	if (!principalId) throw new Error("Informe --principal <id>.");
	if (!responsibleReference) throw new Error("Informe --responsavel <id|email>.");

	await ensureNativeAccessClients();
	const principal = await db.query.accessPrincipals.findFirst({
		where: eq(accessPrincipals.id, principalId),
		with: { cliente: true },
	});
	if (!principal) throw new Error(`Principal não encontrado: ${principalId}.`);
	if (!["CONTA_SERVICO", "CONTA_PLATAFORMA"].includes(principal.tipo)) throw new Error("O principal informado não é uma conexão MCP.");
	if (principal.status !== "ATIVO" || principal.dataRevogacao) throw new Error("O principal está inativo ou revogado.");

	const responsible = await db.query.users.findFirst({
		where: or(eq(users.id, responsibleReference), eq(users.email, responsibleReference)),
		columns: { id: true, nome: true, email: true },
	});
	if (!responsible) throw new Error(`Usuário responsável não encontrado: ${responsibleReference}.`);
	if (principal.organizacaoId) {
		const membership = await db.query.organizationMembers.findFirst({
			where: and(eq(organizationMembers.organizacaoId, principal.organizacaoId), eq(organizationMembers.usuarioId, responsible.id)),
			columns: { id: true },
		});
		if (!membership) throw new Error("O usuário responsável não pertence à organização do principal.");
	}

	const grantedScopes = [...AGENT_MUTATION_ACCESS_SCOPES, "agent:members:read", "agent:message-templates:read"] as const;
	const forbidden = grantedScopes.filter((scope) => !principal.cliente.escoposPermitidos.includes(scope));
	if (forbidden.length > 0) throw new Error(`Scopes fora do teto atualizado do cliente: ${forbidden.join(", ")}.`);

	await db.transaction(async (tx) => {
		await tx
			.update(accessPrincipals)
			.set({ responsavelUsuarioId: responsible.id, dataAtualizacao: new Date() })
			.where(eq(accessPrincipals.id, principal.id));
		for (const scope of grantedScopes) {
			await tx
				.insert(accessGrants)
				.values({ principalId: principal.id, scope, concedidoPorId: responsible.id })
				.onConflictDoUpdate({
					target: [accessGrants.principalId, accessGrants.scope],
					set: { dataRevogacao: null, concedidoPorId: responsible.id },
				});
		}
	});

	await recordAccessEvent({
		tipo: "MUTACOES_AGENTE_CONFIGURADAS",
		organizacaoId: principal.organizacaoId,
		principalId: principal.id,
		metadados: { responsavelUsuarioId: responsible.id, scopes: grantedScopes },
	});
	console.log("[ACESSO] Mutações MCP configuradas", {
		principalId: principal.id,
		responsavel: `${responsible.nome} <${responsible.email}>`,
		scopes: grantedScopes,
		aviso: principal.tipo === "CONTA_PLATAFORMA" ? "O responsável ainda precisa pertencer a cada organização alvo." : undefined,
	});
}

main()
	.catch((error) => {
		console.error("[ACESSO] Falha ao configurar mutações:", error instanceof Error ? error.message : error);
		process.exitCode = 1;
	})
	.finally(() => connection.end());
