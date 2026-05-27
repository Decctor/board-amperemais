"use client";

import type { TAuthUserSession } from "@/lib/authentication/types";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { parseAsStringEnum, useQueryState } from "nuqs";
import { Banknote, DollarSign, List, TrendingUp } from "lucide-react";
import FinancesStatsView from "./finances-page-stats";
import FinancesAccountingEntriesView from "./finances-page-accounting-entries";
import FinancesTransactionsView from "./finances-page-transactions";
import FinancesAccountsView from "./finances-page-financial-accounts";

type FinancesPageProps = {
	user: TAuthUserSession["user"];
	membership: NonNullable<TAuthUserSession["membership"]>;
};

export default function FinancesPage(_props: FinancesPageProps) {
	const [viewMode, setViewMode] = useQueryState(
		"view",
		parseAsStringEnum(["stats", "accounting-entries", "financial-transactions", "financial-accounts"]),
	);

	return (
		<div className="w-full h-full flex flex-col gap-3">
			<Tabs value={viewMode ?? "stats"} onValueChange={(v) => setViewMode(v as typeof viewMode)}>
				<TabsList className="flex items-center gap-1.5 w-fit h-fit self-start rounded-lg px-2 py-1">
					<TabsTrigger value="stats" className="flex items-center gap-1.5 px-2 py-2 rounded-lg">
						<TrendingUp className="w-4 h-4 min-w-4 min-h-4" />
						Estatísticas
					</TabsTrigger>
					<TabsTrigger value="accounting-entries" className="flex items-center gap-1.5 px-2 py-2 rounded-lg">
						<List className="w-4 h-4 min-w-4 min-h-4" />
						Lançamentos
					</TabsTrigger>
					<TabsTrigger value="financial-transactions" className="flex items-center gap-1.5 px-2 py-2 rounded-lg">
						<DollarSign className="w-4 h-4 min-w-4 min-h-4" />
						Movimentações
					</TabsTrigger>
					<TabsTrigger value="financial-accounts" className="flex items-center gap-1.5 px-2 py-2 rounded-lg">
						<Banknote className="w-4 h-4 min-w-4 min-h-4" />
						Contas Financeiras
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
					<FinancesAccountsView />
				</TabsContent>
			</Tabs>
		</div>
	);
}
