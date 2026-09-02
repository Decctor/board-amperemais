import PlanRestrictionComponent from "@/components/Layouts/PlanRestrictionComponent";
import { requireDashboardCapability } from "@/lib/access/guards";
import { getCurrentSession } from "@/lib/authentication/session";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import SalesResultsPage from "./results-page";

export const metadata: Metadata = {
	title: "Resultados de vendas",
	description: "Vendas, recebimentos por método, resultado por vendedor e saúde fiscal do período.",
};

export default async function SalesResults() {
	const sessionUser = await getCurrentSession();
	if (!sessionUser) redirect("/auth/signin");
	if (!sessionUser.membership) redirect("/onboarding");

	if (!sessionUser.membership.organizacao.configuracao.recursos.erp.acesso) {
		return (
			<PlanRestrictionComponent
				title="Resultados de vendas"
				message="Os resultados de vendas consolidam recebimentos e emissão fiscal, disponíveis apenas para organizações com o módulo de ERP."
			/>
		);
	}

	const { unauthorized } = await requireDashboardCapability("salesResults");
	if (unauthorized) return unauthorized;

	const { permissoes } = sessionUser.membership;
	return (
		<SalesResultsPage
			hasResultsScope={Boolean(permissoes.resultados.escopo && permissoes.resultados.escopo.length > 0)}
			canViewSensitive={permissoes.resultados.visualizarSensiveis}
		/>
	);
}
