import { getCurrentSession } from "@/lib/authentication/session";
import { redirect } from "next/navigation";
import ProductsPage from "./products-page";

export default async function Products() {
	const sessionUser = await getCurrentSession();
	if (!sessionUser) redirect("/auth/signin");
	return <ProductsPage user={sessionUser.user} />;
}
