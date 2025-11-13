import { getCurrentSession } from "@/lib/authentication/session";
import { redirect } from "next/navigation";
import SellersPage from "./sellers-page";

export default async function TeamSellers() {
	const sessionUser = await getCurrentSession();
	if (!sessionUser) redirect("/auth/signin");
	return <SellersPage user={sessionUser.user} />;
}
