import ErrorComponent from "@/components/Layouts/ErrorComponent";
import { getCurrentSession } from "@/lib/authentication/session";
import { redirect } from "next/navigation";
import CampaignResultPage from "./campaign-result-page";

export default async function CampaignResult({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	if (!id) return <ErrorComponent msg="ID inválido" />;
	const sessionUser = await getCurrentSession();
	if (!sessionUser) redirect("/auth/signin");
	return <CampaignResultPage user={sessionUser.user} campaignId={id} />;
}
