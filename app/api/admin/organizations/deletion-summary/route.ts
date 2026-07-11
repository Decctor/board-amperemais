import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { organizationHasBlockingSubscription } from "@/lib/organizations/deletion";
import { db } from "@/services/drizzle";
import {
	campaigns,
	chatMessages,
	chats,
	clients,
	coupons,
	financialTransactions,
	fiscalOutboundDocuments,
	goals,
	organizationMembers,
	products,
	purchases,
	sales,
	sellers,
	whatsappConnections,
} from "@/services/drizzle/schema";
import { and, count, eq, isNotNull, ne, notExists } from "drizzle-orm";
import { alias, type AnyPgColumn, type PgTable } from "drizzle-orm/pg-core";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const GetOrganizationDeletionSummaryInputSchema = z.object({
	id: z.string({
		required_error: "ID da organização não informado.",
		invalid_type_error: "Tipo inválido para ID da organização.",
	}),
});
export type TGetOrganizationDeletionSummaryInput = z.infer<typeof GetOrganizationDeletionSummaryInputSchema>;

async function getOrganizationDeletionSummary({ input }: { input: TGetOrganizationDeletionSummaryInput }) {
	const organization = await db.query.organizations.findFirst({
		where: (fields, { eq }) => eq(fields.id, input.id),
		columns: {
			id: true,
			nome: true,
			stripeSubscriptionStatus: true,
			stripeSubscriptionId: true,
			assinaturaPlano: true,
		},
	});
	if (!organization) throw new createHttpError.NotFound("Organização não encontrada.");

	const countByOrganization = async (table: PgTable, column: AnyPgColumn) => {
		const result = await db.select({ value: count() }).from(table).where(eq(column, input.id));
		return result[0]?.value || 0;
	};

	// Usuários que são membros apenas desta organização (perderão o acesso, mas não são excluídos)
	const otherMemberships = alias(organizationMembers, "other_memberships");
	const orphanUsersQuery = db
		.select({ value: count() })
		.from(organizationMembers)
		.where(
			and(
				eq(organizationMembers.organizacaoId, input.id),
				isNotNull(organizationMembers.usuarioId),
				notExists(
					db
						.select({ id: otherMemberships.id })
						.from(otherMemberships)
						.where(and(eq(otherMemberships.usuarioId, organizationMembers.usuarioId), ne(otherMemberships.organizacaoId, input.id))),
				),
			),
		);

	// Conexões WhatsApp via gateway interno (serão desconectadas na exclusão)
	const gatewayConnectionsQuery = db
		.select({ value: count() })
		.from(whatsappConnections)
		.where(and(eq(whatsappConnections.organizacaoId, input.id), eq(whatsappConnections.tipoConexao, "INTERNAL_GATEWAY")));

	const [
		membros,
		clientes,
		vendas,
		produtos,
		campanhas,
		cupons,
		conversas,
		mensagens,
		vendedores,
		metas,
		compras,
		documentosFiscais,
		transacoesFinanceiras,
		conexoesWhatsapp,
		orphanUsersResult,
		gatewayConnectionsResult,
	] = await Promise.all([
		countByOrganization(organizationMembers, organizationMembers.organizacaoId),
		countByOrganization(clients, clients.organizacaoId),
		countByOrganization(sales, sales.organizacaoId),
		countByOrganization(products, products.organizacaoId),
		countByOrganization(campaigns, campaigns.organizacaoId),
		countByOrganization(coupons, coupons.organizacaoId),
		countByOrganization(chats, chats.organizacaoId),
		countByOrganization(chatMessages, chatMessages.organizacaoId),
		countByOrganization(sellers, sellers.organizacaoId),
		countByOrganization(goals, goals.organizacaoId),
		countByOrganization(purchases, purchases.organizacaoId),
		countByOrganization(fiscalOutboundDocuments, fiscalOutboundDocuments.organizacaoId),
		countByOrganization(financialTransactions, financialTransactions.organizacaoId),
		countByOrganization(whatsappConnections, whatsappConnections.organizacaoId),
		orphanUsersQuery,
		gatewayConnectionsQuery,
	]);

	return {
		data: {
			organization,
			counts: {
				membros,
				clientes,
				vendas,
				produtos,
				campanhas,
				cupons,
				conversas,
				mensagens,
				vendedores,
				metas,
				compras,
				documentosFiscais,
				transacoesFinanceiras,
				conexoesWhatsapp,
			},
			bloqueios: {
				assinaturaAtiva: organizationHasBlockingSubscription(organization.stripeSubscriptionStatus),
			},
			avisos: {
				usuariosSemOutraOrganizacao: orphanUsersResult[0]?.value || 0,
				conexoesWhatsappGateway: gatewayConnectionsResult[0]?.value || 0,
			},
		},
		message: "Resumo de exclusão obtido com sucesso.",
	};
}
export type TGetOrganizationDeletionSummaryOutput = Awaited<ReturnType<typeof getOrganizationDeletionSummary>>;

async function getOrganizationDeletionSummaryRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	if (!session.user.admin) throw new createHttpError.Forbidden("Acesso restrito a administradores.");

	const searchParams = request.nextUrl.searchParams;
	const input = GetOrganizationDeletionSummaryInputSchema.parse({
		id: searchParams.get("id"),
	});
	const result = await getOrganizationDeletionSummary({ input });

	return NextResponse.json(result);
}

export const GET = appApiHandler({
	GET: getOrganizationDeletionSummaryRoute,
});
