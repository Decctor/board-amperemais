import ErrorComponent from "@/components/Layouts/ErrorComponent";
import { getCurrentSession } from "@/lib/authentication/session";
import { redirect } from "next/navigation";
import ClientPage from "./client-page";

export default async function Client({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	if (!id) return <ErrorComponent msg="ID inválido" />;
	const sessionUser = await getCurrentSession();
	if (!sessionUser) redirect("/auth/signin");
	return <ClientPage user={sessionUser.user} id={id} />;
}
