import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { db } from "@/services/drizzle";
import { organizations } from "@/services/drizzle/schema";
import { eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const UpdateOrganizationColorsSchema = z.object({
	corPrimaria: z
		.string()
		.regex(/^#[0-9A-Fa-f]{6}$/, { message: "A cor primária deve estar no formato hexadecimal (ex: #fead41)." })
		.optional()
		.nullable(),
	corSecundaria: z
		.string()
		.regex(/^#[0-9A-Fa-f]{6}$/, { message: "A cor secundária deve estar no formato hexadecimal (ex: #15599a)." })
		.optional()
		.nullable(),
});

export type TUpdateOrganizationColorsInput = z.infer<typeof UpdateOrganizationColorsSchema>;

type RouteParams = {
	params: Promise<{ orgId: string }>;
};

async function updateOrganizationColors(request: NextRequest, { params }: RouteParams) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	if (!session.membership) throw new createHttpError.Forbidden("Você não está vinculado a uma organização.");

	const { orgId } = await params;

	// Check if user has access to this organization
	if (session.membership.organizacao.id !== orgId) {
		throw new createHttpError.Forbidden("Você não tem permissão para modificar esta organização.");
	}

	const payload = await request.json();
	const input = UpdateOrganizationColorsSchema.parse(payload);

	// Update organization colors
	await db
		.update(organizations)
		.set({
			corPrimaria: input.corPrimaria,
			corSecundaria: input.corSecundaria,
		})
		.where(eq(organizations.id, orgId));

	return NextResponse.json({
		data: {
			corPrimaria: input.corPrimaria,
			corSecundaria: input.corSecundaria,
		},
		message: "Cores atualizadas com sucesso!",
	});
}

export const PATCH = appApiHandler({
	PATCH: updateOrganizationColors,
});
