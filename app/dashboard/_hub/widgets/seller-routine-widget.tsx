"use client";

import { formatToMoney } from "@/lib/formatting";
import { appRoutes } from "@/lib/navigation/routes";
import { useClientPortfolioStats } from "@/lib/queries/client-portfolios";
import { UserRound } from "lucide-react";
import { HubWidget } from "../hub-widget";
import type { TDashboardWidgetProps } from "../registry";

/** Rotina do vendedor vinculado ao membro: vendas de hoje contra a meta do dia e abordagens registradas. */
export function SellerRoutineWidget({ sellerId }: TDashboardWidgetProps) {
	const { data, isPending, isError, error } = useClientPortfolioStats({ vendedorId: sellerId });
	const vendasHoje = data?.vendasHoje;
	const metaDia = data?.metaDia ?? 0;
	const progresso = metaDia > 0 && vendasHoje ? Math.round((vendasHoje.valor / metaDia) * 100) : null;

	return (
		<HubWidget href={appRoutes.customers.portfolios()}>
			<HubWidget.Header icon={<UserRound />} title="Minha rotina" hint="Hoje" />
			{isPending ? (
				<HubWidget.Loading />
			) : isError ? (
				<HubWidget.Error error={error} />
			) : !vendasHoje ? (
				<HubWidget.Empty message="Sem dados da sua carteira ainda." />
			) : (
				<>
					<HubWidget.Value label={progresso !== null ? `${progresso}% da meta do dia (${formatToMoney(metaDia)})` : "vendidos hoje"}>
						{formatToMoney(vendasHoje.valor)}
					</HubWidget.Value>
					<HubWidget.Details>
						<HubWidget.Detail label="Vendas" value={vendasHoje.qtde} />
						<HubWidget.Detail label="Abordagens registradas" value={data.abordagensHoje} tone={data.abordagensHoje > 0 ? "success" : "default"} />
					</HubWidget.Details>
				</>
			)}
		</HubWidget>
	);
}
