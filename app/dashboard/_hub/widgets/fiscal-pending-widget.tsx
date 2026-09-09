"use client";

import { formatToMoney } from "@/lib/formatting";
import { appRoutes } from "@/lib/navigation/routes";
import { useFiscalPending } from "@/lib/queries/fiscal";
import { FileCheck2 } from "lucide-react";
import { HubWidget } from "../hub-widget";
import type { TDashboardWidgetProps } from "../registry";

const LIST_LIMIT = 4;

export function FiscalPendingWidget(_props: TDashboardWidgetProps) {
	const { data, isPending, isError, error } = useFiscalPending({ refetchInterval: 120_000 });
	const resumo = data?.resumo;
	const total = resumo?.total ?? 0;

	return (
		<HubWidget attention={total > 0}>
			<HubWidget.Header
				icon={<FileCheck2 />}
				title="Fiscal"
				hint={total > 0 ? `${total} pendência${total === 1 ? "" : "s"}` : undefined}
				href={appRoutes.fiscal.pending()}
			/>
			{isPending ? (
				<HubWidget.Loading rows={4} />
			) : isError ? (
				<HubWidget.Error error={error} />
			) : !data || !resumo || total === 0 ? (
				<HubWidget.Empty message="Nenhuma pendência fiscal." />
			) : (
				<>
					<HubWidget.List>
						{/* `porAlvo` já vem ordenado por documentos travados e valor: o topo é a causa que mais dói. */}
						{data.porAlvo.slice(0, LIST_LIMIT).map((group) => (
							<HubWidget.Item
								key={group.chave}
								primary={group.alvo.rotulo ?? group.problema.mensagem}
								secondary={group.alvo.rotulo ? group.problema.mensagem : group.problema.acaoSugerida}
								trailing={`${group.documentos.length} doc · ${formatToMoney(group.valorTravado)}`}
								tone="destructive"
							/>
						))}
					</HubWidget.List>
					<HubWidget.Details>
						{resumo.prazosExpirando > 0 ? (
							<HubWidget.Detail label="Prazos de cancelamento expirando" value={resumo.prazosExpirando} tone="destructive" />
						) : null}
						{resumo.produtosSemPerfil > 0 ? <HubWidget.Detail label="Produtos vendidos sem perfil fiscal" value={resumo.produtosSemPerfil} /> : null}
					</HubWidget.Details>
				</>
			)}
		</HubWidget>
	);
}
