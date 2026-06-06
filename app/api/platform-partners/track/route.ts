import { appApiHandler } from "@/lib/app-api";
import { getActivePlatformPartnerByCode, normalizeIndicadorCodigo } from "@/lib/platform-partnerships/attribution";
import { PLATFORM_PARTNER_COOKIE_MAX_AGE_SECONDS, PLATFORM_PARTNER_COOKIE_NAME } from "@/lib/platform-partnerships/constants";
import { db } from "@/services/drizzle";
import { platformPartnerReferralEvents } from "@/services/drizzle/schema";
import { createHash } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const TrackPlatformPartnerInputSchema = z.object({
	codigo: z.string({
		required_error: "Codigo de indicacao nao informado.",
		invalid_type_error: "Tipo invalido para o codigo de indicacao.",
	}),
	origemUrl: z.string({ invalid_type_error: "Tipo invalido para a URL de origem." }).optional().nullable(),
	utmSource: z.string({ invalid_type_error: "Tipo invalido para utm_source." }).optional().nullable(),
	utmMedium: z.string({ invalid_type_error: "Tipo invalido para utm_medium." }).optional().nullable(),
	utmCampaign: z.string({ invalid_type_error: "Tipo invalido para utm_campaign." }).optional().nullable(),
});
export type TTrackPlatformPartnerInput = z.infer<typeof TrackPlatformPartnerInputSchema>;

function hashNullable(value: string | null) {
	if (!value) return null;
	return createHash("sha256").update(value).digest("hex");
}

async function trackPlatformPartner({ input, request }: { input: TTrackPlatformPartnerInput; request: NextRequest }) {
	const codigo = normalizeIndicadorCodigo(input.codigo);
	const partner = await getActivePlatformPartnerByCode(codigo);

	if (!partner) {
		return {
			data: {
				tracked: false,
				codigo,
			},
			message: "Codigo de indicacao invalido.",
		};
	}

	const forwardedFor = request.headers.get("x-forwarded-for");
	const ip = forwardedFor?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip");
	const userAgent = request.headers.get("user-agent");

	await db.insert(platformPartnerReferralEvents).values({
		partnerId: partner.id,
		codigoUsado: codigo,
		origemUrl: input.origemUrl ?? request.headers.get("referer"),
		utmSource: input.utmSource ?? null,
		utmMedium: input.utmMedium ?? null,
		utmCampaign: input.utmCampaign ?? null,
		ipHash: hashNullable(ip),
		userAgentHash: hashNullable(userAgent),
	});

	return {
		data: {
			tracked: true,
			codigo,
		},
		message: "Indicacao registrada com sucesso.",
	};
}
export type TTrackPlatformPartnerOutput = Awaited<ReturnType<typeof trackPlatformPartner>>;

async function trackPlatformPartnerRoute(request: NextRequest) {
	const payload = await request.json();
	const input = TrackPlatformPartnerInputSchema.parse(payload);
	const result = await trackPlatformPartner({ input, request });

	const response = NextResponse.json(result);
	if (result.data.tracked) {
		response.cookies.set(PLATFORM_PARTNER_COOKIE_NAME, result.data.codigo, {
			path: "/",
			maxAge: PLATFORM_PARTNER_COOKIE_MAX_AGE_SECONDS,
			sameSite: "lax",
			secure: process.env.NODE_ENV === "production",
		});
	}
	return response;
}

export const POST = appApiHandler({
	POST: trackPlatformPartnerRoute,
});
