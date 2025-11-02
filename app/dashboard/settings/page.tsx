import ErrorComponent from "@/components/Layouts/ErrorComponent";
import UnauthenticatedPage from "@/components/Utils/UnauthenticatedPage";
import { getUserSession } from "@/lib/auth/app-session";
import SettingsPage from "./settings-page";

export default async function Settings() {
	const user = await getUserSession();
	if (!user) return <UnauthenticatedPage />;
	if (user.visualizacao !== "GERAL") return <ErrorComponent msg="Oops, você não possui permissão para acessar essa área." />;
	return <SettingsPage user={user} />;
}
