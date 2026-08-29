import { db } from "@/services/drizzle";
import { organizationMembers, organizations } from "@/services/drizzle/schema";
import { and, eq, or } from "drizzle-orm";
import createHttpError from "http-errors";
import type { TAgentActorContext } from "./types";

/**
 * O único lugar onde a organização de uma chamada é decidida.
 *
 * Toda ferramenta que toca dado de organização passa por aqui, e é por isso que existe exatamente
 * um ponto onde a tenancy pode dar errado — em vez de um por ferramenta. Nenhuma ferramenta lê
 * `input.organizacaoId` diretamente.
 *
 * - Em **ORG**, a organização vem do principal. Um `organizacaoId` diferente do próprio não é um
 *   404: é uma sondagem, e vira 403 auditável.
 * - Em **PLATAFORMA**, `organizacaoId` é obrigatório enquanto não existirem as ferramentas
 *   `platform_*`. Agregar a base inteira por omissão de argumento seria uma varredura acidental
 *   de todas as organizações — o modelo omite argumento opcional o tempo todo.
 */
export async function resolveOrganizationScope(actor: TAgentActorContext, requested?: string | null): Promise<string> {
	const normalizedRequest = requested?.trim() || null;

	if (actor.mode === "ORG") {
		if (!actor.organizationId) {
			// Invariante do modelo de acesso: um principal em modo ORG sempre tem organização.
			throw new createHttpError.InternalServerError("Conexão em modo organização sem organização vinculada.");
		}
		if (normalizedRequest && normalizedRequest !== actor.organizationId) {
			throw new createHttpError.Forbidden("Esta conexão só tem acesso à própria organização.");
		}
		return actor.organizationId;
	}

	if (!normalizedRequest) {
		throw new createHttpError.BadRequest(
			"Informe `organizacaoId` — esta é uma conexão de plataforma e não tem uma organização padrão. Use o id ou o slug da organização.",
		);
	}

	// Aceita id ou slug: em modo plataforma o modelo acabou de ler um nome numa lista, e um slug
	// é muito mais recuperável para ele do que um UUID.
	const organization = await db.query.organizations.findFirst({
		where: or(eq(organizations.id, normalizedRequest), eq(organizations.slug, normalizedRequest)),
		columns: { id: true },
	});
	if (!organization) throw new createHttpError.NotFound(`Organização não encontrada: ${normalizedRequest}.`);

	return organization.id;
}

/**
 * Um agente só enxerga PII de cliente com o scope dedicado. Telefone e documento saem
 * mascarados por padrão: "quantos clientes em risco?" não precisa de telefone nenhum, e o
 * vazamento por agente é vazamento igual.
 */
export function canReadClientPii(actor: TAgentActorContext) {
	return actor.scopes.has("agent:clients:pii");
}

/**
 * Toda mutação responde por um humano, e esse humano precisa pertencer à organização alvo.
 *
 * Em modo PLATAFORMA há uma segunda condição: a organização precisa estar sob gestão nossa
 * (`consultoriaAtiva`). Pertencer a uma organização não é o mesmo que operá-la — sem esse
 * segundo gate, um vínculo incidental viraria permissão de escrita vinda de uma credencial que
 * atravessa a base inteira. O corolário operacional é o que se quer: encerrada a consultoria, o
 * agente perde a escrita naquela conta sem ninguém mexer em credencial.
 */
export async function resolveResponsibleUser(actor: TAgentActorContext, organizationId: string) {
	if (!actor.responsibleUserId) {
		throw new createHttpError.PreconditionFailed("Esta conexão não possui um usuário responsável configurado.");
	}
	const membership = await db.query.organizationMembers.findFirst({
		where: and(eq(organizationMembers.organizacaoId, organizationId), eq(organizationMembers.usuarioId, actor.responsibleUserId)),
		columns: { id: true },
	});
	if (!membership) {
		throw new createHttpError.PreconditionFailed("O usuário responsável pela conexão não pertence à organização selecionada.");
	}

	if (actor.mode === "PLATAFORMA") {
		const organization = await db.query.organizations.findFirst({
			where: eq(organizations.id, organizationId),
			columns: { consultoriaAtiva: true },
		});
		if (!organization?.consultoriaAtiva) {
			throw new createHttpError.PreconditionFailed(
				"Esta organização não está sob gestão assistida: uma conexão de plataforma só executa mutações em contas gerenciadas.",
			);
		}
	}

	return actor.responsibleUserId;
}

/** Mantém os últimos dígitos para o humano reconhecer o registro sem expor o contato. */
export function maskSensitiveValue(value: string | null | undefined, visibleSuffixLength = 4) {
	if (!value) return null;
	const trimmed = value.trim();
	if (trimmed.length <= visibleSuffixLength) return "•".repeat(trimmed.length);
	return `${"•".repeat(Math.max(trimmed.length - visibleSuffixLength, 3))}${trimmed.slice(-visibleSuffixLength)}`;
}
