import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { db } from "@/services/drizzle";
import { chatServices } from "@/services/drizzle/schema/chats";
import { users } from "@/services/drizzle/schema/users";
import { and, eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// ============= PATCH - Transfer service =============

const transferServiceBodySchema = z.object({
	userId: z.string().optional(), // If undefined, transfer to AI
});

export type TTransferServiceInput = z.infer<typeof transferServiceBodySchema>;

async function transferService({
	session,
	serviceId,
	input,
}: { session: TAuthUserSession["user"]; serviceId: string; input: TTransferServiceInput }) {
	const organizacaoId = session.organizacaoId;

	if (!organizacaoId) {
		throw new createHttpError.BadRequest("Você precisa estar vinculado a uma organização.");
	}

	// Verify service belongs to organization
	const service = await db.query.chatServices.findFirst({
		where: (fields, { and, eq }) => and(eq(fields.id, serviceId), eq(fields.organizacaoId, organizacaoId)),
	});

	if (!service) {
		throw new createHttpError.NotFound("Serviço não encontrado.");
	}

	// Validate service is in PENDENTE or EM_ANDAMENTO status
	if (service.status !== "PENDENTE" && service.status !== "EM_ANDAMENTO") {
		throw new createHttpError.BadRequest("Apenas serviços pendentes ou em andamento podem ser transferidos.");
	}

	let responsavelTipo: "AI" | "USUÁRIO" | "BUSINESS-APP" | "CLIENTE" = "AI";
	let responsavelUsuarioId: string | null = null;

	if (input.userId) {
		// Transfer to user
		const userId = input.userId; // Type narrowing
		const user = await db.query.users.findFirst({
			where: (fields, { and, eq }) => and(eq(fields.id, userId), eq(fields.organizacaoId, organizacaoId)),
		});

		if (!user) {
			throw new createHttpError.NotFound("Usuário não encontrado.");
		}

		responsavelTipo = "USUÁRIO";
		responsavelUsuarioId = user.id;
	} else {
		// Transfer to AI
		responsavelTipo = "AI";
		responsavelUsuarioId = null;
	}

	// Update service
	await db
		.update(chatServices)
		.set({
			responsavelTipo,
			responsavelUsuarioId,
		})
		.where(eq(chatServices.id, serviceId));

	return {
		data: {
			serviceId,
			responsavelTipo,
			responsavelUsuarioId,
		},
		message: "Responsabilidade transferida com sucesso.",
	};
}

export type TTransferServiceOutput = Awaited<ReturnType<typeof transferService>>;

async function transferServiceRoute(req: NextRequest, context: RouteContext<"/api/chats/services/[serviceId]/transfer">) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado.");

	const { serviceId } = await context.params;
	const body = await req.json();
	const input = transferServiceBodySchema.parse(body);

	const result = await transferService({ session: session.user, serviceId, input });
	return NextResponse.json(result, { status: 200 });
}

// ============= Export handlers =============

export const PATCH = transferServiceRoute;
