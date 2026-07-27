import { consumeEnrollmentChallenge } from "@/lib/access/enrollment";
import { getRequestClientInfo } from "@/lib/access/events";
import { assertEnrollmentAttemptAllowed } from "@/lib/access/rate-limit";
import { appApiHandler } from "@/lib/app-api";
import { AccessPrincipalDeviceMetadataSchema } from "@/schemas/access";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const ConsumeEnrollmentChallengeInputSchema = z.object({
	code: z
		.string({
			required_error: "Código de ativação não informado.",
			invalid_type_error: "Tipo não válido para o código de ativação.",
		})
		.min(6, "Código de ativação inválido."),
	nome: z
		.string({ invalid_type_error: "Tipo não válido para o nome do dispositivo." })
		.optional()
		.nullable(),
	metadados: AccessPrincipalDeviceMetadataSchema.optional().nullable(),
});
export type TConsumeEnrollmentChallengeInput = z.infer<typeof ConsumeEnrollmentChallengeInputSchema>;

type TConsumeEnrollmentChallengeParams = {
	input: TConsumeEnrollmentChallengeInput;
	enderecoIp: string | null;
	userAgent: string | null;
};
async function consumeEnrollmentChallengeService({ input, enderecoIp, userAgent }: TConsumeEnrollmentChallengeParams) {
	const enrollment = await consumeEnrollmentChallenge({
		code: input.code,
		nome: input.nome,
		metadados: input.metadados ?? null,
		enderecoIp,
		userAgent,
	});

	// O token é devolvido uma única vez — o dispositivo deve guardá-lo em armazenamento seguro.
	return {
		data: enrollment,
		message: "Dispositivo ativado com sucesso.",
	};
}
export type TConsumeEnrollmentChallengeOutput = Awaited<ReturnType<typeof consumeEnrollmentChallengeService>>;

// Endpoint público por natureza (o dispositivo ainda não tem credencial) — protegido por
// rate limiting por IP e pelos requisitos do desafio (entropia, TTL curto, usos limitados).
async function consumeEnrollmentChallengeRoute(request: NextRequest) {
	const { enderecoIp, userAgent } = getRequestClientInfo(request);
	await assertEnrollmentAttemptAllowed({ enderecoIp });

	const input = ConsumeEnrollmentChallengeInputSchema.parse(await request.json());
	const result = await consumeEnrollmentChallengeService({ input, enderecoIp, userAgent });
	return NextResponse.json(result);
}

export const POST = appApiHandler({ POST: consumeEnrollmentChallengeRoute });
