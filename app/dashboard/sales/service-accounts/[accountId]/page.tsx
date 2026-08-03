import { requireDashboardCapability } from "@/lib/access/guards";
import { appRoutes } from "@/lib/navigation/routes";
import { redirect } from "next/navigation";
import TabWorkspacePage from "./tab-workspace-page";

export default async function TabWorkspace({ params }: { params: Promise<{ accountId: string }> }) {
	const { accountId } = await params;

	const access = await requireDashboardCapability("serviceAccounts");
	if (access.unauthorized) return access.unauthorized;
	const sessionUser = access.sessionUser;
	if (!sessionUser) redirect("/auth/signin");

	const membership = sessionUser.membership;
	if (!membership) redirect("/onboarding");
	if (!membership.organizacao.configuracao.recursos.erp.acesso) redirect(appRoutes.sales.root());
	// Módulo desabilitado na organização: rota inacessível (mesmo gate do board).
	if (!membership.organizacao.configuracao.preferencias.contasAtendimento?.habilitado) redirect(appRoutes.sales.root());

	return <TabWorkspacePage tabId={accountId} />;
}
