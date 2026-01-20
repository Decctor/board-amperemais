import { getCurrentSession } from "@/lib/authentication/session";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import NewSalePage from "./new-sale-page";

export const metadata: Metadata = {
	title: "Nova Venda - POS",
	description: "Sistema de Ponto de Venda",
};

export default async function NewSale() {
	const sessionUser = await getCurrentSession();
	if (!sessionUser) redirect("/auth/signin");
	if (!sessionUser.membership) redirect("/onboarding");
	return <NewSalePage user={sessionUser.user} membership={sessionUser.membership} />;
}
