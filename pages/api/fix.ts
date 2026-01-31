import type { TOrganizationConfiguration } from "@/schemas/organizations";
import { db } from "@/services/drizzle";
import { campaigns } from "@/services/drizzle/schema";
import { organizationMembers, organizations } from "@/services/drizzle/schema/organizations";
import { eq } from "drizzle-orm";
import type { NextApiRequest } from "next";
import type { NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const organizationsResult = await db.query.organizations.findMany({});

	for (const organization of organizationsResult) {
		const configuration: TOrganizationConfiguration = {
			recursos: {
				analytics: {
					acesso: true,
				},
				campanhas: {
					acesso: true,
					limiteAtivas: null,
				},
				programasCashback: {
					acesso: true,
				},
				hubAtendimentos: {
					acesso: true,
					limiteAtendentes: null,
				},
				relatoriosWhatsapp: {
					acesso: true,
				},
				integracoes: {
					acesso: true,
					limiteAtivas: null,
				},
				iaDicas: {
					acesso: true,
					limiteSemanal: null,
				},
				iaAtendimento: {
					acesso: true,
					limiteCreditos: null,
				},
			},
		};
		console.log(`Updating organization ${organization.id} configuration`);
		await db
			.update(organizations)
			.set({
				configuracao: configuration,
			})
			.where(eq(organizations.id, organization.id));
	}

	return res.status(200).json({
		message: "Organizações configuradas com sucesso",
	});
}
