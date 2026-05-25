import { db } from "@/services/drizzle";
import { clients } from "@/services/drizzle/schema";
import { and, eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";

const RedirectInputSchema = z.object({
	type: z.enum(["client-poi-profile"], {
		required_error: "Tipo de redirecionamento não informado.",
		invalid_type_error: "Tipo não válido para o redirecionamento.",
	}),
	orgId: z.string({
		required_error: "ID da organização não informado.",
		invalid_type_error: "Tipo não válido para o ID da organização.",
	}),
	clientId: z.string({
		required_error: "ID do cliente não informado.",
		invalid_type_error: "Tipo não válido para o ID do cliente.",
	}),
	interactionId: z
		.string({
			invalid_type_error: "Tipo não válido para o ID da interação.",
		})
		.optional()
		.nullable(),
});

export async function GET(request: NextRequest) {
	try {
		const input = RedirectInputSchema.parse({
			type: request.nextUrl.searchParams.get("type"),
			orgId: request.nextUrl.searchParams.get("orgId"),
			clientId: request.nextUrl.searchParams.get("clientId"),
			interactionId: request.nextUrl.searchParams.get("interactionId"),
		});

		if (input.type === "client-poi-profile") {
			const client = await db
				.select({ id: clients.id })
				.from(clients)
				.where(and(eq(clients.id, input.clientId), eq(clients.organizacaoId, input.orgId)))
				.limit(1);

			if (!client[0]) throw new createHttpError.NotFound("Cliente não encontrado.");

			const targetUrl = new URL(`/point-of-interaction/${input.orgId}/client-profile/${input.clientId}`, request.nextUrl.origin);
			return NextResponse.redirect(targetUrl);
		}

		throw new createHttpError.BadRequest("Tipo de redirecionamento não suportado.");
	} catch (error) {
		console.error("[REDIRECTS] Failed to resolve redirect.", error);
		return new NextResponse("Redirecionamento não encontrado.", { status: 404 });
	}
}
