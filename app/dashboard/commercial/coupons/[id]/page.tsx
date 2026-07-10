import ErrorComponent from "@/components/Layouts/ErrorComponent";
import { getCurrentSession } from "@/lib/authentication/session";
import { redirect } from "next/navigation";
import CouponByIdPage from "./coupon-by-id-page";

export default async function CouponPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	if (!id) return <ErrorComponent msg="ID inválido" />;
	const sessionUser = await getCurrentSession();
	if (!sessionUser) redirect("/auth/signin");
	if (!sessionUser.membership?.organizacao) redirect("/onboarding");

	return <CouponByIdPage couponId={id} />;
}
