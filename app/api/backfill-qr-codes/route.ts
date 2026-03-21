import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { generateOrganizationPoiQrCodes, getOrganizationPoiUrl, POI_QR_CODE_TO_DATA_URL_OPTIONS } from "@/lib/organizations/poi-qr-codes";
import { db } from "@/services/drizzle";
import { organizations } from "@/services/drizzle/schema";
import { eq, isNull, or, sql } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";

async function backfillOrganizationPoiQrCodesRoute(_request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	if (!session.user.admin) throw new createHttpError.Forbidden("Acesso restrito a administradores.");

	const candidates = await db
		.select({
			id: organizations.id,
			poiQrCodeKioskDataUrl: organizations.poiQrCodeKioskDataUrl,
			poiQrCodeMobileDataUrl: organizations.poiQrCodeMobileDataUrl,
		})
		.from(organizations);

	let updated = 0;
	const errors: { organizationId: string; message: string }[] = [];

	for (const row of candidates) {
		try {
			console.log(`[BACKFILL_POI_QR_CODES] Generating QR Codes for organization ${row.id}`);
			const both = await generateOrganizationPoiQrCodes({ orgId: row.id });
			await db
				.update(organizations)
				.set({
					poiQrCodeKioskDataUrl: both.poiQrCodeKioskDataUrl,
					poiQrCodeMobileDataUrl: both.poiQrCodeMobileDataUrl,
				})
				.where(eq(organizations.id, row.id));
			updated += 1;
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			errors.push({ organizationId: row.id, message });
			console.error("[BACKFILL_POI_QR_CODES] Falha na organização", row.id, err);
		}
	}

	return NextResponse.json({
		data: {
			candidatesTotal: candidates.length,
			updated,
			failed: errors.length,
			errors,
		},
		message:
			errors.length === 0
				? "QR Codes de POI atualizados com sucesso para todas as organizações elegíveis."
				: "Backfill concluído com algumas falhas. Verifique o campo errors.",
	});
}

export const GET = appApiHandler({
	GET: backfillOrganizationPoiQrCodesRoute,
});
