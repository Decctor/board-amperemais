import { getCurrentSession } from "@/lib/authentication/session";
import { redirect } from "next/navigation";
import RoutinePage from "./routine-page";

export default async function Routine() {
	const sessionUser = await getCurrentSession();
	if (!sessionUser) redirect("/auth/signin");
	if (!sessionUser.membership) redirect("/dashboard");

	return (
		<RoutinePage
			boundSellerId={sessionUser.membership.usuarioVendedorId ?? null}
			canPickSeller={sessionUser.membership.permissoes.resultados.visualizar}
		/>
	);
}
