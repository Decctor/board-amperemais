import ErrorComponent from "@/components/Layouts/ErrorComponent";
import { getCurrentSession } from "@/lib/authentication/session";
import type { TUtilsSalesPromoCampaignConfig } from "@/schemas/utils";
import { db } from "@/services/drizzle";
import { redirect } from "next/navigation";
import SalesCampaignConditionsPage from "./conditions-page";

export default async function SalesCampaignConditions({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;

	const sessionUser = await getCurrentSession();
	if (!sessionUser) redirect("/auth/signin");

	const campaign = await db.query.utils.findFirst({
		where: (fields, { eq }) => eq(fields.id, id),
	});

	if (!campaign) {
		return <ErrorComponent msg="Campanha não encontrada." />;
	}

	if (campaign.valor.identificador !== "SALES_PROMO_CAMPAIGN") {
		return <ErrorComponent msg="O recurso especificado não é uma campanha de promoção de vendas." />;
	}

	const campaignItemsIds = campaign.valor.dados.itens.map((item) => item.produtoId);
	const campaignItems = await db.query.products.findMany({
		where: (fields, { inArray }) => inArray(fields.id, campaignItemsIds),
		columns: {
			id: true,
			descricao: true,
			imagemCapaUrl: true,
		},
	});
	return <SalesCampaignConditionsPage campaign={campaign as TUtilsSalesPromoCampaignConfig} campaignItems={campaignItems} />;
}
