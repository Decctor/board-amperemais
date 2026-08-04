import type { TIfoodCatalogStatusEnum } from "@/schemas/enums";

/**
 * Decide como aplicar um conjunto de edições de preço/status feitas na tabela do catálogo.
 *
 * O endpoint de lote (`PATCH /products/price` e `/products/status`) endereça por `externalCode`.
 * Item sem código externo simplesmente não é alcançável por ele, e cair no lote assim mesmo faria o
 * iFood ignorar a linha em silêncio — o pior desfecho possível, porque a UI diria "enviado".
 * Esses caem no PATCH individual por `itemId`.
 */

export type TIfoodItemChange = {
	itemId: string;
	codigoExterno: string | null;
	preco?: number | null;
	status?: TIfoodCatalogStatusEnum | null;
};

export type TIfoodUpdatePlan = {
	lotePreco: { codigoExterno: string; preco: number }[];
	loteStatus: { codigoExterno: string; status: TIfoodCatalogStatusEnum }[];
	individuais: { itemId: string; preco?: number; status?: TIfoodCatalogStatusEnum }[];
	/** Quantas chamadas o plano vai custar — a UI mostra isso antes de aplicar. */
	totalChamadas: number;
};

export function planIfoodItemUpdates(changes: TIfoodItemChange[]): TIfoodUpdatePlan {
	const lotePreco: TIfoodUpdatePlan["lotePreco"] = [];
	const loteStatus: TIfoodUpdatePlan["loteStatus"] = [];
	const individuais: TIfoodUpdatePlan["individuais"] = [];

	for (const change of changes) {
		const temPreco = change.preco !== undefined && change.preco !== null;
		const temStatus = change.status !== undefined && change.status !== null;
		if (!temPreco && !temStatus) continue;

		if (change.codigoExterno?.trim()) {
			if (temPreco) lotePreco.push({ codigoExterno: change.codigoExterno.trim(), preco: change.preco as number });
			if (temStatus) loteStatus.push({ codigoExterno: change.codigoExterno.trim(), status: change.status as TIfoodCatalogStatusEnum });
			continue;
		}

		individuais.push({
			itemId: change.itemId,
			...(temPreco ? { preco: change.preco as number } : {}),
			...(temStatus ? { status: change.status as TIfoodCatalogStatusEnum } : {}),
		});
	}

	const totalChamadas = (lotePreco.length ? 1 : 0) + (loteStatus.length ? 1 : 0) + individuais.length;
	return { lotePreco, loteStatus, individuais, totalChamadas };
}

/** Frase de confirmação da apply bar. O usuário precisa saber que o iFood demora a refletir. */
export function describeIfoodUpdatePlan(plan: TIfoodUpdatePlan): string {
	const itens = new Set([
		...plan.lotePreco.map((entrada) => entrada.codigoExterno),
		...plan.loteStatus.map((entrada) => entrada.codigoExterno),
		...plan.individuais.map((entrada) => entrada.itemId),
	]).size;

	if (itens === 0) return "Nenhuma alteração para enviar.";
	if (itens === 1) return "1 item será atualizado no iFood. Pode levar alguns segundos para aparecer no app.";
	return `${itens} itens serão atualizados no iFood. Pode levar alguns segundos para aparecer no app.`;
}
