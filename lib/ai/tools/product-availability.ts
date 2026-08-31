import type { TProductAvailability, TProductAvailabilityStatus } from "@/lib/products/availability";
import type { TAiAgentStockConfig } from "@/schemas/ai-agents";

/**
 * Camada de política: recorta a disponibilidade resolvida (`lib/products/availability.ts`) para o
 * que a configuração da organização permite o agente dizer.
 *
 * Segue a camada 3 do padrão dos preços: campo **omitido**, nunca nulo. Sob `OCULTO` o objeto sai
 * vazio e não há o que alucinar; sob `DISPONIBILIDADE` sai o estado sem número; só `QUANTIDADE`
 * expõe o saldo, e ainda assim apenas quando ele é real.
 */
export function formatAvailabilityForClient(
	availability: TProductAvailability,
	visibilidade: TAiAgentStockConfig["visibilidade"],
): { disponibilidade?: TProductAvailabilityStatus; quantidade?: number } {
	if (visibilidade === "OCULTO") return {};
	if (visibilidade === "DISPONIBILIDADE") return { disponibilidade: availability.disponibilidade };
	return {
		disponibilidade: availability.disponibilidade,
		...(availability.quantidade !== null ? { quantidade: availability.quantidade } : {}),
	};
}
