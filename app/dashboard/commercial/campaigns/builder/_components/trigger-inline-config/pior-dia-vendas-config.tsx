"use client";

import { useBuilderCampaign } from "../builder-provider";
import PiorDiaVendasPreview from "./pior-dia-vendas-preview";

export default function PiorDiaVendasConfig() {
	const { state } = useBuilderCampaign();
	return (
		<div className="flex w-full flex-col gap-3 rounded-lg border border-border bg-card p-4">
			<p className="text-xs text-muted-foreground">
				A campanha será disparada automaticamente no dia da semana com menor volume de vendas, calculado pelas últimas 8 semanas de histórico. Você poderá
				ajustar o atraso e o bloco de horário na próxima etapa.
			</p>
			<PiorDiaVendasPreview campaign={state.campaign} />
		</div>
	);
}
