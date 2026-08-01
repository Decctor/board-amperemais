import UnauthorizedPage from "@/components/Utils/UnauthorizedPage";
import { requireDashboardCapability } from "@/lib/access/guards";
import { redirect } from "next/navigation";
import SalesOrdersPage from "./orders-page";

export default async function SalesOrders() {
	const access = await requireDashboardCapability("orders");
	if (access.unauthorized) return access.unauthorized;
	const sessionUser = access.sessionUser;
	if (!sessionUser) redirect("/auth/signin");
	if (!sessionUser.membership) redirect("/onboarding");

	const { organizacao, permissoes } = sessionUser.membership;
	if (!organizacao.configuracao.recursos.erp.acesso) {
		return <UnauthorizedPage message="Sua organização não possui acesso ao módulo de pedidos." />;
	}
	if (!permissoes.vendas.visualizar) {
		return <UnauthorizedPage message="Você não possui permissão para visualizar pedidos." />;
	}

	return <SalesOrdersPage organization={organizacao} canEditSales={permissoes.vendas.editar} canDeleteSales={permissoes.vendas.excluir} />;
}
