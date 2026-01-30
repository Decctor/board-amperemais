import { db } from "@/services/drizzle";
import { campaigns } from "@/services/drizzle/schema";
import { organizationMembers } from "@/services/drizzle/schema/organizations";
import { eq } from "drizzle-orm";
import type { NextApiRequest } from "next";
import type { NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {}
