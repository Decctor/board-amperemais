import type { AxiosInstance } from "axios";
import { mapIfoodError } from "./errors";
import { IFOOD_CATALOG_BASE_URL, mapIfoodOptionGroup, IfoodOptionGroupDetailResponseSchema } from "./catalog-types";

/**
 * Escritas de ITENS (produto vendável em categoria) e COMPLEMENTOS (option groups/options) da
 * Catalog API v2.0. Os payloads seguem os nomes de campos documentados pelo iFood; as validações
 * de negócio ficam do lado do iFood e as mensagens de erro voltam mapeadas por `mapIfoodError`.
 */

function catalogUrl(merchantId: string, path: string) {
	return `${IFOOD_CATALOG_BASE_URL}/merchants/${merchantId}${path}`;
}

// ---------------------------------------------------------------------------
// Itens
// ---------------------------------------------------------------------------

export type TIfoodItemUpsertPayload = {
	/** Presente ao atualizar um item existente. */
	itemId?: string | null;
	produtoId?: string | null;
	categoriaId: string;
	status: string;
	preco: number;
	precoOriginal?: number | null;
	codigoExterno?: string | null;
	indice?: number | null;
	/** Dados do produto base (criação em uma chamada só, quando não há produtoId). */
	produto?: {
		nome: string;
		descricao?: string | null;
		imagemPath?: string | null;
	} | null;
};

export async function upsertIfoodItem(client: AxiosInstance, merchantId: string, payload: TIfoodItemUpsertPayload): Promise<void> {
	try {
		const productId = payload.produtoId ?? undefined;
		await client.put(catalogUrl(merchantId, "/items"), {
			item: {
				id: payload.itemId ?? undefined,
				productId,
				categoryId: payload.categoriaId,
				status: payload.status,
				externalCode: payload.codigoExterno ?? undefined,
				index: payload.indice ?? undefined,
				price: {
					value: payload.preco,
					originalValue: payload.precoOriginal ?? undefined,
				},
			},
			products: payload.produto
				? [
						{
							id: productId,
							name: payload.produto.nome,
							description: payload.produto.descricao ?? undefined,
							image: payload.produto.imagemPath ?? undefined,
						},
					]
				: [],
		});
	} catch (error) {
		mapIfoodError("upsertIfoodItem", error);
	}
}

export type TIfoodItemPatchPayload = {
	preco?: number | null;
	precoOriginal?: number | null;
	status?: string | null;
	codigoExterno?: string | null;
};

/** PATCH /items/{itemId} — JSON Merge Patch: envia apenas os campos informados. */
export async function patchIfoodItem(client: AxiosInstance, merchantId: string, itemId: string, patch: TIfoodItemPatchPayload): Promise<void> {
	try {
		const body: Record<string, unknown> = {};
		if (patch.preco !== undefined && patch.preco !== null) {
			body.price = { value: patch.preco, originalValue: patch.precoOriginal ?? undefined };
		}
		if (patch.status !== undefined && patch.status !== null) body.status = patch.status;
		if (patch.codigoExterno !== undefined && patch.codigoExterno !== null) body.externalCode = patch.codigoExterno;
		await client.patch(catalogUrl(merchantId, `/items/${itemId}`), body);
	} catch (error) {
		mapIfoodError("patchIfoodItem", error);
	}
}

export async function deleteIfoodItemFromCategory(client: AxiosInstance, merchantId: string, categoryId: string, productId: string): Promise<void> {
	try {
		await client.delete(catalogUrl(merchantId, `/categories/${categoryId}/products/${productId}`));
	} catch (error) {
		mapIfoodError("deleteIfoodItemFromCategory", error);
	}
}

// ---------------------------------------------------------------------------
// Grupos de complementos
// ---------------------------------------------------------------------------

export async function updateIfoodOptionGroup(client: AxiosInstance, merchantId: string, optionGroupId: string, { nome }: { nome: string }) {
	try {
		const response = await client.patch<unknown>(catalogUrl(merchantId, `/optionGroups/${optionGroupId}`), { name: nome });
		return mapIfoodOptionGroup(IfoodOptionGroupDetailResponseSchema.parse(response.data));
	} catch (error) {
		mapIfoodError("updateIfoodOptionGroup", error);
	}
}

export async function patchIfoodOptionGroupStatus(client: AxiosInstance, merchantId: string, optionGroupId: string, status: string): Promise<void> {
	try {
		await client.patch(catalogUrl(merchantId, `/optionGroups/${optionGroupId}/status`), { status });
	} catch (error) {
		mapIfoodError("patchIfoodOptionGroupStatus", error);
	}
}

export async function deleteIfoodOptionGroup(client: AxiosInstance, merchantId: string, optionGroupId: string): Promise<void> {
	try {
		await client.delete(catalogUrl(merchantId, `/optionGroups/${optionGroupId}`));
	} catch (error) {
		mapIfoodError("deleteIfoodOptionGroup", error);
	}
}

// ---------------------------------------------------------------------------
// Opções (complementos individuais)
// ---------------------------------------------------------------------------

export type TIfoodOptionCreatePayload = {
	nome: string;
	preco?: number | null;
	codigoExterno?: string | null;
	status?: string | null;
};

export async function addIfoodOptions(
	client: AxiosInstance,
	merchantId: string,
	optionGroupId: string,
	opcoes: TIfoodOptionCreatePayload[],
): Promise<void> {
	try {
		await client.post(
			catalogUrl(merchantId, `/optionGroups/${optionGroupId}/options`),
			opcoes.map((opcao) => ({
				name: opcao.nome,
				externalCode: opcao.codigoExterno ?? undefined,
				status: opcao.status ?? "AVAILABLE",
				price: opcao.preco !== undefined && opcao.preco !== null ? { value: opcao.preco } : undefined,
			})),
		);
	} catch (error) {
		mapIfoodError("addIfoodOptions", error);
	}
}

export async function patchIfoodOptionsPrice(
	client: AxiosInstance,
	merchantId: string,
	opcoes: { optionId: string; preco: number }[],
): Promise<void> {
	try {
		await client.patch(
			catalogUrl(merchantId, "/options/price"),
			opcoes.map((opcao) => ({ optionId: opcao.optionId, price: { value: opcao.preco } })),
		);
	} catch (error) {
		mapIfoodError("patchIfoodOptionsPrice", error);
	}
}

export async function patchIfoodOptionsStatus(
	client: AxiosInstance,
	merchantId: string,
	opcoes: { optionId: string; status: string }[],
): Promise<void> {
	try {
		await client.patch(
			catalogUrl(merchantId, "/options/status"),
			opcoes.map((opcao) => ({ optionId: opcao.optionId, status: opcao.status })),
		);
	} catch (error) {
		mapIfoodError("patchIfoodOptionsStatus", error);
	}
}
