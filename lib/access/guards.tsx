import { getCurrentSession } from "@/lib/authentication/session";
import { redirect } from "next/navigation";
import UnauthorizedPage from "@/components/Utils/UnauthorizedPage";
import { canAccessDashboardCapability, type TDashboardCapability } from "./capabilities";

export async function requireDashboardCapability(capability: TDashboardCapability) {
	const sessionUser = await getCurrentSession();
	if (!sessionUser) redirect("/auth/signin");
	if (!sessionUser.membership) redirect("/onboarding");

	if (
		!canAccessDashboardCapability(capability, {
			organization: sessionUser.membership.organizacao,
			permissions: sessionUser.membership.permissoes,
		})
	) {
		return { sessionUser, unauthorized: <UnauthorizedPage message="Você não possui permissão para acessar este recurso." /> };
	}

	return { sessionUser, unauthorized: null as null };
}
