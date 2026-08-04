/**
 * Rótulos das operações da Merchant API. O iFood devolve o código cru (`DELIVERY`, e às vezes em
 * caixa baixa), que não serve para a UI — daí o mapa.
 *
 * Mora em `lib/` e não numa pasta de página porque tanto o módulo do iFood quanto o trilho do
 * header precisam da mesma tradução.
 */

export const IFOOD_OPERATION_LABELS: Record<string, string> = {
	DELIVERY: "Entrega",
	TAKEOUT: "Retirada",
	INDOOR: "No local",
	"DINE-IN": "No local",
	SCHEDULE: "Agendamento",
};

/** Código desconhecido volta como veio: um rótulo estranho informa mais que "Operação". */
export function getIfoodOperationLabel(operation: string | null) {
	if (!operation) return "Operação";
	return IFOOD_OPERATION_LABELS[operation.toUpperCase()] ?? operation;
}
