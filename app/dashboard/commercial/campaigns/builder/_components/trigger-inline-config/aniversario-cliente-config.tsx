"use client";

export default function AniversarioClienteConfig() {
	return (
		<div className="flex w-full flex-col gap-2 rounded-lg border border-primary/10 bg-card px-4 py-3">
			<p className="text-sm text-muted-foreground">
				Esse gatilho não exige configurações específicas aqui. No próximo passo (Envio) você poderá definir se a mensagem é enviada antes ou depois do aniversário.
			</p>
		</div>
	);
}
