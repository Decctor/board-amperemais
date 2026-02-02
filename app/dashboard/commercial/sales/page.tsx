import SalesEmptyState from "@/components/Sales/SalesEmptyState";
import { getCurrentSession } from "@/lib/authentication/session";
import type { TOrganizationConfiguration } from "@/schemas/organizations";
import { db } from "@/services/drizzle";
import { redirect } from "next/navigation";
import SalesPage from "./sales-page";

export default async function Sales() {
	const sessionUser = await getCurrentSession();
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
		return <SalesEmptyState organizationConfig={organizationConfig} />;
	}

	return <SalesPage user={sessionUser.user} />;
}
