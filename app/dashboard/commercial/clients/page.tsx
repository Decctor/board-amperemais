import UnauthenticatedPage from "@/components/Utils/UnauthenticatedPage";
import { getCurrentSession } from "@/lib/authentication/session";
import { redirect } from "next/navigation";
import ClientsPage from "./clients-page";

export default async function CommercialClients() {
	const sessionUser = await getCurrentSession();
	if (!sessionUser) redirect("/auth/signin");
	return <ClientsPage user={sessionUser.user} />;
}
