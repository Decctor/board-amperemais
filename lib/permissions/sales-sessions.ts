import type { TOrganizationMemberPermissions } from "@/schemas/organizations";

/**
 * Conferir uma sessão fechada é um ato de gestão (revisar/aprovar a diferença de caixa), não de
 * operação. Amarra à edição de vendas: quem pode alterar vendas confirmadas pode avalizar o caixa
 * que as recebeu. Página e rota leem daqui para não divergirem.
 */
export function canReviewSalesSession(permissions: TOrganizationMemberPermissions): boolean {
	return permissions.vendas.editar;
}
