import type { AxiosInstance } from "axios";
import z from "zod";
import { IFOOD_CATALOG_BASE_URL } from "./catalog-types";
import { mapIfoodError } from "./errors";

/**
 * Inventário do catálogo do iFood: limite de quantidade vendável por PRODUTO.
 *
 * Quando o estoque chega a zero, o iFood pausa o item sozinho. Isso só vale para produtos que
 * tenham inventário configurado — sem `POST /inventory`, o item vende indefinidamente e a pausa
 * fica por conta do lojista.
 *
 * O endereçamento é por `productId` (o produto base), não pelo id do item vendável.
 */

function catalogUrl(merchantId: string, path: string) {
	return `${IFOOD_CATALOG_BASE_URL}/merchants/${merchantId}${path}`;
}

/**
 * O campo da quantidade é `amount`. A documentação mostra `quantity`, que a API rejeita com
 * `PostInventoryItemDTO.amount should not be empty` — `quantity` fica aceito na LEITURA como
 * fallback, caso alguma resposta ainda use o nome antigo.
 */
const IfoodInventoryResponseSchema = z
	.object({
		productId: z.string().optional().nullable(),
		amount: z.union([z.string(), z.number()]).optional().nullable(),
		quantity: z.union([z.string(), z.number()]).optional().nullable(),
	})
	.passthrough();

export type TIfoodInventoryDTO = {
	produtoId: string | null;
	/** `null` = produto sem inventário configurado (vende sem limite). */
	quantidade: number | null;
};

export function mapIfoodInventory(payload: z.infer<typeof IfoodInventoryResponseSchema>): TIfoodInventoryDTO {
	const bruto = payload.amount ?? payload.quantity;
	const quantidade = bruto === null || bruto === undefined || bruto === "" ? null : Number(bruto);
	return {
		produtoId: payload.productId ?? null,
		quantidade: quantidade !== null && Number.isFinite(quantidade) ? quantidade : null,
	};
}

/**
 * Estoque atual de um produto. Produto sem inventário responde 404 no iFood — aqui isso vira
 * `quantidade: null` em vez de erro, porque "não tem limite" é um estado válido, não uma falha.
 */
export async function getIfoodProductInventory(client: AxiosInstance, merchantId: string, produtoId: string): Promise<TIfoodInventoryDTO> {
	try {
		const response = await client.get<unknown>(catalogUrl(merchantId, `/inventory/${produtoId}`));
		return mapIfoodInventory(IfoodInventoryResponseSchema.parse(response.data));
	} catch (error) {
		const status = (error as { response?: { status?: number } }).response?.status;
		if (status === 404) return { produtoId, quantidade: null };
		mapIfoodError("getIfoodProductInventory", error);
	}
}

/** POST /inventory — cria ou sobrescreve o estoque do produto. */
export async function setIfoodProductInventory(
	client: AxiosInstance,
	merchantId: string,
	{ produtoId, quantidade }: { produtoId: string; quantidade: number },
): Promise<void> {
	try {
		await client.post(catalogUrl(merchantId, "/inventory"), { productId: produtoId, amount: quantidade });
	} catch (error) {
		mapIfoodError("setIfoodProductInventory", error);
	}
}

/**
 * POST /inventory/batchDelete — remove a restrição de estoque. Depois disso o produto volta a
 * vender sem limite e nunca mais é pausado automaticamente.
 */
export async function deleteIfoodProductsInventory(client: AxiosInstance, merchantId: string, produtoIds: string[]): Promise<void> {
	if (!produtoIds.length) return;
	try {
		await client.post(catalogUrl(merchantId, "/inventory/batchDelete"), { productIds: produtoIds });
	} catch (error) {
		mapIfoodError("deleteIfoodProductsInventory", error);
	}
}
