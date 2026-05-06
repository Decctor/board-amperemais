import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { db } from "@/services/drizzle";
import { chatServices } from "@/services/drizzle/schema/chats";
import { eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// ============= PATCH - Transfer service =============

const TransferServiceInputSchema = z.object({
	serviceId: z.string({
		required_error: "ID do serviço não informado.",
		invalid_type_error: "Tipo não válido para o ID do serviço.",
	}),
	userId: z
		.string({
			required_error: "ID do usuário não informado.",
			invalid_type_error: "Tipo não válido para o ID do usuário.",
		})
		.optional(), // If undefined, transfer to AI
});

export type TTransferServiceInput = z.infer<typeof TransferServiceInputSchema>;

async function transferService({ session, input }: { session: TAuthUserSession; input: TTransferServiceInput }) {
	const organizacaoId = session.membership?.organizacao.id;

	if (!organizacaoId) {
		throw new createHttpError.BadRequest("Você precisa estar vinculado a uma organização.");
	}

	// Verify service belongs to organization
	const service = await db.query.chatServices.findFirst({
		where: (fields, { and, eq }) => and(eq(fields.id, input.serviceId), eq(fields.organizacaoId, organizacaoId)),
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
		// Transfer to user: scope by organization membership (users table has no organizacaoId)
		const userId = input.userId;
		const targetMembership = await db.query.organizationMembers.findFirst({
			where: (fields, { and, eq }) => and(eq(fields.usuarioId, userId), eq(fields.organizacaoId, organizacaoId)),
		});

		if (!targetMembership) {
			throw new createHttpError.NotFound("Usuário não encontrado.");
		}

		if (!targetMembership.permissoes.atendimentos.receberTransferencias) {
			throw new createHttpError.Forbidden("Este usuário não está apto a receber transferências de atendimentos.");
		}
		responsavelTipo = "USUÁRIO";
		responsavelUsuarioId = userId;
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
		.where(eq(chatServices.id, input.serviceId));

	return {
		data: {
			serviceId: input.serviceId,
			responsavelTipo,
			responsavelUsuarioId,
		},
		message: "Responsabilidade transferida com sucesso.",
	};
}

export type TTransferServiceOutput = Awaited<ReturnType<typeof transferService>>;

async function transferServiceRoute(req: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado.");

	const body = await req.json();
	const input = TransferServiceInputSchema.parse(body);

	const result = await transferService({ session, input });
	return NextResponse.json(result, { status: 200 });
}

// ============= Export handlers =============

export const PATCH = appApiHandler({ PATCH: transferServiceRoute });
