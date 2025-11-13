import ErrorComponent from "@/components/Layouts/ErrorComponent";
import UnauthenticatedPage from "@/components/Utils/UnauthenticatedPage";
import { getCurrentSession } from "@/lib/authentication/session";
import { redirect } from "next/navigation";
import SellerPage from "./seller-page";

export default async function Seller({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	if (!id) return <ErrorComponent msg="ID inválido" />;
	const sessionUser = await getCurrentSession();
	if (!sessionUser) redirect("/auth/signin");
	return <SellerPage user={sessionUser.user} id={id} />;
}
