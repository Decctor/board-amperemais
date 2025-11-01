import ErrorComponent from "@/components/Layouts/ErrorComponent";
import UnauthenticatedPage from "@/components/Utils/UnauthenticatedPage";
import { getUserSession } from "@/lib/auth/app-session";
import ClientPage from "./client-page";

export default async function Client({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	if (!id) return <ErrorComponent msg="ID inválido" />;
	const user = await getUserSession();
	if (!user) return <UnauthenticatedPage />;
	return <ClientPage user={user} id={id} />;
}
