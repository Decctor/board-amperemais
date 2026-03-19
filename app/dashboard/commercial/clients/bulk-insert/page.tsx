import { getCurrentSession } from "@/lib/authentication/session";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import BulkInsertPage from "./bulk-insert-page";

export const metadata: Metadata = {
	title: "Importar clientes",
	description: "Importação de clientes",
};

export default async function BulkInsert() {
	const sessionUser = await getCurrentSession();
	if (!sessionUser) redirect("/auth/signin");
	if (!sessionUser.membership) redirect("/onboarding");

	return <BulkInsertPage user={sessionUser.user} membership={sessionUser.membership} />;
}
