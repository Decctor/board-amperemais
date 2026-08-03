import { requireDashboardCapability } from "@/lib/access/guards";
import { redirect } from "next/navigation";
import CouponsPage from "./coupons-page";

export default async function Coupons() {
	const access = await requireDashboardCapability("coupons");
	if (access.unauthorized) return access.unauthorized;
	const sessionUser = access.sessionUser;
	if (!sessionUser) redirect("/auth/signin");
	return <CouponsPage user={sessionUser.user} />;
}
