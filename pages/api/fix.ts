import { db } from "@/services/drizzle";
import { organizationMembers } from "@/services/drizzle/schema/organizations";
import { eq } from "drizzle-orm";
import type { NextApiRequest } from "next";
import type { NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const organizationMemberships = await db.query.organizationMembers.findMany({
	});

	for (const membership of organizationMemberships) {
		if (!membership.usuarioVendedorId) continue;
		await db
			.update(organizationMembers)
			.set({
				usuarioVendedorId: membership.usuarioVendedorId,
			})
			.where(eq(organizationMembers.id, membership.id));
	}
	return res.status(200).json({ message: "Fix completed successfully" });
}
