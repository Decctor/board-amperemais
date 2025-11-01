import { getUserSession } from "@/lib/auth/app-session";

export default async function CommercialCampaignsPage() {
	const user = await getUserSession();
	return <>EM DESENVOLVIMENTO</>;
}
