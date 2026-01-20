import { db } from "@/services/drizzle";
import { organizationMembers } from "@/services/drizzle/schema/organizations";
import type { NextApiRequest } from "next";
import type { NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	// const users = await db.query.users.findMany({});
	// const usersWithOrgs = users.filter((u) => !!u.organizacaoId);
	// let totalMembershipsInserted = 0;
	// for (const [index, user] of usersWithOrgs.entries()) {
	// 	const insertedMembershipResponse = await db
	// 		.insert(organizationMembers)
	// 		.values({
	// 			usuarioId: user.id,
	// 			organizacaoId: user.organizacaoId as string,
	// 			permissoes: user.permissoes,
	// 		})
	// 		.returning({ id: organizationMembers.id });
	// 	const insertedMembershipId = insertedMembershipResponse[0]?.id;
	// 	console.log(
	// 		`[INFO] [FIXING] User ${user.id} added to organization ${user.organizacaoId} at index ${index} via the membership of ID: ${insertedMembershipId}`,
	// 	);
	// 	totalMembershipsInserted++;
	// }
	// return res.status(200).json({ message: "Fixing completed", totalMembershipsInserted });

	return res.status(200).json({ message: "Fixing completed" });
}
