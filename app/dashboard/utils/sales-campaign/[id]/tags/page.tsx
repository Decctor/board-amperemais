import ErrorComponent from "@/components/Layouts/ErrorComponent";
import { getCurrentSession } from "@/lib/authentication/session";
import type { TUtilsSalesPromoCampaignConfig } from "@/schemas/utils";
import { db } from "@/services/drizzle";
import { redirect } from "next/navigation";
import SalesCampaignTagsPage from "./tags-page";

type CampaignItem = TUtilsSalesPromoCampaignConfig["valor"]["dados"]["itens"][number];

export default async function SalesCampaignTags({
	params,
	searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<{ tagType?: string }> }) {
	const { id } = await params;
	const { tagType } = await searchParams;

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
	if (!tagType) {
		return <ErrorComponent msg="Tipo de etiqueta não especificado." />;
	}

	return <SalesCampaignTagsPage campaign={campaign as TUtilsSalesPromoCampaignConfig} tagType={tagType} />;
}
