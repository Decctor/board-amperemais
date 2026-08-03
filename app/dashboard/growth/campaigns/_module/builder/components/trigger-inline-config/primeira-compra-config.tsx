"use client";

export default function PrimeiraCompraConfig() {
	return (
		<div className="flex w-full flex-col gap-2 rounded-lg border border-border bg-card px-4 py-3">
			<p className="text-sm text-muted-foreground">
				Esse gatilho não exige configurações adicionais. A campanha será disparada automaticamente quando o cliente realizar a primeira compra.
			</p>
		</div>
	);
}
