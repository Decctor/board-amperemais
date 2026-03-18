import { db } from "@/services/drizzle";
import { organizationMembers } from "@/services/drizzle/schema";
import { eq } from "drizzle-orm";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const allMemberships = await db.query.organizationMembers.findMany({});

	for (const membership of allMemberships) {
		await db
			.update(organizationMembers)
			.set({
				permissoes: {
					...membership.permissoes,
					vendas: {
						visualizar: true,
						editar: true,
						criar: true,
						excluir: true,
					},
					compras: {
						visualizar: true,
						editar: true,
						criar: true,
						excluir: true,
					},
				},
			})
			.where(eq(organizationMembers.id, membership.id));
	}
}
