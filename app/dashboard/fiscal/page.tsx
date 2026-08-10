import UnauthorizedPage from "@/components/Utils/UnauthorizedPage";
import { requireDashboardCapability } from "@/lib/access/guards";
import { redirect } from "next/navigation";
import FiscalPage from "./fiscal-page";

export default async function Fiscal() {
	const { sessionUser, unauthorized } = await requireDashboardCapability("fiscal");
	if (unauthorized) return unauthorized;

	if (!sessionUser) redirect("/auth/signin");
	if (!sessionUser.membership) redirect("/onboarding");
	if (!sessionUser.membership.organizacao.configuracao.recursos.erp.acesso)
		return <UnauthorizedPage message="Oops,  sua organização não possui acesso a este recurso." />;

	const userHasFiscalViewPermission = sessionUser.membership.permissoes.fiscal.visualizar;
	if (!userHasFiscalViewPermission) return <UnauthorizedPage message="Oops,  você não possui permissão para visualizar o módulo fiscal." />;

	const userHasFiscalConfigurePermission = sessionUser.membership.permissoes.fiscal.configurar;
	const userHasFiscalEmitPermission = sessionUser.membership.permissoes.fiscal.emitir;
	const userHasFiscalCancelPermission = sessionUser.membership.permissoes.fiscal.cancelar;

	return (
		<FiscalPage
			userHasFiscalViewPermission={userHasFiscalViewPermission}
			userHasFiscalConfigurePermission={userHasFiscalConfigurePermission}
			userHasFiscalEmitPermission={userHasFiscalEmitPermission}
			userHasFiscalCancelPermission={userHasFiscalCancelPermission}
		/>
	);
}
