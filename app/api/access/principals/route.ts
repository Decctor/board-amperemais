import { revokePrincipal } from "@/lib/access/credentials";
import { getRequestClientInfo } from "@/lib/access/events";
import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { AccessPrincipalStatusEnum, AccessPrincipalTypeEnum } from "@/schemas/enums";
import { db } from "@/services/drizzle";
import { accessPrincipals, organizationMembers } from "@/services/drizzle/schema";
import { and, eq, inArray } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const GetAccessPrincipalsInputSchema = z.object({
	id: z.string({ invalid_type_error: "Tipo não válido para o ID do dispositivo." }).optional().nullable(),
	// Separa as duas telas que leem esta rota: Dispositivos pede DISPOSITIVO/AGENTE_DESKTOP,
	// Conexões de IA pede CONTA_SERVICO. Sem o filtro, uma conexão de agente apareceria na lista
	// de aparelhos do balcão, onde ninguém saberia o que ela é.
	types: z
		.string({ invalid_type_error: "Tipo não válido para os tipos de principal." })
		.optional()
		.nullable()
		.transform((value) => (value ? value.split(",").filter(Boolean) : []))
		.pipe(z.array(AccessPrincipalTypeEnum)),
});
export type TGetAccessPrincipalsInput = z.infer<typeof GetAccessPrincipalsInputSchema>;

type TGetAccessPrincipalsParams = {
	input: TGetAccessPrincipalsInput;
	organizacaoId: string;
};
async function getAccessPrincipals({ input, organizacaoId }: TGetAccessPrincipalsParams) {
	const principalColumns = {
		id: true,
		nome: true,
		tipo: true,
		status: true,
		lojaId: true,
		responsavelUsuarioId: true,
		metadados: true,
		ultimoAcesso: true,
		dataInsercao: true,
		dataRevogacao: true,
	} as const;
	const principalWith = {
		// escoposPermitidos alimenta a UI de gestão de permissões (teto do cliente).
		cliente: { columns: { codigo: true, nome: true, categoria: true, escoposPermitidos: true } },
		grants: { columns: { scope: true, dataRevogacao: true } },
		// Nunca expõe hash ou segredo — apenas identificação e ciclo de vida.
		credenciais: {
			columns: { id: true, tipo: true, prefixoExibicao: true, expiraEm: true, ultimoUso: true, dataInsercao: true, dataRevogacao: true },
		},
	} as const;

	if (input.id) {
		const principal = await db.query.accessPrincipals.findFirst({
			where: and(eq(accessPrincipals.id, input.id), eq(accessPrincipals.organizacaoId, organizacaoId)),
			columns: principalColumns,
			with: principalWith,
		});
		if (!principal) throw new createHttpError.NotFound("Dispositivo não encontrado.");
		return { data: { byId: principal, default: null }, message: "Dispositivo encontrado com sucesso." };
	}

	const principals = await db.query.accessPrincipals.findMany({
		where:
			input.types.length > 0
				? and(eq(accessPrincipals.organizacaoId, organizacaoId), inArray(accessPrincipals.tipo, input.types))
				: eq(accessPrincipals.organizacaoId, organizacaoId),
		columns: principalColumns,
		with: principalWith,
		orderBy: (fields, { desc }) => desc(fields.dataInsercao),
	});
	return { data: { byId: null, default: principals }, message: "Dispositivos listados com sucesso." };
}
export type TGetAccessPrincipalsOutput = Awaited<ReturnType<typeof getAccessPrincipals>>;

async function getAccessPrincipalsRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	if (!session.membership) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");
	if (!session.membership.permissoes.empresa.visualizar)
		throw new createHttpError.Forbidden("Você não possui permissão para visualizar dispositivos da organização.");

	const input = GetAccessPrincipalsInputSchema.parse({
		id: request.nextUrl.searchParams.get("id"),
		types: request.nextUrl.searchParams.get("types"),
	});
	const result = await getAccessPrincipals({ input, organizacaoId: session.membership.organizacao.id });
	return NextResponse.json(result);
}

