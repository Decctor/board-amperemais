"use client";

import { formatToMoney } from "@/lib/formatting";
import { appRoutes } from "@/lib/navigation/routes";
import { useFiscalPending } from "@/lib/queries/fiscal";
import { FileCheck2 } from "lucide-react";
import { HubWidget } from "../hub-widget";
import type { TDashboardWidgetProps } from "../registry";

export function FiscalPendingWidget(_props: TDashboardWidgetProps) {
	const { data, isPending, isError, error } = useFiscalPending({ refetchInterval: 120_000 });
	const resumo = data?.resumo;
	const total = resumo?.total ?? 0;

	return (
		<HubWidget href={appRoutes.fiscal.pending()} attention={total > 0}>
			<HubWidget.Header icon={<FileCheck2 />} title="Fiscal" hint="Pendências" />
			{isPending ? (
				<HubWidget.Loading />
			) : isError ? (
				<HubWidget.Error error={error} />
			) : !resumo || total === 0 ? (
				<HubWidget.Empty message="Nenhuma pendência fiscal." />
			) : (
				<>
					<HubWidget.Value label={total === 1 ? "item exige ação" : "itens exigem ação"}>{total}</HubWidget.Value>
					<HubWidget.Details>
						{resumo.documentos > 0 ? (
							<HubWidget.Detail label="Documentos travados" value={`${resumo.documentos} · ${formatToMoney(resumo.valorTravado)}`} tone="destructive" />
						) : null}
						{resumo.prazosExpirando > 0 ? <HubWidget.Detail label="Prazos expirando" value={resumo.prazosExpirando} tone="destructive" /> : null}
						{resumo.produtosSemPerfil > 0 ? <HubWidget.Detail label="Produtos sem perfil fiscal" value={resumo.produtosSemPerfil} /> : null}
					</HubWidget.Details>
				</>
			)}
		</HubWidget>
	);
}
