import ErrorComponent from "@/components/Layouts/ErrorComponent";
import { getCurrentSession } from "@/lib/authentication/session";
import { redirect } from "next/navigation";
import SaleByIdPage from "./sale-by-id-page";

export default async function SalePage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	if (!id) return <ErrorComponent msg="ID inválido" />;
	const sessionUser = await getCurrentSession();
	if (!sessionUser) redirect("/auth/signin");
	if (!sessionUser.membership?.organizacao) redirect("/onboarding");

	const orgHasERPAccess = sessionUser.membership.organizacao.configuracao.recursos.erp.acesso;
	const userHasFiscalViewPermission = sessionUser.membership.permissoes.fiscal.visualizar;
	const userHasFiscalConfigurePermission = sessionUser.membership.permissoes.fiscal.configurar;
	const userHasFiscalEmitPermission = sessionUser.membership.permissoes.fiscal.emitir;
	const userHasFiscalCancelPermission = sessionUser.membership.permissoes.fiscal.cancelar;
	const userCanDeleteSales = sessionUser.membership.permissoes.vendas.excluir;
	return (
		<SaleByIdPage
			saleId={id}
			orgHasERPAccess={orgHasERPAccess}
			userCanDeleteSales={userCanDeleteSales}
			userFiscalPermissions={{
				view: userHasFiscalViewPermission,
				configure: userHasFiscalConfigurePermission,
				emit: userHasFiscalEmitPermission,
				cancel: userHasFiscalCancelPermission,
			}}
		/>
	);
}
