import UnauthorizedPage from "@/components/Utils/UnauthorizedPage";
import { requireDashboardCapability } from "@/lib/access/guards";
import { redirect } from "next/navigation";
import PreparationBoard from "@/app/dashboard/sales/_components/preparation/preparation-board";

export default async function Preparation() {
	const access = await requireDashboardCapability("preparation");
	if (access.unauthorized) return access.unauthorized;
	const sessionUser = access.sessionUser;
	if (!sessionUser) redirect("/auth/signin");
	if (!sessionUser.membership) redirect("/onboarding");

	const { organizacao, permissoes } = sessionUser.membership;
	if (!organizacao.configuracao.recursos.erp.acesso) {
		return <UnauthorizedPage message="Sua organização não possui acesso ao módulo de preparo." />;
	}
	if (!permissoes.vendas.visualizar) {
		return <UnauthorizedPage message="Você não possui permissão para visualizar o preparo." />;
	}

	return <PreparationBoard />;
}
