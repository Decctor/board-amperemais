import UnauthenticatedPage from "@/components/Utils/UnauthenticatedPage";
import { getUserSession } from "@/lib/auth/app-session";
import ClientsPage from "./clients-page";

export default async function CommercialClients() {
	const user = await getUserSession();
	if (!user) return <UnauthenticatedPage />;
	return <ClientsPage user={user} />;
}
