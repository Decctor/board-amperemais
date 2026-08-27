"use client";
/*
 * CÓPIA ESTÁTICA — não é o componente de produção.
 * Origem: app/dashboard/growth/campaigns/_module/builder/components/trigger-inline-config/entrada-segmentacao-config.tsx (commit 19d8578).
 *
 * Idêntico ao original: só a origem do estado muda (fixture congelada, updaters no-op).
 * Ao mexer no original, refaça o diff contra este arquivo.
 */

import SegmentationsPanel from "../segmentations-panel";

export default function EntradaSegmentacaoConfig() {
	return (
		<div className="flex w-full flex-col gap-3 rounded-lg border border-border bg-card p-4">
			<p className="text-xs text-muted-foreground">
				Selecione as segmentações que servirão como gatilho. A campanha disparará para cada cliente que entrar em alguma das segmentações marcadas.
			</p>
			<SegmentationsPanel title="SEGMENTAÇÕES MONITORADAS" description="Clientes entrando em qualquer uma destas segmentações ativarão a campanha." />
		</div>
	);
}
