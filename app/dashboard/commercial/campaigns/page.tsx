import { getCurrentSession } from "@/lib/authentication/session";
import { redirect } from "next/navigation";

export default async function CommercialCampaignsPage() {
	const sessionUser = await getCurrentSession();
	if (!sessionUser) redirect("/auth/signin");
	return <>EM DESENVOLVIMENTO</>;
}
