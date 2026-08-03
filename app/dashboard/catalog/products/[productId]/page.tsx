import ErrorComponent from "@/components/Layouts/ErrorComponent";
import { requireDashboardCapability } from "@/lib/access/guards";
import { redirect } from "next/navigation";
import ProductPage from "./product-page";

export default async function Product({ params }: { params: Promise<{ productId: string }> }) {
	const { productId } = await params;
	if (!productId) return <ErrorComponent msg="ID inválido" />;
	const access = await requireDashboardCapability("products");
	if (access.unauthorized) return access.unauthorized;
	const sessionUser = access.sessionUser;
	if (!sessionUser) redirect("/auth/signin");
	const userMembership = sessionUser.membership;
	if (!userMembership) redirect("/onboarding");
	return <ProductPage user={sessionUser.user} userMembership={userMembership} id={productId} />;
}
