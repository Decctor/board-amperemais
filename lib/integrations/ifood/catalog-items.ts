import type { TIfoodCatalogContextEnum, TIfoodCatalogStatusEnum, TIfoodOptionGroupTypeEnum } from "@/schemas/enums";
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

/**
 * Uma opção de complemento. O NOME mora no produto da opção, não na opção: o iFood modela toda
 * opção como um produto vendável referenciado por `productId`. Por isso cada opção gera duas
 * entradas no payload — uma em `products` (nome/descrição) e outra em `options` (preço/status).
 */
export type TIfoodItemOptionPayload = {
	id?: string | null;
	produtoId?: string | null;
	nome: string;
	descricao?: string | null;
	preco?: number | null;
	codigoExterno?: string | null;
	status?: TIfoodCatalogStatusEnum | null;
};

/**
 * Grupo de complementos. `min`/`max` definem a obrigatoriedade: `min: 1, max: 1` é "escolha
 * obrigatória de 1"; `min: 0` torna o grupo opcional.
 */
export type TIfoodItemOptionGroupPayload = {
	id?: string | null;
	nome: string;
	tipo: TIfoodOptionGroupTypeEnum;
	min: number;
	max: number;
	status?: TIfoodCatalogStatusEnum | null;
	opcoes: TIfoodItemOptionPayload[];
};

/**
 * Sobrescrita de preço/status/código por canal de venda. Campo em branco herda o valor da raiz do
 * item — é o que evita duplicar o mesmo produto só porque o preço no salão é outro.
 */
export type TIfoodItemContextModifierPayload = {
	contexto: TIfoodCatalogContextEnum;
	preco?: number | null;
	status?: TIfoodCatalogStatusEnum | null;
	codigoExterno?: string | null;
};

export type TIfoodItemUpsertPayload = {
	/** Presente ao atualizar um item existente. */
	itemId?: string | null;
	produtoId?: string | null;
	categoriaId: string;
	status: TIfoodCatalogStatusEnum;
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
	/** Grupos de complementos do item. Ausente = não mexe; `[]` = remove todos. */
	gruposComplementos?: TIfoodItemOptionGroupPayload[] | null;
	/** Preço/status por canal. Ausente = não mexe; `[]` = todos os canais herdam a raiz. */
	contextModifiers?: TIfoodItemContextModifierPayload[] | null;
};

/**
 * PUT /items — cria/atualiza item + produto base + complementos numa chamada só ("FullItemDto").
 *
 * O iFood exige que `item.id` e `item.productId` venham SEMPRE preenchidos (UUIDs v4 gerados pelo
 * cliente na criação — se já existirem na base, vira update). Omiti-los responde
 * 400 "FullItemDto is not valid"; um id fora do padrão UUID v4 responde 404. A imagem do produto
 * vai no campo `imagePath` (retorno do upload de imagem), não `image`.
 *
 * Este é o ÚNICO caminho documentado para criar ou editar grupos de complementos: a Catalog v2.0
 * não publica `POST /optionGroups`. O payload é montado em três listas que se referenciam por id —
 * `optionGroups[].optionIds` aponta para `options[].id`, e `options[].productId` aponta para
 * `products[].id`, que é onde mora o nome da opção.
 */
export async function upsertIfoodItem(
	client: AxiosInstance,
	merchantId: string,
	payload: TIfoodItemUpsertPayload,
): Promise<{ itemId: string; productId: string }> {
	try {
		const itemId = payload.itemId ?? crypto.randomUUID();
		const productId = payload.produtoId ?? crypto.randomUUID();

		// Cada opção vira um par produto + opção; o id da opção precisa existir antes de entrar no
		// `optionIds` do grupo, então resolvemos todos os ids primeiro.
		const grupos = (payload.gruposComplementos ?? []).map((grupo) => ({
			...grupo,
			id: grupo.id ?? crypto.randomUUID(),
			opcoes: grupo.opcoes.map((opcao) => ({
				...opcao,
				id: opcao.id ?? crypto.randomUUID(),
				produtoId: opcao.produtoId ?? crypto.randomUUID(),
			})),
		}));
		const opcoes = grupos.flatMap((grupo) => grupo.opcoes);

		const produtosBase = payload.produto
			? [
					{
						id: productId,
						name: payload.produto.nome,
						description: payload.produto.descricao ?? undefined,
						imagePath: payload.produto.imagemPath ?? undefined,
						// O vínculo com os grupos sai DAQUI, do produto base — não do item. Apontar do
						// item (`item.optionGroupIds`) responde 400 "resources are not linked correctly".
						optionGroupIds: grupos.length ? grupos.map((grupo) => grupo.id) : undefined,
					},
				]
			: [];

		await client.put(catalogUrl(merchantId, "/items"), {
			item: {
				id: itemId,
				type: "DEFAULT",
				productId,
				categoryId: payload.categoriaId,
				status: payload.status,
				externalCode: payload.codigoExterno ?? undefined,
				index: payload.indice ?? undefined,
				price: {
					value: payload.preco,
					originalValue: payload.precoOriginal ?? undefined,
				},
				// Só entram os canais que de fato sobrescrevem algo: mandar um modifier vazio faria o
				// canal herdar `undefined` em vez de herdar a raiz.
				contextModifiers: payload.contextModifiers
					? payload.contextModifiers
							.filter((modifier) => modifier.preco != null || modifier.status != null || modifier.codigoExterno)
							.map((modifier) => ({
								catalogContext: modifier.contexto,
								price: modifier.preco != null ? { value: modifier.preco } : undefined,
								status: modifier.status ?? undefined,
								externalCode: modifier.codigoExterno || undefined,
							}))
					: undefined,
			},
			products: [
				...produtosBase,
				...opcoes.map((opcao) => ({
					id: opcao.produtoId,
					name: opcao.nome,
					description: opcao.descricao ?? undefined,
				})),
			],
			optionGroups: grupos.map((grupo) => ({
				id: grupo.id,
				name: grupo.nome,
				optionGroupType: grupo.tipo,
				// Obrigatório, apesar de ausente no exemplo da documentação: sem ele a API responde
				// 400 "FullItemDto is not valid" com `OptionGroupDto[0] status must be one of...`.
				status: grupo.status ?? "AVAILABLE",
				min: grupo.min,
				max: grupo.max,
				optionIds: grupo.opcoes.map((opcao) => opcao.id),
			})),
			options: opcoes.map((opcao) => ({
				id: opcao.id,
				productId: opcao.produtoId,
				status: opcao.status ?? "AVAILABLE",
				externalCode: opcao.codigoExterno ?? undefined,
				price: { value: opcao.preco ?? 0 },
			})),
		});
		return { itemId, productId };
	} catch (error) {
		mapIfoodError("upsertIfoodItem", error);
	}
}

export type TIfoodItemPatchPayload = {
	preco?: number | null;
	precoOriginal?: number | null;
	status?: TIfoodCatalogStatusEnum | null;
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

export async function patchIfoodOptionGroupStatus(
	client: AxiosInstance,
	merchantId: string,
	optionGroupId: string,
	status: TIfoodCatalogStatusEnum,
): Promise<void> {
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
	status?: TIfoodCatalogStatusEnum | null;
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
	opcoes: { optionId: string; status: TIfoodCatalogStatusEnum }[],
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
