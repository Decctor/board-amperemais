import { getActivePlatformPartnerByCode, normalizeIndicadorCodigo } from "@/lib/platform-partnerships/attribution";
import { PLATFORM_PARTNER_COOKIE_MAX_AGE_SECONDS, PLATFORM_PARTNER_COOKIE_NAME } from "@/lib/platform-partnerships/constants";
import { db } from "@/services/drizzle";
import { platformPartnerReferralEvents } from "@/services/drizzle/schema";
import { createHash } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";

function hashNullable(value: string | null) {
	if (!value) return null;
	return createHash("sha256").update(value).digest("hex");
}

export async function GET(request: NextRequest, ctx: RouteContext<"/r/[code]">) {
	const { code: rawCode } = await ctx.params;
	const code = normalizeIndicadorCodigo(rawCode);
	const partner = await getActivePlatformPartnerByCode(code);
	const redirectUrl = new URL("/", request.url);

	if (!partner) {
		redirectUrl.searchParams.set("indicacao", "invalida");
		return NextResponse.redirect(redirectUrl);
	}

	const forwardedFor = request.headers.get("x-forwarded-for");
	const ip = forwardedFor?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip");
	const userAgent = request.headers.get("user-agent");

	await db.insert(platformPartnerReferralEvents).values({
		partnerId: partner.id,
		codigoUsado: code,
		origemUrl: request.headers.get("referer"),
		utmSource: request.nextUrl.searchParams.get("utm_source"),
		utmMedium: request.nextUrl.searchParams.get("utm_medium"),
		utmCampaign: request.nextUrl.searchParams.get("utm_campaign"),
		ipHash: hashNullable(ip),
		userAgentHash: hashNullable(userAgent),
	});

	redirectUrl.searchParams.set("ref", code);
	const response = NextResponse.redirect(redirectUrl);
	response.cookies.set(PLATFORM_PARTNER_COOKIE_NAME, code, {
		path: "/",
		maxAge: PLATFORM_PARTNER_COOKIE_MAX_AGE_SECONDS,
		sameSite: "lax",
		secure: process.env.NODE_ENV === "production",
	});
	return response;
}