const UpdateAccessPrincipalInputSchema = z.object({
	id: z.string({
		required_error: "ID do dispositivo não informado.",
		invalid_type_error: "Tipo não válido para o ID do dispositivo.",
	}),
	nome: z
		.string({ invalid_type_error: "Tipo não válido para o nome do dispositivo." })
		.min(1, "Nome do dispositivo não pode ser vazio.")
		.optional()
		.nullable(),
	lojaId: z.string({ invalid_type_error: "Tipo não válido para o ID da loja." }).optional().nullable(),
	status: AccessPrincipalStatusEnum.optional().nullable(),
	responsavelUsuarioId: z.string({ invalid_type_error: "Tipo não válido para o ID do usuário responsável." }).optional().nullable(),
});
export type TUpdateAccessPrincipalInput = z.infer<typeof UpdateAccessPrincipalInputSchema>;

type TUpdateAccessPrincipalParams = {
	input: TUpdateAccessPrincipalInput;
	organizacaoId: string;
	enderecoIp: string | null;
	userAgent: string | null;
};
async function updateAccessPrincipal({ input, organizacaoId, enderecoIp, userAgent }: TUpdateAccessPrincipalParams) {
	const principal = await db.query.accessPrincipals.findFirst({
		where: and(eq(accessPrincipals.id, input.id), eq(accessPrincipals.organizacaoId, organizacaoId)),
	});
	if (!principal) throw new createHttpError.NotFound("Dispositivo não encontrado.");

	// Revogação tem efeitos em cascata (credenciais) — passa pelo fluxo dedicado.
	if (input.status === "REVOGADO") {
		await revokePrincipal({ principalId: principal.id, organizacaoId, enderecoIp, userAgent });
		return { data: { id: principal.id }, message: "Dispositivo revogado com sucesso." };
	}

	if (principal.dataRevogacao) throw new createHttpError.BadRequest("Dispositivo revogado não pode ser alterado.");

	if (input.responsavelUsuarioId) {
		const membership = await db.query.organizationMembers.findFirst({
			where: and(eq(organizationMembers.organizacaoId, organizacaoId), eq(organizationMembers.usuarioId, input.responsavelUsuarioId)),
			columns: { id: true },
		});
		if (!membership) throw new createHttpError.BadRequest("O usuário responsável precisa ser membro da organização.");
	}

	await db
		.update(accessPrincipals)
		.set({
			...(input.nome ? { nome: input.nome } : {}),
			...(input.lojaId !== undefined ? { lojaId: input.lojaId } : {}),
			...(input.status ? { status: input.status } : {}),
			...(input.responsavelUsuarioId !== undefined ? { responsavelUsuarioId: input.responsavelUsuarioId } : {}),
			dataAtualizacao: new Date(),
		})
		.where(eq(accessPrincipals.id, principal.id));

	return { data: { id: principal.id }, message: "Dispositivo atualizado com sucesso." };
}
export type TUpdateAccessPrincipalOutput = Awaited<ReturnType<typeof updateAccessPrincipal>>;

async function updateAccessPrincipalRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	if (!session.membership) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");
	if (!session.membership.permissoes.empresa.editar)
		throw new createHttpError.Forbidden("Você não possui permissão para gerenciar dispositivos da organização.");

	const { enderecoIp, userAgent } = getRequestClientInfo(request);
	const input = UpdateAccessPrincipalInputSchema.parse(await request.json());
	const result = await updateAccessPrincipal({ input, organizacaoId: session.membership.organizacao.id, enderecoIp, userAgent });
	return NextResponse.json(result);
}

export const GET = appApiHandler({ GET: getAccessPrincipalsRoute });
export const PATCH = appApiHandler({ PATCH: updateAccessPrincipalRoute });
