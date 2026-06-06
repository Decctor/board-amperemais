import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { formatAsSlug } from "@/lib/formatting";
import { PlatformPartnerOnboardingSchema } from "@/schemas/platform-partnerships";
import { db } from "@/services/drizzle";
import { platformPartners } from "@/services/drizzle/schema";
import { eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const CreatePlatformPartnerOnboardingInputSchema = z.object({
	partner: PlatformPartnerOnboardingSchema,
});
export type TCreatePlatformPartnerOnboardingInput = z.infer<typeof CreatePlatformPartnerOnboardingInputSchema>;

async function generateUniquePartnerCode(nome: string) {
	const base = formatAsSlug(nome).replace(/-/g, "").slice(0, 12).toUpperCase() || "PARCEIRO";
	for (let attempt = 0; attempt < 10; attempt++) {
		const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
		const codigo = `${base}${suffix}`;
		const existing = await db.query.platformPartners.findFirst({
			where: eq(platformPartners.codigo, codigo),
			columns: { id: true },
		});
		if (!existing) return codigo;
	}
	return crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
}

async function createPlatformPartnerOnboarding({ input, userId }: { input: TCreatePlatformPartnerOnboardingInput; userId: string }) {
	const existingPartner = await db.query.platformPartners.findFirst({
		where: eq(platformPartners.usuarioId, userId),
	});

	if (existingPartner) {
		const [updatedPartner] = await db
			.update(platformPartners)
			.set({
				nome: input.partner.nome,
				email: input.partner.email,
				telefone: input.partner.telefone,
				cpfCnpj: input.partner.cpfCnpj,
				chavePix: input.partner.chavePix,
				arquivos: input.partner.arquivos,
				aceiteTermos: input.partner.aceiteTermos,
				dataAceiteTermos: input.partner.aceiteTermos ? new Date() : existingPartner.dataAceiteTermos,
				status: existingPartner.status === "REJEITADO" ? "PENDENTE_APROVACAO" : existingPartner.status,
				dataAtualizacao: new Date(),
			})
			.where(eq(platformPartners.id, existingPartner.id))
			.returning({ id: platformPartners.id });

		return {
			data: {
				partnerId: updatedPartner?.id ?? existingPartner.id,
			},
			message: "Cadastro de parceiro atualizado com sucesso.",
		};
	}

	const codigo = await generateUniquePartnerCode(input.partner.nome);
	const [createdPartner] = await db
		.insert(platformPartners)
		.values({
			usuarioId: userId,
			status: "PENDENTE_APROVACAO",
			codigo,
			nome: input.partner.nome,
			email: input.partner.email,
			telefone: input.partner.telefone,
			cpfCnpj: input.partner.cpfCnpj,
			chavePix: input.partner.chavePix,
			arquivos: input.partner.arquivos,
			aceiteTermos: input.partner.aceiteTermos,
			dataAceiteTermos: new Date(),
		})
		.returning({ id: platformPartners.id });

	if (!createdPartner) throw new createHttpError.InternalServerError("Erro ao criar cadastro de parceiro.");

	return {
		data: {
			partnerId: createdPartner.id,
		},
		message: "Cadastro de parceiro enviado para aprovacao.",
	};
}
export type TCreatePlatformPartnerOnboardingOutput = Awaited<ReturnType<typeof createPlatformPartnerOnboarding>>;

async function createPlatformPartnerOnboardingRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Voce nao esta autenticado.");

	const payload = await request.json();
	const input = CreatePlatformPartnerOnboardingInputSchema.parse(payload);
	const result = await createPlatformPartnerOnboarding({ input, userId: session.user.id });
	return NextResponse.json(result);
}

export const POST = appApiHandler({
	POST: createPlatformPartnerOnboardingRoute,
});
