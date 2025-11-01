import SalesStatsMain from "@/components/SalesStats/SalesStatsMain";
import { getUserSession } from "@/lib/auth/app-session";

export default async function Main() {
	const user = await getUserSession();

	console.log("SESSION IN BACKEND", user);
	return <SalesStatsMain user={user} />;
}
