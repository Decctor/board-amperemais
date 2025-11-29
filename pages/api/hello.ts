import { formatWithoutDiacritics } from "@/lib/formatting";
import { calculateStringSimilarity } from "@/lib/utils";
import type { TUtilsSalesPromoCampaignConfig } from "@/schemas/utils";
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { db } from "@/services/drizzle";
import { utils } from "@/services/drizzle/schema";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
	return res.status(200).json({ message: "Hello, world!" });
}
