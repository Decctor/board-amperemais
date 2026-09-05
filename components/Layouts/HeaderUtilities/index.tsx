"use client";

import SubscriptionStatusBanner from "@/components/Sidebar/SubscriptionStatusBanner";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { useSalesChannelsStatus } from "@/lib/queries/sales-channels";
import { CommandPalette } from "./CommandPalette";
import { SalesChannelPill } from "./SalesChannelPill";

/**
 * Trilho de utilidades do header: o lado direito do `AppHeader`, com um dono só.
 *
 * Reúne a paleta de comandos (busca global + ações rápidas), o status operacional dos canais de
 * venda e o alarme de assinatura. A paleta só existe com sessão de organização — o painel de
 * administração da plataforma usa o mesmo header sem ela.
 *
 * Não há esqueleto de carregamento de propósito: quantos canais a organização tem só se sabe com a
 * resposta, e um esqueleto de cardinalidade desconhecida na borda direita incomoda mais que a
 * aparição discreta. Nada reflui — o título é alinhado à esquerda e o trilho não empurra ninguém.
 */
export type THeaderSession = {
	user: TAuthUserSession["user"];
	membership: NonNullable<TAuthUserSession["membership"]>;
};

export function HeaderUtilities({ session }: { session?: THeaderSession }) {
	const { data: canais } = useSalesChannelsStatus();

	return (
		<div className="flex shrink-0 items-center gap-2">
			{session ? <CommandPalette user={session.user} membership={session.membership} /> : null}
			{(canais ?? []).map((canal) => (
				<div key={canal.canal} className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-0.5 motion-safe:duration-200">
					<SalesChannelPill canal={canal} />
				</div>
			))}
			<SubscriptionStatusBanner />
		</div>
	);
}
