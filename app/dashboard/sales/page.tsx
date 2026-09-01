import SalesEmptyState from "@/components/Sales/SalesEmptyState";
import { requireDashboardCapability } from "@/lib/access/guards";
import type { TOrganizationConfiguration } from "@/schemas/organizations";
import { db } from "@/services/drizzle";
import { redirect } from "next/navigation";
import SalesHistoryPage from "./sales-history-page";

export default async function Sales() {
	const access = await requireDashboardCapability("sales");
	if (access.unauthorized) return access.unauthorized;
	const sessionUser = access.sessionUser;
	if (!sessionUser) redirect("/auth/signin");

	const membership = sessionUser.membership;
	if (!membership) redirect("/onboarding");

	const orgId = membership.organizacao.id;
	const organizationConfig = membership.organizacao.configuracao as TOrganizationConfiguration | null;

	// Check if the organization has any sales
	const firstSale = await db.query.sales.findFirst({
		where: (fields, { eq }) => eq(fields.organizacaoId, orgId),
		columns: { id: true },
	});
	const hasSales = !!firstSale;

	if (!hasSales) {
		return <SalesEmptyState organizationId={orgId} organizationConfig={organizationConfig} />;
	}

	return (
		<SalesHistoryPage
			organization={membership.organizacao}
			canEditSales={membership.permissoes.vendas.editar}
			canEmitFiscal={membership.permissoes.fiscal.emitir}
		/>
	);
}
