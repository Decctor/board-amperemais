import PlanRestrictionComponent from "@/components/Layouts/PlanRestrictionComponent";
import { getCurrentSession } from "@/lib/authentication/session";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import CashSessionsPage from "./cash-sessions-page";

export const metadata: Metadata = {
	title: "Caixa",
	description: "Sessoes de venda e fechamento de caixa",
};

export default async function CashSessions() {
	const sessionUser = await getCurrentSession();
	if (!sessionUser) redirect("/auth/signin");
	if (!sessionUser.membership) redirect("/onboarding");

	const sessoesVenda = sessionUser.membership.organizacao.configuracao.preferencias.sessoesVenda;
	if (!sessoesVenda?.habilitado) {
		return (
			<PlanRestrictionComponent
				title="Sessoes de venda"
				message="O controle de caixa nao esta habilitado para sua organizacao. Ative-o nas configuracoes para abrir e fechar caixas."
			/>
		);
	}

	return (
		<CashSessionsPage
			sessoesConfig={{ exigirFundoTroco: !!sessoesVenda.exigirFundoTroco, conferenciaCega: !!sessoesVenda.conferenciaCega }}
		/>
	);
}
