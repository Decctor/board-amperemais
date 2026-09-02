import SalesEmptyState from "@/components/Sales/SalesEmptyState";
import UnauthorizedPage from "@/components/Utils/UnauthorizedPage";
import { getCurrentSession } from "@/lib/authentication/session";
import { resolveResultsScopeSellerIds } from "@/lib/permissions/results-scope";
import type { TOrganizationConfiguration } from "@/schemas/organizations";
import { db } from "@/services/drizzle";
import { redirect } from "next/navigation";
import { DashboardPage } from "./dashboard-page";

export default async function Main() {
	const authSession = await getCurrentSession();
	if (!authSession) redirect("/auth/signin");
	const membership = authSession.membership;
	if (!membership) redirect("/onboarding");

	// Check if the organization has any sales
	const firstSale = await db.query.sales.findFirst({
		where: (fields, { eq }) => eq(fields.organizacaoId, membership.organizacao.id),
		columns: { id: true },
	});
	const hasSales = !!firstSale;

	if (!hasSales) {
		return (
			<SalesEmptyState
				organizationId={membership.organizacao.id}
				organizationConfig={membership.organizacao.configuracao as TOrganizationConfiguration}
			/>
		);
	}
	// `resultados.escopo` guarda ids de usuários; os filtros de vendedor trabalham com ids de vendedor.
	const scopeSellersIds = await resolveResultsScopeSellerIds({ organizacaoId: membership.organizacao.id, resultsScope: membership.permissoes.resultados.escopo });

	return <DashboardPage user={authSession.user} userOrg={membership.organizacao} membership={membership} scopeSellersIds={scopeSellersIds} />;
}
