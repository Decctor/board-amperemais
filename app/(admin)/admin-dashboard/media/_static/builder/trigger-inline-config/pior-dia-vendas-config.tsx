"use client";
/*
 * CÓPIA ESTÁTICA — não é o componente de produção.
 * Origem: app/dashboard/growth/campaigns/_module/builder/components/trigger-inline-config/pior-dia-vendas-config.tsx (commit 19d8578).
 *
 * Idêntico ao original: só a origem do estado muda (fixture congelada, updaters no-op).
 * Ao mexer no original, refaça o diff contra este arquivo.
 */

import { STATIC_BUILDER_CAMPAIGN } from "../../../_fixtures/campaign-builder";
import PiorDiaVendasPreview from "./pior-dia-vendas-preview";

export default function PiorDiaVendasConfig() {
	const { state } = STATIC_BUILDER_CAMPAIGN;
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
