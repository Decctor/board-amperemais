import { db } from "@/services/drizzle";
import { shopSettings } from "@/services/drizzle/schema";
import { eq } from "drizzle-orm";
import type { NextApiRequest, NextApiResponse } from "next";
import QRCode from "qrcode";

export const QR_CODE_TO_DATA_URL_OPTIONS = {
	errorCorrectionLevel: "M" as const,
	margin: 1,
	width: 320,
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const shopSettingsResult = await db.query.shopSettings.findMany({});

	for (const shopSetting of shopSettingsResult) {
		const shopQrCode = await QRCode.toDataURL(`${process.env.NEXT_PUBLIC_APP_URL}/shop/${shopSetting.organizacaoId}`, QR_CODE_TO_DATA_URL_OPTIONS);

		await db
			.update(shopSettings)
			.set({
				linkQrCode: shopQrCode,
			})
			.where(eq(shopSettings.id, shopSetting.id));
	}

	return res.status(200).json({
		message: "QR Codes populados com sucesso.",
	});
}
