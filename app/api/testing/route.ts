import { db } from "@/services/drizzle";
import { sales } from "@/services/drizzle/schema";
import { count, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

const ORGID = "5a03eb49-a0a9-434e-90f0-24107c3dcf4a";
export async function GET() {
	const salesGroupedByNature = await db
		.select({
			nature: sales.natureza,
			count: count(),
		})
		.from(sales)
		.where(eq(sales.organizacaoId, ORGID))
		.groupBy(sales.natureza);

	return NextResponse.json({
		salesGroupedByNature,
	});
}
