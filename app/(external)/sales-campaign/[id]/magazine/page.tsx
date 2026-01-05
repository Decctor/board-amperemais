import ErrorComponent from "@/components/Layouts/ErrorComponent";
import { getCurrentSession } from "@/lib/authentication/session";
import type { TUtilsSalesPromoCampaignConfig } from "@/schemas/utils";
import { db } from "@/services/drizzle";
import { redirect } from "next/navigation";
import SalesCampaignMagazinePage from "./magazine-page";
export default async function SalesCampaignMagazine({ params }: { params: Promise<{ id: string }> }) {
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

	const campaignItemsIds = campaign.valor.dados.itens.flatMap((item) => item.produtos.map((p) => p.id));
	const campaignItems = await db.query.products.findMany({
		where: (fields, { inArray }) => inArray(fields.id, campaignItemsIds),
		columns: {
			id: true,
			descricao: true,
			imagemCapaUrl: true,
		},
	});
	return <SalesCampaignMagazinePage campaign={campaign as TUtilsSalesPromoCampaignConfig} campaignItems={campaignItems} />;
}
