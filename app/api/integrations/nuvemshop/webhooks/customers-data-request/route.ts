import { handleNuvemshopLgpdWebhook } from "@/lib/integrations/nuvemshop/webhook-notifications";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
	return handleNuvemshopLgpdWebhook(request, "customers/data_request");
}
