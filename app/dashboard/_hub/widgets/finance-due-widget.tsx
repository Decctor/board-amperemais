"use client";

import { formatToMoney } from "@/lib/formatting";
import { appRoutes } from "@/lib/navigation/routes";
import { useFinancesOverallStats, useFinancesTransactions } from "@/lib/queries/finances";
import { Wallet } from "lucide-react";
import { useMemo } from "react";
import { HubWidget } from "../hub-widget";
import type { TDashboardWidgetProps } from "../registry";
import { resolveTodayRange, useDayKey } from "../use-day-key";

const LIST_LIMIT = 5;

export function FinanceDueWidget(_props: TDashboardWidgetProps) {
	const dayKey = useDayKey();
	const today = useMemo(() => {
		const { after, before } = resolveTodayRange(dayKey);
		return { periodAfter: after.toDate(), periodBefore: before.toDate() };
	}, [dayKey]);
	// "pendente" exclui o que já passou da hora atual, então os dois status juntos cobrem o dia inteiro.
	const dueToday = useFinancesTransactions({ initialFilters: { ...today, statuses: ["pendente", "em-atraso"] } });
	const overall = useFinancesOverallStats({ initialParams: {} });

	const overdue = overall.data?.totalPendingTransactionsOverdue;
	const overdueTotal = (overdue?.inflow ?? 0) + (overdue?.outflow ?? 0);
	const transactions = dueToday.data?.transactions ?? [];
	const matched = dueToday.data?.transactionsMatched ?? 0;
	const isPending = dueToday.isPending || overall.isPending;
	const isError = dueToday.isError || overall.isError;

	return (
		<HubWidget attention={overdueTotal > 0}>
			<HubWidget.Header
				icon={<Wallet />}
				title="Financeiro"
				hint={matched > 0 ? `${matched} vence${matched === 1 ? "" : "m"} hoje` : "Vencimentos"}
				href={appRoutes.finance.transactions()}
			/>
			{isPending ? (
				<HubWidget.Loading rows={4} />
			) : isError ? (
				<HubWidget.Error error={dueToday.error ?? overall.error} />
			) : transactions.length === 0 && overdueTotal === 0 ? (
				<HubWidget.Empty message="Nada vence hoje e nada está atrasado." />
			) : (
				<>
					<HubWidget.List>
						{transactions.slice(0, LIST_LIMIT).map((transaction) => (
							<HubWidget.Item
								key={transaction.id}
								href={transaction.lancamentoContabilId ? appRoutes.finance.entry(transaction.lancamentoContabilId) : undefined}
								primary={transaction.titulo}
								secondary={[
									transaction.contaFinanceira?.nome,
									transaction.parcela && transaction.totalParcelas ? `parcela ${transaction.parcela}/${transaction.totalParcelas}` : null,
								]
									.filter(Boolean)
									.join(" · ")}
								trailing={`${transaction.tipo === "ENTRADA" ? "+" : "−"} ${formatToMoney(transaction.valor)}`}
								tone={transaction.tipo === "ENTRADA" ? "success" : "default"}
							/>
						))}
					</HubWidget.List>
					<HubWidget.Details>
						{overdueTotal > 0 ? (
							<HubWidget.Detail
								label="Em atraso, a receber e a pagar"
								value={`${formatToMoney(overdue?.inflow ?? 0)} · ${formatToMoney(overdue?.outflow ?? 0)}`}
								tone="destructive"
							/>
						) : null}
					</HubWidget.Details>
				</>
			)}
		</HubWidget>
	);
}
