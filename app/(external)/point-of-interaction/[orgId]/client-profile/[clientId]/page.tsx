import ErrorComponent from "@/components/Layouts/ErrorComponent";
import { db } from "@/services/drizzle";
import { cashbackProgramBalances, cashbackProgramTransactions } from "@/services/drizzle/schema";
import { and, desc, eq, gt } from "drizzle-orm";
import ClientProfileContent from "./client-profile-content";

export default async function ClientProfilePage({ params }: { params: Promise<{ orgId: string; clientId: string }> }) {
	const { orgId, clientId } = await params;

	if (!orgId || !clientId) {
		return <ErrorComponent msg="Oops, parâmetro inválido." />;
	}

	// Fetch organization
	const org = await db.query.organizations.findFirst({
		where: (fields, { eq }) => eq(fields.id, orgId),
		columns: {
			id: true,
			cnpj: true,
			nome: true,
			logoUrl: true,
			telefone: true,
		},
	});

	if (!org) {
		return <ErrorComponent msg="Organização não encontrada" />;
	}

	// Fetch client with balance
	const client = await db.query.clients.findFirst({
		where: (fields, { and, eq }) => and(eq(fields.id, clientId), eq(fields.organizacaoId, orgId)),
		columns: {
			id: true,
			nome: true,
			telefone: true,
			email: true,
		},
	});

	if (!client) {
		return <ErrorComponent msg="Cliente não encontrado" />;
	}

	// Fetch cashback balance
	const balance = await db.query.cashbackProgramBalances.findFirst({
		where: and(eq(cashbackProgramBalances.clienteId, clientId), eq(cashbackProgramBalances.organizacaoId, orgId)),
		columns: {
			saldoValorDisponivel: true,
			saldoValorAcumuladoTotal: true,
			saldoValorResgatadoTotal: true,
		},
	});

	if (!balance) {
		return <ErrorComponent msg="Saldo de cashback não encontrado para este cliente." />;
	}

	// Calculate ranking position (count clients with higher accumulated balance)
	const clientsWithHigherBalance = await db
		.select({ count: eq(cashbackProgramBalances.organizacaoId, orgId) })
		.from(cashbackProgramBalances)
		.where(
			and(eq(cashbackProgramBalances.organizacaoId, orgId), gt(cashbackProgramBalances.saldoValorAcumuladoTotal, balance.saldoValorAcumuladoTotal)),
		);

	const rankingPosition = (clientsWithHigherBalance.length || 0) + 1;

	// Fetch transaction history
	const transactions = await db.query.cashbackProgramTransactions.findMany({
		where: and(eq(cashbackProgramTransactions.clienteId, clientId), eq(cashbackProgramTransactions.organizacaoId, orgId)),
		columns: {
			id: true,
			tipo: true,
			status: true,
			valor: true,
			dataInsercao: true,
			saldoValorPosterior: true,
		},
		orderBy: [desc(cashbackProgramTransactions.dataInsercao)],
		limit: 50,
	});

	return <ClientProfileContent orgId={orgId} client={client} balance={balance} rankingPosition={rankingPosition} transactions={transactions} />;
}
