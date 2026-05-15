import createHttpError from "http-errors";
import type { NextRequest } from "next/server";

export function assertCronAuthorized(req: NextRequest) {
	const authHeader = req.headers.get("authorization");
	if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
		throw new createHttpError.Unauthorized("Unauthorized");
	}
}
