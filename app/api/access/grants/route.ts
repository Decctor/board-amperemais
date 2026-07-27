import { getRequestClientInfo, recordAccessEvent } from "@/lib/access/events";
import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { AccessScopeEnum } from "@/schemas/enums";
import { db } from "@/services/drizzle";
import { accessGrants, accessPrincipals } from "@/services/drizzle/schema";
import { and, eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const UpdateAccessGrantInputSchema = z.object({
	principalId: z.string({
		required_error: "ID do dispositivo não informado.",
		invalid_type_error: "Tipo não válido para o ID do dispositivo.",
	}),
	scope: AccessScopeEnum,
	acao: z.enum(["CONCEDER", "REVOGAR"], {
		required_error: "Ação não informada.",
		invalid_type_error: "Tipo não válido para a ação.",
	}),
});
export type TUpdateAccessGrantInput = z.infer<typeof UpdateAccessGrantInputSchema>;

type TUpdateAccessGrantParams = {
	input: TUpdateAccessGrantInput;
	organizacaoId: string;
	concedidoPorId: string;
	enderecoIp: string | null;
	userAgent: string | null;
};
// Gestão de scopes pós-enrollment. Efeito imediato: os grants são relidos a cada autenticação
// do dispositivo, então não há janela de cache entre a mudança e o enforcement.
async function updateAccessGrant({ input, organizacaoId, concedidoPorId, enderecoIp, userAgent }: TUpdateAccessGrantParams) {
	const principal = await db.query.accessPrincipals.findFirst({
		where: and(eq(accessPrincipals.id, input.principalId), eq(accessPrincipals.organizacaoId, organizacaoId)),
		with: { cliente: true },
	});
	if (!principal) throw new createHttpError.NotFound("Dispositivo não encontrado.");

	if (input.acao === "CONCEDER") {
		if (principal.status !== "ATIVO" || principal.dataRevogacao) throw new createHttpError.BadRequest("Dispositivo revogado ou inativo.");
		// O teto do cliente continua valendo depois do enrollment.
		if (!principal.cliente.escoposPermitidos.includes(input.scope)) {
			throw new createHttpError.BadRequest("Permissão fora do teto da aplicação cliente deste dispositivo.");
		}

		// Re-concessão limpa data_revogacao em vez de criar linha nova (unique index principal+scope).
		await db
			.insert(accessGrants)
			.values({ principalId: principal.id, scope: input.scope, concedidoPorId })
			.onConflictDoUpdate({
				target: [accessGrants.principalId, accessGrants.scope],
				set: { dataRevogacao: null, concedidoPorId },
			});

		await recordAccessEvent({
			tipo: "SCOPE_CONCEDIDO",
			organizacaoId,
			principalId: principal.id,
			enderecoIp,
			userAgent,
			metadados: { scope: input.scope },
		});
		return { data: { principalId: principal.id, scope: input.scope }, message: "Permissão concedida com sucesso." };
	}

	const grant = await db.query.accessGrants.findFirst({
		where: and(eq(accessGrants.principalId, principal.id), eq(accessGrants.scope, input.scope)),
	});
	if (!grant || grant.dataRevogacao) throw new createHttpError.BadRequest("Permissão já revogada ou nunca concedida a este dispositivo.");

	await db.update(accessGrants).set({ dataRevogacao: new Date() }).where(eq(accessGrants.id, grant.id));

	await recordAccessEvent({
		tipo: "SCOPE_REMOVIDO",
		organizacaoId,
		principalId: principal.id,
		enderecoIp,
		userAgent,
		metadados: { scope: input.scope },
	});
	return { data: { principalId: principal.id, scope: input.scope }, message: "Permissão revogada com sucesso." };
}
export type TUpdateAccessGrantOutput = Awaited<ReturnType<typeof updateAccessGrant>>;

async function updateAccessGrantRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	if (!session.membership) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");
	if (!session.membership.permissoes.empresa.editar)
		throw new createHttpError.Forbidden("Você não possui permissão para gerenciar dispositivos da organização.");

	const { enderecoIp, userAgent } = getRequestClientInfo(request);
	const input = UpdateAccessGrantInputSchema.parse(await request.json());
	const result = await updateAccessGrant({
		input,
		organizacaoId: session.membership.organizacao.id,
		concedidoPorId: session.user.id,
		enderecoIp,
		userAgent,
	});
	return NextResponse.json(result);
}

export const PATCH = appApiHandler({ PATCH: updateAccessGrantRoute });
