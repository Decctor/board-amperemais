import UnauthenticatedPage from "@/components/Utils/UnauthenticatedPage";
import UnauthorizedPage from "@/components/Utils/UnauthorizedPage";
import { getCurrentSession } from "@/lib/authentication/session";
import { redirect } from "next/navigation";
import ChatsPage from "./chats-page";

export default async function Chats() {
	const sessionUser = await getCurrentSession();

	if (!sessionUser) redirect("/auth/signin");
	if (!sessionUser.membership?.permissoes.atendimentos.visualizar) return <UnauthorizedPage />;
	if (!sessionUser.membership) redirect("/onboarding");
	return <ChatsPage user={sessionUser.user} membership={sessionUser.membership} />;
}
