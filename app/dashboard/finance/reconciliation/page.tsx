import UnauthorizedPage from "@/components/Utils/UnauthorizedPage";
import { requireDashboardCapability } from "@/lib/access/guards";
import { canViewFinances } from "@/lib/permissions/finances";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import FinanceReconciliationPage from "./reconciliation-page";

export const metadata: Metadata = {
	title: "Conciliação",
	description: "Conciliação bancária das contas financeiras do seu negócio.",
};

export default async function FinanceReconciliation() {
	const { sessionUser, unauthorized } = await requireDashboardCapability("finance");
	if (unauthorized) return unauthorized;
	if (!sessionUser) redirect("/auth/signin");
	if (!sessionUser.membership) redirect("/onboarding");

	const { organizacao, permissoes } = sessionUser.membership;
	if (!organizacao.configuracao.recursos.erp.acesso) {
		return <UnauthorizedPage message="Sua organização não possui acesso ao módulo financeiro." />;
	}
	if (!canViewFinances(permissoes)) {
		return <UnauthorizedPage message="Você não possui permissão para visualizar o módulo financeiro." />;
	}

	return <FinanceReconciliationPage />;
}
