import ClientsEmptyState from "@/components/Clients/ClientsEmptyState";
import { getCurrentSession } from "@/lib/authentication/session";
import { db } from "@/services/drizzle";
import { redirect } from "next/navigation";
import ClientsPage from "./clients-page";

export default async function CommercialClients() {
	const sessionUser = await getCurrentSession();
	if (!sessionUser) redirect("/auth/signin");

	const orgId = sessionUser.membership?.organizacao.id;
	if (!orgId) redirect("/onboarding");

	// Check if the organization has any clients
	const firstClient = await db.query.clients.findFirst({
		where: (fields, { eq }) => eq(fields.organizacaoId, orgId),
		columns: { id: true },
	});
	const hasClients = !!firstClient;

	if (!hasClients) {
		return <ClientsEmptyState />;
	}

	return <ClientsPage user={sessionUser.user} />;
}
