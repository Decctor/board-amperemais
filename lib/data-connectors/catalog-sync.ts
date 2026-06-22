import { db } from "@/services/drizzle";
import { syncCardapioWebCatalog } from "./cardapio-web/catalog-sync";
import { syncNuvemshopCatalog } from "./nuvemshop/catalog-sync";
import type { TNuvemshopConfig } from "./nuvemshop/types";

export type TSyncProductsForOrganizationResult = {
	organizationId: string;
	organizationName: string;
	integracaoTipo: "CARDAPIO-WEB" | "NUVEM-SHOP";
};

export async function syncProductsForOrganization({ organizationId }: { organizationId: string }): Promise<TSyncProductsForOrganizationResult> {
	const organization = await db.query.organizations.findFirst({
		where: (fields, { eq }) => eq(fields.id, organizationId),
		columns: {
			id: true,
			nome: true,
			integracaoTipo: true,
			integracaoConfiguracao: true,
		},
	});

	if (!organization) throw new Error(`Organização não encontrada: ${organizationId}`);

	if (organization.integracaoTipo === "CARDAPIO-WEB") {
		if (!organization.integracaoConfiguracao || organization.integracaoConfiguracao.tipo !== "CARDAPIO-WEB") {
			throw new Error(`Configuração Cardápio Web inválida para organização: ${organizationId}`);
		}

		await syncCardapioWebCatalog(organization.id, organization.integracaoConfiguracao);
		return {
			organizationId: organization.id,
			organizationName: organization.nome,
			integracaoTipo: "CARDAPIO-WEB",
		};
	}

	if (organization.integracaoTipo === "NUVEM-SHOP") {
		if (!organization.integracaoConfiguracao || organization.integracaoConfiguracao.tipo !== "NUVEM-SHOP") {
			throw new Error(`Configuração Nuvem Shop inválida para organização: ${organizationId}`);
		}

		await syncNuvemshopCatalog(organization.id, organization.integracaoConfiguracao as unknown as TNuvemshopConfig);
		return {
			organizationId: organization.id,
			organizationName: organization.nome,
			integracaoTipo: "NUVEM-SHOP",
		};
	}

	throw new Error(
		`Integração "${organization.integracaoTipo ?? "NÃO DEFINIDA"}" não suporta sincronização de catálogo. Integrações suportadas: CARDAPIO-WEB, NUVEM-SHOP.`,
	);
}
