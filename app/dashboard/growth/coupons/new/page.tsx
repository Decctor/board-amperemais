import CouponBuilderShell from "@/app/dashboard/growth/coupons/_module/builder/components/builder-shell";
import { getCurrentSession } from "@/lib/authentication/session";
import { redirect } from "next/navigation";

export default async function CouponBuilderPage() {
	const sessionUser = await getCurrentSession();
	if (!sessionUser) redirect("/auth/signin");
	if (!sessionUser.membership) redirect("/onboarding");

	return <CouponBuilderShell />;
}
