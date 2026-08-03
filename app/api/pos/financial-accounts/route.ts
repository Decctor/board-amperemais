import { appApiHandler } from "@/lib/app-api";
import { requireERPSession } from "@/lib/authentication/erp-session";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { getOrganizationPaymentMethodsConfig, getSelectableFinancialAccounts } from "@/lib/payments";
import type { TPaymentMethodEnum } from "@/schemas/enums";
import { db } from "@/services/drizzle";
import createHttpError from "http-errors";
import { NextResponse } from "next/server";

/**
 * Contas financeiras ofertáveis nas telas de operação (fechamento de conta, expedição).
 *
 * Existe separado de /api/finances/financial-accounts porque aquele exige permissão do módulo
 * financeiro, que operadores de caixa normalmente não têm. Aqui o recorte é mínimo — id e nome das
 * contas ativas — e só responde algo quando algum método de pagamento permite a escolha.
 */
async function getPOSFinancialAccounts({ session }: { session: TAuthUserSession }) {
	const orgId = session.membership!.organizacao.id;

	const organization = await db.query.organizations.findFirst({
		where: (fields, { eq }) => eq(fields.id, orgId),
		columns: { id: true, configuracao: true },
	});
	if (!organization) throw new createHttpError.NotFound("Organização não encontrada.");

	const methodsConfig = getOrganizationPaymentMethodsConfig(organization.configuracao);
	const metodosComContaEditavel = Object.entries(methodsConfig)
		.filter(([, methodConfig]) => methodConfig?.contaFinanceiraEditavel ?? false)
		.map(([metodo]) => metodo as TPaymentMethodEnum);

	const contas = await getSelectableFinancialAccounts({ organizationId: orgId, configuracao: organization.configuracao });

	return {
		data: { contas, metodosComContaEditavel },
		message: "Contas financeiras encontradas com sucesso.",
	};
}
export type TGetPOSFinancialAccountsOutput = Awaited<ReturnType<typeof getPOSFinancialAccounts>>;

async function getPOSFinancialAccountsRoute() {
	const session = requireERPSession(await getCurrentSessionUncached());
	const result = await getPOSFinancialAccounts({ session });
	return NextResponse.json(result);
}

export const GET = appApiHandler({ GET: getPOSFinancialAccountsRoute });
