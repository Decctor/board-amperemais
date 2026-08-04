import { assertCronAuthorized } from "@/lib/cron/assert-cron-authorized";
import { generateRecurringAccountingEntries } from "@/lib/finances/generate-recurring-accounting-entries";
import { db } from "@/services/drizzle";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
	try {
		assertCronAuthorized(request);
		const data = await generateRecurringAccountingEntries(db);
		return NextResponse.json({ data, message: "Lançamentos recorrentes gerados com sucesso." });
	} catch (error) {
		const status =
			typeof error === "object" && error !== null && "statusCode" in error && typeof error.statusCode === "number" ? error.statusCode : 500;
		return NextResponse.json({ message: error instanceof Error ? error.message : "Não foi possível gerar lançamentos recorrentes." }, { status });
	}
}
