import { getCurrentSession } from "@/lib/authentication/session";
import { redirect } from "next/navigation";
import CommunicationTemplatesPage from "./_components/communication-templates-page";

export default async function CommunicationPage() {
	const authSession = await getCurrentSession();
	if (!authSession) redirect("/auth/signin");
	if (!authSession.membership) redirect("/onboarding");

	return <CommunicationTemplatesPage organizationName={authSession.membership.organizacao.nome} />;
}
