import QRCode from "qrcode";

export const POI_QR_CODE_TO_DATA_URL_OPTIONS = {
	errorCorrectionLevel: "M" as const,
	margin: 1,
	width: 320,
};

export function getAppBaseUrl() {
	const vercelUrl = process.env.VERCEL_URL;
	if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
	if (vercelUrl) return `https://${vercelUrl}`;
	return "http://localhost:3000";
}

export function getOrganizationPoiUrl({ orgId, mode }: { orgId: string; mode: "kiosk" | "mobile" }) {
	return `${getAppBaseUrl()}/point-of-interaction/${orgId}?mode=${mode}`;
}

export async function generateOrganizationPoiQrCodes({ orgId }: { orgId: string }) {
	const [poiQrCodeKioskDataUrl, poiQrCodeMobileDataUrl] = await Promise.all([
		QRCode.toDataURL(getOrganizationPoiUrl({ orgId, mode: "kiosk" }), POI_QR_CODE_TO_DATA_URL_OPTIONS),
		QRCode.toDataURL(getOrganizationPoiUrl({ orgId, mode: "mobile" }), POI_QR_CODE_TO_DATA_URL_OPTIONS),
	]);

	return {
		poiQrCodeKioskDataUrl,
		poiQrCodeMobileDataUrl,
	};
}
