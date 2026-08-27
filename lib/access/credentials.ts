import { db } from "@/services/drizzle";
import { accessClients, accessCredentials, accessGrants, accessPrincipals } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { and, eq, isNull } from "drizzle-orm";
import createHttpError from "http-errors";
import { recordAccessEvent } from "./events";
import { generateAccessCredentialToken } from "./tokens";

// Janela de sobreposição da rotação: a credencial anterior continua válida por este período,
// permitindo que o dispositivo troque para a nova sem interrupção de operação (§9.3 do plano).
const ROTATION_OVERLAP_HOURS = 24;

type TRotatePrincipalCredentialParams = {
	principalId: string;
	organizacaoId: string;
	descricao?: string | null;
	enderecoIp?: string | null;
	userAgent?: string | null;
};
export async function rotatePrincipalCredential(params: TRotatePrincipalCredentialParams) {
	const principal = await db.query.accessPrincipals.findFirst({
		where: and(eq(accessPrincipals.id, params.principalId), eq(accessPrincipals.organizacaoId, params.organizacaoId)),
		with: {
			credenciais: {
				where: (fields, { isNull: whereIsNull }) => whereIsNull(fields.dataRevogacao),
				// Durante a janela de sobreposição pode haver mais de uma ativa — encadeia sempre a mais recente.
				orderBy: (fields, { desc }) => desc(fields.dataInsercao),
			},
		},
	});
	if (!principal) throw new createHttpError.NotFound("Dispositivo não encontrado.");
	if (principal.status !== "ATIVO" || principal.dataRevogacao) throw new createHttpError.BadRequest("Dispositivo revogado ou inativo.");

	const activeCredential = principal.credenciais[0];
	const credentialType = principal.tipo === "CONTA_SERVICO" ? ("CHAVE_API" as const) : ("TOKEN_DISPOSITIVO" as const);
	const generated = generateAccessCredentialToken({ tipo: credentialType });

	const newCredentialId = await db.transaction(async (tx) => {
		const [newCredential] = await tx
			.insert(accessCredentials)
			.values({
				principalId: principal.id,
				tipo: credentialType,
				idPublico: generated.idPublico,
				prefixoExibicao: generated.prefixoExibicao,
				hashSegredo: generated.hashSegredo,
				descricao: params.descricao ?? "Credencial criada por rotação.",
			})
			.returning({ id: accessCredentials.id });

		if (activeCredential) {
			const overlapEnd = dayjs().add(ROTATION_OVERLAP_HOURS, "hours").toDate();
			await tx
				.update(accessCredentials)
				.set({
					substituidaPorId: newCredential.id,
					// Se a credencial anterior já expiraria antes, o prazo menor prevalece.
					expiraEm: activeCredential.expiraEm && dayjs(activeCredential.expiraEm).isBefore(overlapEnd) ? activeCredential.expiraEm : overlapEnd,
				})
				.where(eq(accessCredentials.id, activeCredential.id));
		}

		return newCredential.id;
	});

	await recordAccessEvent({
		tipo: "CREDENCIAL_ROTACIONADA",
		organizacaoId: principal.organizacaoId,
		principalId: principal.id,
		credencialId: newCredentialId,
		enderecoIp: params.enderecoIp,
		userAgent: params.userAgent,
		metadados: { credencialAnteriorId: activeCredential?.id ?? null },
	});

	// O token é devolvido uma única vez.
	return { token: generated.token, credentialId: newCredentialId, principalId: principal.id };
}

type TRevokePrincipalParams = {
	principalId: string;
	organizacaoId: string;
	enderecoIp?: string | null;
	userAgent?: string | null;
};
// Revogação do principal encerra o vínculo do dispositivo: status REVOGADO + todas as credenciais ativas revogadas.
export async function revokePrincipal(params: TRevokePrincipalParams) {
	const principal = await db.query.accessPrincipals.findFirst({
		where: and(eq(accessPrincipals.id, params.principalId), eq(accessPrincipals.organizacaoId, params.organizacaoId)),
	});
	if (!principal) throw new createHttpError.NotFound("Dispositivo não encontrado.");
	if (principal.dataRevogacao) throw new createHttpError.BadRequest("Dispositivo já revogado.");

	const now = new Date();
	await db.transaction(async (tx) => {
		await tx
			.update(accessPrincipals)
			.set({ status: "REVOGADO", dataRevogacao: now, dataAtualizacao: now })
			.where(eq(accessPrincipals.id, principal.id));
		await tx
			.update(accessCredentials)
			.set({ dataRevogacao: now })
			.where(and(eq(accessCredentials.principalId, principal.id), isNull(accessCredentials.dataRevogacao)));
	});

	await recordAccessEvent({
		tipo: "PRINCIPAL_REVOGADO",
		organizacaoId: principal.organizacaoId,
		principalId: principal.id,
		enderecoIp: params.enderecoIp,
		userAgent: params.userAgent,
	});

	return { principalId: principal.id };
}

