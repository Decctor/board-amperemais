import ErrorComponent from "@/components/Layouts/ErrorComponent";
import { getCurrentSession } from "@/lib/authentication/session";
import { redirect } from "next/navigation";
import ProductPage from "./product-page";

export default async function Product({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	if (!id) return <ErrorComponent msg="ID inválido" />;
	const sessionUser = await getCurrentSession();
	if (!sessionUser) redirect("/auth/signin");
	const userMembership = sessionUser.membership;
	if (!userMembership) redirect("/onboarding");
	return <ProductPage user={sessionUser.user} userMembership={userMembership} id={id} />;
}
