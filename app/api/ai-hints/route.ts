import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";
import { AIHintSchema, AIHintStatusSchema, AIHintSubjectSchema } from "@/schemas/ai-hints";
import { db } from "@/services/drizzle";
import { aiHints } from "@/services/drizzle/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
import type { TAuthUserSession } from "@/lib/authentication/types";

export const GetHintsInputSchema = z.object({
	id: z
		.string({
			required_error: "O ID da dica é obrigatório.",
		})
		.optional(),
	subject: AIHintSubjectSchema.optional(),
	status: AIHintStatusSchema.optional().default("active"),
	limit: z
		.string({
			invalid_type_error: "O limite deve ser uma string.",
		})
		.optional()
		.default("5")
		.transform((val) => Number(val))
		.refine((val) => val > 0, {
			message: "O limite deve ser maior que 0.",
			path: ["limit"],
		}),
});
export type TGetHintsInput = z.infer<typeof GetHintsInputSchema>;
async function getHints({ input, session }: { input: TGetHintsInput; session: TAuthUserSession }) {
	const userOrgId = session.membership?.organizacao.id;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	if (input.id) {
		const hint = await db.query.aiHints.findFirst({
			where: and(eq(aiHints.id, input.id), eq(aiHints.organizacaoId, userOrgId)),
			with: {
				aprovadaPorUsuario: {
					columns: {
						id: true,
						nome: true,
						email: true,
					},
				},
				descartadaPorUsuario: {
					columns: {
						id: true,
						nome: true,
						email: true,
					},
				},
			},
		});

		if (!hint) throw new createHttpError.NotFound("Dica não encontrada.");

		return {
			data: {
				default: null,
				byId: {
					...AIHintSchema.parse(hint),
					aprovadaPorUsuario: hint.aprovadaPorUsuario,
					descartadaPorUsuario: hint.descartadaPorUsuario,
				},
			},
		};
	}

	const conditions: any = [eq(aiHints.organizacaoId, userOrgId)];

	if (input.subject) conditions.push(eq(aiHints.assunto, input.subject));
	if (input.status) conditions.push(eq(aiHints.status, input.status));
	if (input.status === "active") conditions.push(isNull(aiHints.dataAprovacao));

	const hints = await db.query.aiHints.findMany({
		where: and(...conditions),
		orderBy: [desc(aiHints.relevancia), desc(aiHints.dataInsercao)],
		limit: input.limit,
	});

	return {
		data: {
			default: hints.map((hint) => AIHintSchema.parse(hint)),
			byId: null,
		},
	};
}
export type TGetHintsOutput = Awaited<ReturnType<typeof getHints>>;
export type TGetHintsOutputDefault = Exclude<TGetHintsOutput["data"]["default"], null>;
export type TGetHintsOutputById = Exclude<TGetHintsOutput["data"]["byId"], null>;

async function getHintsRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para acessar esse recurso.");

	const searchParams = request.nextUrl.searchParams;
	const input = GetHintsInputSchema.parse({
		id: searchParams.get("id") ?? undefined,
		subject: searchParams.get("subject") ?? undefined,
		status: searchParams.get("status") ?? undefined,
		limit: searchParams.get("limit") ?? undefined,
	});

	const result = await getHints({ input, session });
	return NextResponse.json(result);
}
export const GET = appApiHandler({ GET: getHintsRoute });
