import { db } from "@/services/drizzle";
import { accessCredentials, accessPrincipals } from "@/services/drizzle/schema";
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
