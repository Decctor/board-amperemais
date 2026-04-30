"use client";

import SegmentationsPanel from "../segmentations-panel";

export default function EntradaSegmentacaoConfig() {
	return (
		<div className="flex w-full flex-col gap-3 rounded-lg border border-primary/10 bg-card p-4">
			<p className="text-xs text-muted-foreground">
				Selecione as segmentações que servirão como gatilho. A campanha disparará para cada cliente que entrar em alguma das
				segmentações marcadas.
			</p>
			<SegmentationsPanel
				title="SEGMENTAÇÕES MONITORADAS"
				description="Clientes entrando em qualquer uma destas segmentações ativarão a campanha."
			/>
		</div>
	);
}
