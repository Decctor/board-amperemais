import { getCurrentSession } from "@/lib/authentication/session";
import { redirect } from "next/navigation";
import TabsBoardPage from "./tabs-board-page";

export default async function Tabs() {
	const sessionUser = await getCurrentSession();
	if (!sessionUser) redirect("/auth/signin");

	const membership = sessionUser.membership;
	if (!membership) redirect("/onboarding");
	if (!membership.organizacao.configuracao.recursos.erp.acesso) redirect("/dashboard/commercial/sales");

	return <TabsBoardPage />;
}
