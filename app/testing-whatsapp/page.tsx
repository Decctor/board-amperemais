import UnauthorizedPage from "@/components/Utils/UnauthorizedPage";
import { getCurrentSession } from "@/lib/authentication/session";
import { redirect } from "next/navigation";
import TestingWhatsappPage from "./testing-whatsapp-page";

export default async function TestingWhatsapp() {
	const authSession = await getCurrentSession();
	if (!authSession) redirect("/auth/signin");
	if (!authSession.user.permissoes.resultados.visualizar) return <UnauthorizedPage />;
	return <TestingWhatsappPage user={authSession.user} />;
}
