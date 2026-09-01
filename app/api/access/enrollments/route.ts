import { createEnrollmentChallenge } from "@/lib/access/enrollment";
import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { AccessScopesListSchema } from "@/schemas/access";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const CreateEnrollmentChallengeInputSchema = z.object({
	principalId: z.string({ invalid_type_error: "Tipo não válido para o ID do dispositivo." }).optional().nullable(),
	accessClientCodigo: z.string({
		required_error: "Código da aplicação cliente não informado.",
		invalid_type_error: "Tipo não válido para o código da aplicação cliente.",
	}),
	nomeSugerido: z.string({ invalid_type_error: "Tipo não válido para o nome sugerido do dispositivo." }).optional().nullable(),
	escoposSolicitados: AccessScopesListSchema.optional().nullable(),
	expiraEmMinutos: z
		.number({ invalid_type_error: "Tipo não válido para o tempo de expiração." })
		.int("Tempo de expiração deve ser um número inteiro de minutos.")
		.min(1, "Tempo de expiração deve ser de ao menos 1 minuto.")
		.max(60, "Tempo de expiração não pode exceder 60 minutos.")
		.optional()
		.nullable(),
	maximoUsos: z
		.number({ invalid_type_error: "Tipo não válido para o máximo de usos." })
		.int("Máximo de usos deve ser um número inteiro.")
		.min(1, "Máximo de usos deve ser de ao menos 1.")
		.max(20, "Máximo de usos não pode exceder 20.")
		.optional()
		.nullable(),
});
export type TCreateEnrollmentChallengeInput = z.infer<typeof CreateEnrollmentChallengeInputSchema>;

type TCreateEnrollmentChallengeParams = {
	input: TCreateEnrollmentChallengeInput;
	organizacaoId: string;
	criadoPorId: string;
};
async function createEnrollmentChallengeService({ input, organizacaoId, criadoPorId }: TCreateEnrollmentChallengeParams) {
	const challenge = await createEnrollmentChallenge({
		principalId: input.principalId,
		accessClientCodigo: input.accessClientCodigo,
		organizacaoId,
		criadoPorId,
		nomeSugerido: input.nomeSugerido,
		escoposSolicitados: input.escoposSolicitados,
		expiraEmMinutos: input.expiraEmMinutos,
		maximoUsos: input.maximoUsos,
	});

	// O código é exibido uma única vez — apenas o hash fica persistido.
	return {
		data: challenge,
		message: "Código de ativação gerado com sucesso. Ele expira em poucos minutos e não será exibido novamente.",
	};
}
export type TCreateEnrollmentChallengeOutput = Awaited<ReturnType<typeof createEnrollmentChallengeService>>;

async function createEnrollmentChallengeRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	if (!session.membership) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");
	if (!session.membership.permissoes.empresa.editar)
		throw new createHttpError.Forbidden("Você não possui permissão para gerenciar dispositivos da organização.");

	const input = CreateEnrollmentChallengeInputSchema.parse(await request.json());
	const result = await createEnrollmentChallengeService({
		input,
		organizacaoId: session.membership.organizacao.id,
		criadoPorId: session.user.id,
	});
	return NextResponse.json(result);
}

export const POST = appApiHandler({ POST: createEnrollmentChallengeRoute });
