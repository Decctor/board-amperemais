import { requireDashboardCapability } from "@/lib/access/guards";
import { resolveResultsScopeSellerIds } from "@/lib/permissions/results-scope";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import SalesResultsPage from "./results-page";

export const metadata: Metadata = {
	title: "Resultados de vendas",
	description: "Análise comercial das vendas e, com ERP, recebimentos por método, resultado por vendedor e saúde fiscal do período.",
};

export default async function SalesResults() {
	const { sessionUser, unauthorized } = await requireDashboardCapability("salesResults");
	if (unauthorized) return unauthorized;
	if (!sessionUser) redirect("/auth/signin");
	if (!sessionUser.membership) redirect("/onboarding");

	const membership = sessionUser.membership;
	// `resultados.escopo` guarda ids de usuários; os filtros de vendedor trabalham com ids de vendedor.
	const scopeSellersIds = await resolveResultsScopeSellerIds({
		organizacaoId: membership.organizacao.id,
		resultsScope: membership.permissoes.resultados.escopo,
	});

	return (
		<SalesResultsPage
			user={sessionUser.user}
			userOrg={membership.organizacao}
			membership={membership}
			scopeSellersIds={scopeSellersIds}
			hasErpAccess={membership.organizacao.configuracao.recursos.erp.acesso}
		/>
	);
}
