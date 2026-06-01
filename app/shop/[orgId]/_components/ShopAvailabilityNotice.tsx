"use client";

import { AlertCircle, Clock3 } from "lucide-react";
import { useShop } from "./ShopProvider";

function formatNextOpening(value: string | null) {
	if (!value) return null;
	return new Intl.DateTimeFormat("pt-BR", {
		weekday: "long",
		hour: "2-digit",
		minute: "2-digit",
		timeZone: "America/Sao_Paulo",
	}).format(new Date(value));
}

export default function ShopAvailabilityNotice() {
	const { catalog } = useShop();
	const availability = catalog.disponibilidade;
	if (availability.status === "ABERTA") return null;

	const nextOpening = formatNextOpening(availability.proximaAbertura);

	return (
		<div className="mx-3 mt-2 rounded-2xl border border-brand-secondary/30 bg-brand-secondary/10 px-4 py-3 sm:mx-4">
			<div className="flex items-start gap-3">
				<div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-secondary text-brand-secondary-foreground">
					<Clock3 className="size-4" />
				</div>
				<div className="min-w-0">
					<p className="text-sm font-black">Loja fechada no momento</p>
					<p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
						Você pode consultar os produtos, mas os pedidos estão pausados.
						{nextOpening ? ` Voltamos a receber pedidos ${nextOpening}.` : ""}
					</p>
					{availability.mensagem ? (
						<p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-foreground">
							<AlertCircle className="size-3.5 shrink-0" />
							{availability.mensagem}
						</p>
					) : null}
				</div>
			</div>
		</div>
	);
}
