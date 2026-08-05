import UnauthorizedPage from "@/components/Utils/UnauthorizedPage";
import { requireDashboardCapability } from "@/lib/access/guards";
import { canViewFinances } from "@/lib/permissions/finances";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import FinanceTransactionsPage from "./transactions-page";

export const metadata: Metadata = {
	title: "Movimentações",
	description: "Movimentações financeiras do seu negócio.",
};

export default async function FinanceTransactions() {
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

	return <FinanceTransactionsPage />;
}
