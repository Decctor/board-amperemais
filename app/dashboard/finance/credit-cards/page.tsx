import UnauthorizedPage from "@/components/Utils/UnauthorizedPage";
import { requireDashboardCapability } from "@/lib/access/guards";
import { canCreateFinances, canViewFinances } from "@/lib/permissions/finances";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import FinanceCreditCardInvoicesPage from "./credit-card-invoices-page";

export const metadata: Metadata = {
	title: "Faturas de Cartão",
	description: "Faturas dos cartões de crédito do seu negócio.",
};

export default async function FinanceCreditCards() {
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

	return <FinanceCreditCardInvoicesPage canCreatePayments={canCreateFinances(permissoes)} />;
}
