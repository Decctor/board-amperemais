import UnauthenticatedPage from "@/components/Utils/UnauthenticatedPage";
import UnauthorizedPage from "@/components/Utils/UnauthorizedPage";
import { getCurrentSession } from "@/lib/authentication/session";
import { redirect } from "next/navigation";
import ChatsPage from "./chats-page";

export default async function Chats() {
	const sessionUser = await getCurrentSession();

	if (!sessionUser) redirect("/auth/signin");
	if (!sessionUser.user.permissoes.atendimentos.visualizar) return <UnauthorizedPage />;
	return <ChatsPage user={sessionUser.user} />;
}
