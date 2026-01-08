import { getCurrentSession } from "@/lib/authentication/session";
import { redirect } from "next/navigation";
import SalesPage from "./sales-page";

export default async function Sales() {
	const sessionUser = await getCurrentSession();
	if (!sessionUser) redirect("/auth/signin");
	return <SalesPage user={sessionUser.user} />;
}
