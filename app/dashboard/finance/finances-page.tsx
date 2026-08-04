"use client";

import type { TAuthUserSession } from "@/lib/authentication/types";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { parseAsStringEnum, useQueryState } from "nuqs";
import { Banknote, CreditCard, DollarSign, FileCheck2, List, TrendingUp } from "lucide-react";
import FinancesStatsView from "./finances-page-stats";
import FinancesAccountingEntriesView from "./finances-page-accounting-entries";
import FinancesTransactionsView from "./finances-page-transactions";
import FinancesAccountsView from "./finances-page-financial-accounts";
import FinancesReconciliationView from "./finances-page-reconciliation";
import FinancesCreditCardInvoicesView from "./finances-page-credit-card-invoices";
import { canCreateFinances, canEditFinances } from "@/lib/permissions/finances";

type FinancesPageProps = {
	user: TAuthUserSession["user"];
	membership: NonNullable<TAuthUserSession["membership"]>;
};

export default function FinancesPage({ membership }: FinancesPageProps) {
	const [viewMode, setViewMode] = useQueryState(
		"view",
		parseAsStringEnum(["stats", "accounting-entries", "financial-transactions", "financial-accounts", "credit-card-invoices", "reconciliation"]),
	);

	return (
		<div className="w-full h-full flex flex-col gap-3">
			<Tabs value={viewMode ?? "stats"} onValueChange={(v) => setViewMode(v as typeof viewMode)}>
				<TabsList variant="page">
					<TabsTrigger value="stats">
						<TrendingUp className="w-4 h-4 min-w-4 min-h-4" />
						Estatísticas
					</TabsTrigger>
					<TabsTrigger value="accounting-entries">
						<List className="w-4 h-4 min-w-4 min-h-4" />
						Lançamentos
					</TabsTrigger>
					<TabsTrigger value="financial-transactions">
						<DollarSign className="w-4 h-4 min-w-4 min-h-4" />
						Movimentações
					</TabsTrigger>
					<TabsTrigger value="financial-accounts">
						<Banknote className="w-4 h-4 min-w-4 min-h-4" />
						Contas Financeiras
					</TabsTrigger>
					<TabsTrigger value="credit-card-invoices">
						<CreditCard className="w-4 h-4 min-w-4 min-h-4" />
						Faturas de Cartão
					</TabsTrigger>
					<TabsTrigger value="reconciliation">
						<FileCheck2 className="w-4 h-4 min-w-4 min-h-4" />
						Conciliação
					</TabsTrigger>
				</TabsList>
				<TabsContent value="stats" className="flex flex-col gap-3">
					<FinancesStatsView />
				</TabsContent>
				<TabsContent value="accounting-entries" className="flex flex-col gap-3">
					<FinancesAccountingEntriesView />
				</TabsContent>
				<TabsContent value="financial-transactions" className="flex flex-col gap-3">
					<FinancesTransactionsView />
				</TabsContent>
				<TabsContent value="financial-accounts" className="flex flex-col gap-3">
					<FinancesAccountsView canCreateAccounts={canCreateFinances(membership.permissoes)} canEditAccounts={canEditFinances(membership.permissoes)} />
				</TabsContent>
				<TabsContent value="credit-card-invoices" className="flex flex-col gap-3">
					<FinancesCreditCardInvoicesView canCreatePayments={canCreateFinances(membership.permissoes)} />
				</TabsContent>
				<TabsContent value="reconciliation" className="flex flex-col gap-3">
					<FinancesReconciliationView />
				</TabsContent>
			</Tabs>
		</div>
	);
}
