import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { db } from "@/services/drizzle";
import { authSessions, organizationMembers } from "@/services/drizzle/schema";
import { and, eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const SwitchOrganizationInputSchema = z.object({
	organizationId: z.string(),
});
export type TSwitchOrganizationInput = z.infer<typeof SwitchOrganizationInputSchema>;
async function switchOrganization(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");

	const payload = await request.json();
	const input = SwitchOrganizationInputSchema.parse(payload);

	// Validate user has membership in target organization
	const membership = await db.query.organizationMembers.findFirst({
		where: (fields, { and, eq }) => and(eq(fields.usuarioId, session.user.id), eq(fields.organizacaoId, input.organizationId)),
		with: {
			organizacao: true,
		},
	});

	if (!membership) {
		throw new createHttpError.Forbidden("Você não tem acesso a esta organização.");
	}

	// Update active organization in session
	await db.update(authSessions).set({ organizacaoAtivaId: input.organizationId }).where(eq(authSessions.id, session.session.id));

	return NextResponse.json({
		data: {
			newActiveOrganization: {
				id: membership.organizacao.id,
				nome: membership.organizacao.nome,
				cnpj: membership.organizacao.cnpj,
				logoUrl: membership.organizacao.logoUrl,
			},
			membership: {
				id: membership.id,
				permissoes: membership.permissoes,
			},
		},
		message: "Organização alterada com sucesso.",
	});
}

export type TSwitchOrganizationOutput = {
	data: {
		newActiveOrganization: {
			id: string;
			nome: string;
			cnpj: string;
			logoUrl: string | null;
		};
		membership: {
			id: string;
			permissoes: unknown;
		};
	};
	message: string;
};

export const PUT = appApiHandler({
	PUT: switchOrganization,
});
