import ErrorComponent from "@/components/Layouts/ErrorComponent";
import UnauthenticatedPage from "@/components/Utils/UnauthenticatedPage";
import { getUserSession } from "@/lib/auth/app-session";
import SellerPage from "./seller-page";

export default async function Seller({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	if (!id) return <ErrorComponent msg="ID inválido" />;
	const user = await getUserSession();
	if (!user) return <UnauthenticatedPage />;
	return <SellerPage user={user} id={id} />;
}
