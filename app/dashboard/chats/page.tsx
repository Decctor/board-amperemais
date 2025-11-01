import UnauthenticatedPage from "@/components/Utils/UnauthenticatedPage";
import { getUserSession } from "@/lib/auth/app-session";
import ChatsPage from "./chats-page";

export default async function Chats() {
	const user = await getUserSession();
	if (!user) return <UnauthenticatedPage />;
	return <ChatsPage user={user} />;
}
