import { getCurrentSession } from "@/lib/authentication/session";
import { redirect } from "next/navigation";
import ClientPortfoliosPage from "./client-portfolios-page";

export default async function ClientPortfolios() {
	const sessionUser = await getCurrentSession();
	if (!sessionUser) redirect("/auth/signin");
	if (!sessionUser.membership) redirect("/dashboard");
	if (!sessionUser.membership.organizacao.configuracao.preferencias.carteirasClientes?.habilitado) redirect("/dashboard");

	return (
		<ClientPortfoliosPage
			boundSellerId={sessionUser.membership.usuarioVendedorId ?? null}
			canPickSeller={sessionUser.membership.permissoes.resultados.visualizar}
		/>
	);
}
