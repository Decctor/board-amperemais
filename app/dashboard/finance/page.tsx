import UnauthorizedPage from "@/components/Utils/UnauthorizedPage";
import { requireDashboardCapability } from "@/lib/access/guards";
import { redirect } from "next/navigation";
import FinancesPage from "./finances-page";

export default async function Finances() {
	const { sessionUser, unauthorized } = await requireDashboardCapability("finance");
	if (unauthorized) return unauthorized;

	if (!sessionUser) redirect("/auth/signin");
	if (!sessionUser.membership) redirect("/onboarding");
	if (!sessionUser.membership.organizacao.configuracao.recursos.erp.acesso)
		return <UnauthorizedPage message="Oops,  sua organização não possui acesso a este recurso." />;

	return <FinancesPage user={sessionUser.user} membership={sessionUser.membership} />;
}
