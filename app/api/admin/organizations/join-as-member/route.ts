import { db } from "@/services/drizzle";
import createHttpError from "http-errors";
import z from "zod";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { DEFAULT_ORGANIZATION_OWNER_PERMISSIONS } from "@/config";
import { organizationMembers } from "@/services/drizzle/schema";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { appApiHandler } from "@/lib/app-api";
import { NextResponse, type NextRequest } from "next/server";
const JoinAsMemberAdminInputSchema = z.object({
	organizationId: z.string({ invalid_type_error: "Tipo não válido para o ID da organização." }),
});
export type TJoinAsMemberAdminInput = z.infer<typeof JoinAsMemberAdminInputSchema>;
async function joinAsMemberAdmin({ sessionUser, input }: { sessionUser: TAuthUserSession["user"]; input: TJoinAsMemberAdminInput }) {
	const { organizationId } = input;

	const organization = await db.query.organizations.findFirst({
		where: (fields, { eq }) => eq(fields.id, organizationId),
	});
	if (!organization) throw new createHttpError.NotFound("Organização não encontrada.");

	const existingMembership = await db.query.organizationMembers.findFirst({
		where: (fields, { and, eq }) => and(eq(fields.usuarioId, sessionUser.id), eq(fields.organizacaoId, organizationId)),
	});
	if (existingMembership) throw new createHttpError.BadRequest("Você já faz parte desta organização.");

	const insertedMembership = await db
		.insert(organizationMembers)
		.values({
			usuarioId: sessionUser.id,
			organizacaoId: organizationId,
			permissoes: DEFAULT_ORGANIZATION_OWNER_PERMISSIONS,
		})
		.returning({ id: organizationMembers.id });

	const insertedMembershipId = insertedMembership[0]?.id;
	if (!insertedMembershipId)
		throw new createHttpError.InternalServerError("Oops, houve um erro desconhecido ao adicionar você como membro da organização.");

	return {
		data: {
			insertedId: insertedMembershipId,
		},
		message: "Você foi adicionado como membro da organização com sucesso.",
	};
}
export type TJoinAsMemberAdminOutput = Awaited<ReturnType<typeof joinAsMemberAdmin>>;
async function joinAsMemberAdminRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para acessar esse recurso.");

	if (!session.user.admin) throw new createHttpError.Forbidden("Acesso restrito a administradores.");
	const input = JoinAsMemberAdminInputSchema.parse(await request.json());
	const { organizationId } = input;

	const result = await joinAsMemberAdmin({ sessionUser: session.user, input });
	return NextResponse.json(result, { status: 201 });
}

export const POST = appApiHandler({ POST: joinAsMemberAdminRoute });
