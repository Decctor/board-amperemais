import { appApiHandler } from "@/lib/app-api";
import { getActivePlatformPartnerByCode, normalizeIndicadorCodigo } from "@/lib/platform-partnerships/attribution";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const ValidatePlatformPartnerCodeInputSchema = z.object({
	codigo: z
		.string({
			invalid_type_error: "Tipo inválido para o código de indicação.",
		})
		.optional()
		.nullable(),
});
export type TValidatePlatformPartnerCodeInput = z.infer<typeof ValidatePlatformPartnerCodeInputSchema>;

async function validatePlatformPartnerCode({ input }: { input: TValidatePlatformPartnerCodeInput }) {
	const codigo = input.codigo ? normalizeIndicadorCodigo(input.codigo) : "";
	if (!codigo) {
		return {
			data: {
				valid: true,
				codigo: null,
				partner: null,
			},
			message: "Nenhum código informado.",
		};
	}

	const partner = await getActivePlatformPartnerByCode(codigo);
	return {
		data: {
			valid: !!partner,
			codigo,
			partner: partner
				? {
						id: partner.id,
						nome: partner.nome,
						codigo: partner.codigo,
					}
				: null,
		},
		message: partner ? "Código de indicação validado com sucesso." : "Código de indicação inválido.",
	};
}
export type TValidatePlatformPartnerCodeOutput = Awaited<ReturnType<typeof validatePlatformPartnerCode>>;

async function validatePlatformPartnerCodeRoute(request: NextRequest) {
	const searchParams = request.nextUrl.searchParams;
	const input = ValidatePlatformPartnerCodeInputSchema.parse({
		codigo: searchParams.get("codigo"),
	});
	const result = await validatePlatformPartnerCode({ input });
	return NextResponse.json(result);
}

export const GET = appApiHandler({
	GET: validatePlatformPartnerCodeRoute,
});
