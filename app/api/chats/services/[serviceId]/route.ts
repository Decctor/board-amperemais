import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { db } from "@/services/drizzle";
import { chatServices } from "@/services/drizzle/schema/chats";
import { and, eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// ============= PATCH - Update service (conclude) =============

const updateServiceBodySchema = z.object({
	descricao: z.string().min(3, "Descrição deve ter pelo menos 3 caracteres"),
	status: z.enum(["CONCLUIDO"]),
});

export type TUpdateServiceInput = z.infer<typeof updateServiceBodySchema>;

async function updateService({ session, serviceId, input }: { session: TAuthUserSession["user"]; serviceId: string; input: TUpdateServiceInput }) {
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

	// Update service
	await db
		.update(chatServices)
		.set({
			descricao: input.descricao,
			status: input.status,
			dataFim: new Date(),
		})
		.where(eq(chatServices.id, serviceId));

	return {
		data: { serviceId, status: input.status },
		message: "Atendimento concluído com sucesso.",
	};
}

export type TUpdateServiceOutput = Awaited<ReturnType<typeof updateService>>;

async function updateServiceRoute(req: NextRequest, context: RouteContext<"/api/chats/services/[serviceId]">) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado.");

	const { serviceId } = await context.params;
	const body = await req.json();
	const input = updateServiceBodySchema.parse(body);

	const result = await updateService({ session: session.user, serviceId, input });
	return NextResponse.json(result, { status: 200 });
}

// ============= Export handlers =============

export const PATCH = updateServiceRoute;
