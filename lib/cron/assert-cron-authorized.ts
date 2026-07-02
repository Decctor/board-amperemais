import createHttpError from "http-errors";
import type { NextRequest } from "next/server";

export function assertCronAuthorized(req: NextRequest) {
	const secret = process.env.CRON_SECRET;
	if (!secret) {
		// Fail-closed em producao: sem CRON_SECRET configurado, as rotas de cron ficariam publicas.
		if (process.env.NODE_ENV === "production") throw new createHttpError.Unauthorized("CRON_SECRET nao configurado.");
		return;
	}
	if (req.headers.get("authorization") !== `Bearer ${secret}`) {
		throw new createHttpError.Unauthorized("Unauthorized");
	}
}
