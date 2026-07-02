import { getCurrentSession } from "@/lib/authentication/session";
import { redirect } from "next/navigation";
import CouponsPage from "./coupons-page";

export default async function Coupons() {
	const sessionUser = await getCurrentSession();
	if (!sessionUser) redirect("/auth/signin");
	return <CouponsPage user={sessionUser.user} />;
}
