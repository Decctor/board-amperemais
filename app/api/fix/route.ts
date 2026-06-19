import { db } from "@/services/drizzle";
import { sales } from "@/services/drizzle/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export const GET = async () => {
	const updatedSales = await db
		.update(sales)
		.set({
			natureza: "SN01",
		})
		.where(eq(sales.organizacaoId, "2658876a-d365-4e37-ba1e-5a63239cf98f"))
		.returning({
			id: sales.id,
		});
	return NextResponse.json({ message: "Sales updated", data: updatedSales.length });
};
