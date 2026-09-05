import FiscalDocumentPage from "@/app/dashboard/fiscal/_module/documents/fiscal-document-page";
import UnauthorizedPage from "@/components/Utils/UnauthorizedPage";
import { requireDashboardCapability } from "@/lib/access/guards";
import { getFiscalSettings } from "@/lib/fiscal/settings";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
	title: "Documento fiscal",
};

export default async function FiscalDocument({ params }: { params: Promise<{ documentId: string }> }) {
	const { documentId } = await params;
	const { sessionUser, unauthorized } = await requireDashboardCapability("fiscal");
	if (unauthorized) return unauthorized;

	if (!sessionUser) redirect("/auth/signin");
	if (!sessionUser.membership) redirect("/onboarding");
	if (!sessionUser.membership.organizacao.configuracao.recursos.erp.acesso)
		return <UnauthorizedPage message="Oops,  sua organização não possui acesso a este recurso." />;

	const permissoes = sessionUser.membership.permissoes.fiscal;
	if (!permissoes.visualizar) return <UnauthorizedPage message="Oops,  você não possui permissão para visualizar o módulo fiscal." />;

	const fiscalSettings = await getFiscalSettings(sessionUser.membership.organizacao.id);
	const exceptionalPresenceEnabled = fiscalSettings.fiscalConfiguracao?.emissaoManual?.classificacaoPresencialExcepcional?.habilitada ?? false;

	return (
		<FiscalDocumentPage
			documentId={documentId}
			permissions={{ emitir: permissoes.emitir, cancelar: permissoes.cancelar, configurar: permissoes.configurar }}
			exceptionalPresenceEnabled={exceptionalPresenceEnabled}
		/>
	);
}
