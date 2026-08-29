import "dotenv/config";
import { ensureNativeAccessClients, getDefaultAgentAccessScopes } from "@/lib/access/clients-catalog";
import { recordAccessEvent } from "@/lib/access/events";
import { connection, db } from "@/services/drizzle";
import { accessGrants, accessPrincipals } from "@/services/drizzle/schema";
import { eq } from "drizzle-orm";

function readFlag(name: string): string | null {
	const index = process.argv.indexOf(`--${name}`);
	if (index === -1) return null;
	const value = process.argv[index + 1];
	return value && !value.startsWith("--") ? value : null;
}

async function main() {
	const principalId = readFlag("principal");
	if (!principalId) throw new Error("Informe --principal <id>.");

	const target = await db.query.accessPrincipals.findFirst({
		where: eq(accessPrincipals.id, principalId),
		with: { cliente: true, grants: true },
	});
	if (!target) throw new Error(`Principal não encontrado: ${principalId}.`);
	if (target.tipo !== "CONTA_PLATAFORMA" || target.organizacaoId !== null) {
		throw new Error("O principal informado não é uma CONTA_PLATAFORMA sem organização.");
	}
	if (target.cliente.codigo !== "AGENT_CONTROL") {
		throw new Error("Acesso de plataforma só pode ser concedido a principals do cliente AGENT_CONTROL.");
	}
	if (target.status !== "ATIVO" || target.dataRevogacao) throw new Error("O principal informado está inativo ou revogado.");

	// Só atualiza o teto depois de confirmar exatamente qual principal será alterado.
	await ensureNativeAccessClients();
	const principal = await db.query.accessPrincipals.findFirst({
		where: eq(accessPrincipals.id, principalId),
		with: { cliente: true, grants: true },
	});
	if (!principal) throw new Error("Principal deixou de existir durante a atualização do catálogo.");

	const scopes = getDefaultAgentAccessScopes({ isPlatform: true });
	const forbiddenScopes = scopes.filter((scope) => !principal.cliente.escoposPermitidos.includes(scope));
	if (forbiddenScopes.length > 0) throw new Error(`Scopes fora do teto atualizado do AGENT_CONTROL: ${forbiddenScopes.join(", ")}.`);

	await db.transaction(async (tx) => {
		for (const scope of scopes) {
			await tx
				.insert(accessGrants)
				.values({ principalId: principal.id, scope, concedidoPorId: null })
				.onConflictDoUpdate({
					target: [accessGrants.principalId, accessGrants.scope],
					set: { dataRevogacao: null, concedidoPorId: null },
				});
		}
	});

	const previouslyActive = new Set(principal.grants.filter((grant) => !grant.dataRevogacao).map((grant) => grant.scope));
	for (const scope of scopes.filter((scope) => !previouslyActive.has(scope))) {
		await recordAccessEvent({
			tipo: "SCOPE_CONCEDIDO",
			principalId: principal.id,
			metadados: { scope, origem: "grant-platform-agent-access" },
		});
	}

	const updated = await db.query.accessPrincipals.findFirst({
		where: eq(accessPrincipals.id, principal.id),
		columns: { id: true, nome: true, tipo: true, organizacaoId: true },
		with: { grants: { columns: { scope: true, dataRevogacao: true } } },
	});
	if (!updated) throw new Error("Principal não encontrado depois da atualização.");

	console.log("[ACESSO] Principal de plataforma atualizado:", {
		id: updated.id,
		nome: updated.nome,
		tipo: updated.tipo,
		organizacaoId: updated.organizacaoId,
		scopesAtivos: updated.grants
			.filter((grant) => !grant.dataRevogacao)
			.map((grant) => grant.scope)
			.sort(),
	});
}

main()
	.catch((error) => {
		console.error("[ACESSO] Falha ao conceder acesso de plataforma:", error instanceof Error ? error.message : error);
		process.exitCode = 1;
	})
	.finally(() => connection.end());
