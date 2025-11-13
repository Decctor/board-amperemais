import UnauthorizedPage from "@/components/Utils/UnauthorizedPage";
import { getCurrentSession } from "@/lib/authentication/session";
import { redirect } from "next/navigation";
import { DashboardPage } from "./dashboard-page";

export default async function Main() {
	const authSession = await getCurrentSession();
	if (!authSession) redirect("/auth/signin");
	if (!authSession.user.permissoes.resultados.visualizar) return <UnauthorizedPage />;
	return <DashboardPage user={authSession.user} />;
}
