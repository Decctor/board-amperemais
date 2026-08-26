import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { isValidOrganizationSlug } from "@/lib/organizations/slug";
import { getUniqueOrganizationSlug, isOrganizationSlugTaken } from "@/lib/organizations/slug-server";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const GetOrganizationSlugAvailabilityInputSchema = z.object({
	slug: z
		.string({
			required_error: "Endereço da loja não informado.",
			invalid_type_error: "Tipo não válido para o endereço da loja.",
		})
		.transform((v) => v.trim().toLowerCase()),
});
export type TGetOrganizationSlugAvailabilityInput = z.infer<typeof GetOrganizationSlugAvailabilityInputSchema>;

async function getOrganizationSlugAvailability({
	input,
	excludeOrgId,
}: {
	input: TGetOrganizationSlugAvailabilityInput;
	excludeOrgId?: string | null;
}) {
	const { slug } = input;
	const valid = isValidOrganizationSlug(slug);
	const taken = valid ? await isOrganizationSlugTaken({ slug, excludeOrgId }) : false;
	const available = valid && !taken;
	// Sugestão sempre utilizável: para entradas inválidas parte do texto cru, para colisões sufixa.
	const suggestion = available ? slug : await getUniqueOrganizationSlug({ base: slug || "loja", excludeOrgId });

	return {
		data: { valid, available, suggestion },
		message: available ? "Endereço disponível." : valid ? "Este endereço já está em uso." : "Endereço inválido.",
	};
}
export type TGetOrganizationSlugAvailabilityOutput = Awaited<ReturnType<typeof getOrganizationSlugAvailability>>;

async function getOrganizationSlugAvailabilityRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");

	const input = GetOrganizationSlugAvailabilityInputSchema.parse({
		slug: request.nextUrl.searchParams.get("slug"),
	});
	// Durante o onboarding ainda não há organização vinculada — excludeOrgId fica nulo.
	const result = await getOrganizationSlugAvailability({ input, excludeOrgId: session.membership?.organizacao.id ?? null });
	return NextResponse.json(result);
}

export const GET = appApiHandler({ GET: getOrganizationSlugAvailabilityRoute });
