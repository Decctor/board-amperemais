import UnauthenticatedPage from "@/components/Utils/UnauthenticatedPage";
import UnauthorizedPage from "@/components/Utils/UnauthorizedPage";
import { getCurrentSession } from "@/lib/authentication/session";
import { redirect } from "next/navigation";
import PurchasesPage from "./purchases-page";

export default async function Purchases() {
	const sessionUser = await getCurrentSession();

	if (!sessionUser) redirect("/auth/signin");
	if (!sessionUser.membership?.permissoes.atendimentos.visualizar)
		return <UnauthorizedPage message="Oops, aparentemente você não possui permissão para acessar essa área." />;
	if (!sessionUser.membership) redirect("/onboarding");
	if (!sessionUser.membership.organizacao.configuracao.recursos.erp.acesso)
		return <UnauthorizedPage message="Oops,  sua organização não possui acesso a este recurso." />;
	return <PurchasesPage user={sessionUser.user} membership={sessionUser.membership} />;
}
