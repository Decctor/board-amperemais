"use client";
/*
 * CÓPIA ESTÁTICA — não é o componente de produção.
 * Origem: app/dashboard/growth/campaigns/_module/builder/components/trigger-inline-config/aniversario-cliente-config.tsx (commit 19d8578).
 *
 * Idêntico ao original: só a origem do estado muda (fixture congelada, updaters no-op).
 * Ao mexer no original, refaça o diff contra este arquivo.
 */

export default function AniversarioClienteConfig() {
	return (
		<div className="flex w-full flex-col gap-2 rounded-lg border border-border bg-card px-4 py-3">
			<p className="text-sm text-muted-foreground">
				Esse gatilho não exige configurações específicas aqui. No próximo passo (Envio) você poderá definir se a mensagem é enviada antes ou depois do
				aniversário.
			</p>
		</div>
	);
}
