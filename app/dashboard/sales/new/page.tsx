import { getCurrentSession } from "@/lib/authentication/session";
import { isOrganizationAutoFiscalCapable } from "@/lib/fiscal/auto-emission-capability";
import { getFiscalSettings } from "@/lib/fiscal/settings";
import { db } from "@/services/drizzle";
import type { TOrganizationConfiguration } from "@/schemas/organizations";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import NewSalePage from "./new-sale-page";
import PlanRestrictionComponent from "@/components/Layouts/PlanRestrictionComponent";

export const metadata: Metadata = {
	title: "Nova Venda - POS",
	description: "Sistema de Ponto de Venda",
};

export default async function NewSale() {
	const sessionUser = await getCurrentSession();
	if (!sessionUser) redirect("/auth/signin");
	if (!sessionUser.membership) redirect("/onboarding");

	// return redirect("/dashboard");
	// DISABLED FOR NOW
	const organizationId = sessionUser.membership.organizacao.id;
	const [organizationCashbackProgram, fiscalSettings] = await Promise.all([
		db.query.cashbackPrograms.findFirst({
			where: (fields, { eq }) => eq(fields.organizacaoId, organizationId),
		}),
		getFiscalSettings(organizationId),
	]);

	if (sessionUser.membership.organizacao.configuracao.recursos.erp.acesso === false) {
		return (
			<PlanRestrictionComponent
				title="Acesso ao ERP"
				message="Este recurso está indisponível para sua organização. Faça um upgrade para desbloquear todo o potencial."
			/>
		);
	}
	return (
		<NewSalePage
			organizationCashbackProgram={organizationCashbackProgram ?? null}
			organizationConfiguration={sessionUser.membership.organizacao.configuracao as TOrganizationConfiguration}
			organizationAutoFiscalEmission={fiscalSettings.fiscalEmissaoAutomatica}
			organizationAutoFiscalCapable={isOrganizationAutoFiscalCapable(fiscalSettings)}
			canEmitFiscal={sessionUser.membership.permissoes.fiscal.emitir}
		/>
	);
}
