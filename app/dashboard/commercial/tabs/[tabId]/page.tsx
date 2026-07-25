import { getCurrentSession } from "@/lib/authentication/session";
import { redirect } from "next/navigation";
import TabWorkspacePage from "./tab-workspace-page";

export default async function TabWorkspace({ params }: { params: Promise<{ tabId: string }> }) {
	const { tabId } = await params;

	const sessionUser = await getCurrentSession();
	if (!sessionUser) redirect("/auth/signin");

	const membership = sessionUser.membership;
	if (!membership) redirect("/onboarding");
	if (!membership.organizacao.configuracao.recursos.erp.acesso) redirect("/dashboard/commercial/sales");
	// Módulo desabilitado na organização: rota inacessível (mesmo gate do board).
	if (!membership.organizacao.configuracao.preferencias.contasAtendimento?.habilitado) redirect("/dashboard/commercial/sales");

	return <TabWorkspacePage tabId={tabId} />;
}