type TRevokeCredentialParams = {
	credencialId: string;
	organizacaoId: string;
	enderecoIp?: string | null;
	userAgent?: string | null;
};
// Revogação de uma credencial específica preserva o principal (ex.: encerrar a janela de sobreposição).
export async function revokeCredential(params: TRevokeCredentialParams) {
	const credential = await db.query.accessCredentials.findFirst({
		where: eq(accessCredentials.id, params.credencialId),
		with: { principal: true },
	});
	if (!credential || credential.principal.organizacaoId !== params.organizacaoId) throw new createHttpError.NotFound("Credencial não encontrada.");
	if (credential.dataRevogacao) throw new createHttpError.BadRequest("Credencial já revogada.");

	await db.update(accessCredentials).set({ dataRevogacao: new Date() }).where(eq(accessCredentials.id, credential.id));

	await recordAccessEvent({
		tipo: "CREDENCIAL_REVOGADA",
		organizacaoId: credential.principal.organizacaoId,
		principalId: credential.principalId,
		credencialId: credential.id,
		enderecoIp: params.enderecoIp,
		userAgent: params.userAgent,
	});

	return { credencialId: credential.id };
}

type TProvisionAgentPrincipalParams = {
	/** Código da aplicação cliente (`AGENT_CLAUDE`, `AGENT_CONTROL`…) — ver `clients-catalog.ts`. */
	accessClientCodigo: string;
	/** Nulo cria um principal `CONTA_PLATAFORMA`, que enxerga todas as organizações. */
	organizacaoId: string | null;
	nome: string;
	scopes: string[];
	criadoPorId?: string | null;
	descricao?: string | null;
};

/**
 * Provisiona um principal de agente de IA com credencial e grants, em uma transação.
 *
 * O enrollment por código existe para dispositivo físico, que é pareado por um humano no balcão.
 * Um agente é configurado por quem administra a conta, então nasce direto — e no caso de
 * plataforma não há organização para gerar código contra.
 *
 * Devolve o token **uma única vez**: só o SHA-256 do segredo fica no banco. Perdido o token,
 * o caminho é rotacionar, não recuperar.
 */
export async function provisionAgentPrincipal(params: TProvisionAgentPrincipalParams) {
	const client = await db.query.accessClients.findFirst({
		where: eq(accessClients.codigo, params.accessClientCodigo),
	});
	if (!client) throw new createHttpError.NotFound(`Aplicação cliente não encontrada: ${params.accessClientCodigo}.`);
	if (client.status !== "ATIVO") throw new createHttpError.BadRequest("Aplicação cliente desativada.");

	// Teto do cliente aplicado aqui também, e não só na tela: um scope fora do teto é erro de
	// configuração, e falhar alto é melhor que conceder a menos em silêncio.
	const forbiddenScopes = params.scopes.filter((scope) => !client.escoposPermitidos.includes(scope));
	if (forbiddenScopes.length > 0) {
		throw new createHttpError.BadRequest(`Scopes fora do teto de ${client.codigo}: ${forbiddenScopes.join(", ")}.`);
	}

	const tipo = params.organizacaoId ? ("CONTA_SERVICO" as const) : ("CONTA_PLATAFORMA" as const);

	const result = await db.transaction(async (tx) => {
		const [principal] = await tx
			.insert(accessPrincipals)
			.values({
				accessClientId: client.id,
				organizacaoId: params.organizacaoId,
				tipo,
				nome: params.nome,
			})
			.returning({ id: accessPrincipals.id, nome: accessPrincipals.nome });

		if (params.scopes.length > 0) {
			await tx.insert(accessGrants).values(
				params.scopes.map((scope) => ({
					principalId: principal.id,
					scope,
					concedidoPorId: params.criadoPorId ?? null,
				})),
			);
		}

		const generated = generateAccessCredentialToken({ tipo: "CHAVE_API" });
		const [credential] = await tx
			.insert(accessCredentials)
			.values({
				principalId: principal.id,
				tipo: "CHAVE_API",
				idPublico: generated.idPublico,
				prefixoExibicao: generated.prefixoExibicao,
				hashSegredo: generated.hashSegredo,
				descricao: params.descricao ?? "Credencial de agente de IA.",
			})
			.returning({ id: accessCredentials.id });

		return { principal, credentialId: credential.id, token: generated.token };
	});

	await recordAccessEvent({
		tipo: "CREDENCIAL_CRIADA",
		organizacaoId: params.organizacaoId,
		principalId: result.principal.id,
		credencialId: result.credentialId,
		metadados: { accessClientCodigo: client.codigo, tipo, scopes: params.scopes },
	});

	return {
		token: result.token,
		principal: { id: result.principal.id, nome: result.principal.nome, tipo, organizacaoId: params.organizacaoId },
		scopes: params.scopes,
	};
}
