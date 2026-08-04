"use client";

import SubscriptionStatusBanner from "@/components/Sidebar/SubscriptionStatusBanner";
import { useSalesChannelsStatus } from "@/lib/queries/sales-channels";
import { SalesChannelPill } from "./SalesChannelPill";

/**
 * Trilho de utilidades do header: o lado direito do `AppHeader`, com um dono só.
 *
 * Hoje reúne o status operacional dos canais de venda e o alarme de assinatura; é também onde as
 * quick actions entram quando existirem.
 *
 * Não há esqueleto de carregamento de propósito: quantos canais a organização tem só se sabe com a
 * resposta, e um esqueleto de cardinalidade desconhecida na borda direita incomoda mais que a
 * aparição discreta. Nada reflui — o título é alinhado à esquerda e o trilho não empurra ninguém.
 */
export function HeaderUtilities() {
	const { data: canais } = useSalesChannelsStatus();

	return (
		<div className="flex shrink-0 items-center gap-2">
			{(canais ?? []).map((canal) => (
				<div key={canal.canal} className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-0.5 motion-safe:duration-200">
					<SalesChannelPill canal={canal} />
				</div>
			))}
			<SubscriptionStatusBanner />
		</div>
	);
}
