import UnauthorizedPage from "@/components/Utils/UnauthorizedPage";
import { ActionApprovalsQueue } from "@/components/ActionApprovals/ActionApprovalsQueue";
import { requireDashboardCapability } from "@/lib/access/guards";
import { resolveDiscountAuthority } from "@/lib/permissions/discounts";
import { redirect } from "next/navigation";

export default async function Approvals() {
	const access = await requireDashboardCapability("approvals");
	if (access.unauthorized) return access.unauthorized;
	const sessionUser = access.sessionUser;
	if (!sessionUser) redirect("/auth/signin");
	if (!sessionUser.membership) redirect("/onboarding");

	const { organizacao, permissoes } = sessionUser.membership;
	if (!organizacao.configuracao.recursos.erp.acesso) {
		return <UnauthorizedPage message="Sua organização não possui acesso às aprovações do ERP." />;
	}

	const canApprove = resolveDiscountAuthority(permissoes).aprovar;
	if (!canApprove) {
		return <UnauthorizedPage message="Você não possui permissão para visualizar aprovações." />;
	}

	return <ActionApprovalsQueue orgId={organizacao.id} canApprove={canApprove} />;
}
