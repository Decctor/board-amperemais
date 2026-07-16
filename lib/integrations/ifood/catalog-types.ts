import z from "zod";

/**
 * Schemas das respostas da Catalog API v2.0 do iFood (tolerantes, `.passthrough()`) e os DTOs em
 * PT consumidos pela UI, com seus mappers. A UI nunca vê o shape cru do iFood.
 */

export const IFOOD_CATALOG_BASE_URL = "https://merchant-api.ifood.com.br/catalog/v2.0";

/** CDN pública de imagens de catálogo do iFood. */
export function buildIfoodCatalogImageUrl(imagePath: string | null) {
	if (!imagePath) return null;
	if (imagePath.startsWith("http")) return imagePath;
	return `https://static-images.ifood.com.br/image/upload/t_medium/pratos/${imagePath}`;
}

const NullableString = z
	.union([z.string(), z.number()])
	.optional()
	.nullable()
	.transform((value) => (value === null || value === undefined ? null : String(value)));

const NullableNumber = z
	.union([z.string(), z.number()])
	.optional()
	.nullable()
	.transform((value) => {
		if (value === null || value === undefined || value === "") return null;
		const numberValue = Number(value);
		return Number.isFinite(numberValue) ? numberValue : null;
	});

// ---------------------------------------------------------------------------
// Catálogos + versão
// ---------------------------------------------------------------------------

const IfoodCatalogResponseSchema = z
	.object({
		catalogId: NullableString,
		id: NullableString,
		status: NullableString,
		context: z.union([z.array(z.string()), z.string()]).optional().nullable(),
		modifiedAt: NullableString,
	})
	.passthrough();

export const IfoodCatalogsListResponseSchema = z.array(IfoodCatalogResponseSchema);

export const IfoodCatalogVersionResponseSchema = z
	.object({
		version: z.union([z.string(), z.number()]).optional().nullable(),
	})
	.passthrough();

export type TIfoodCatalogDTO = {
	id: string;
	status: string | null;
	contextos: string[];
	modificadoEm: string | null;
};

export function mapIfoodCatalog(catalog: z.infer<typeof IfoodCatalogResponseSchema>): TIfoodCatalogDTO | null {
	const id = catalog.catalogId ?? catalog.id;
	if (!id) return null;
	return {
		id,
		status: catalog.status,
		contextos: Array.isArray(catalog.context) ? catalog.context : catalog.context ? [catalog.context] : [],
		modificadoEm: catalog.modifiedAt,
	};
}

export type TIfoodCatalogVersion = "V1" | "V2" | null;

export function mapIfoodCatalogVersion(payload: z.infer<typeof IfoodCatalogVersionResponseSchema>): TIfoodCatalogVersion {
	const version = payload.version === null || payload.version === undefined ? null : String(payload.version);
	if (!version) return null;
	if (version.includes("2")) return "V2";
	if (version.includes("1")) return "V1";
	return null;
}

// ---------------------------------------------------------------------------
// Itens (produto vendável dentro de uma categoria)
// ---------------------------------------------------------------------------

const IfoodItemPriceResponseSchema = z
	.object({
		value: NullableNumber,
		originalValue: NullableNumber,
	})
	.passthrough();

const IfoodItemResponseSchema = z
	.object({
		id: NullableString,
		productId: NullableString,
		name: NullableString,
		description: NullableString,
		externalCode: NullableString,
		status: NullableString,
		index: NullableNumber,
		price: IfoodItemPriceResponseSchema.optional().nullable(),
		imagePath: NullableString,
	})
	.passthrough();

export type TIfoodItemDTO = {
	id: string | null;
	produtoId: string | null;
	nome: string | null;
	descricao: string | null;
	codigoExterno: string | null;
	status: string | null;
	indice: number | null;
	preco: number | null;
	precoOriginal: number | null;
	imagemUrl: string | null;
};

export function mapIfoodItem(item: z.infer<typeof IfoodItemResponseSchema>): TIfoodItemDTO {
	return {
		id: item.id,
		produtoId: item.productId,
		nome: item.name,
		descricao: item.description,
		codigoExterno: item.externalCode,
		status: item.status,
		indice: item.index,
		preco: item.price?.value ?? null,
		precoOriginal: item.price?.originalValue ?? null,
		imagemUrl: buildIfoodCatalogImageUrl(item.imagePath),
	};
}

// ---------------------------------------------------------------------------
// Categorias
// ---------------------------------------------------------------------------

const IfoodCategoryResponseSchema = z
	.object({
		id: NullableString,
		name: NullableString,
		externalCode: NullableString,
		status: NullableString,
		index: NullableNumber,
		template: NullableString,
		items: z.array(IfoodItemResponseSchema).optional().nullable(),
	})
	.passthrough();

export const IfoodCategoriesListResponseSchema = z.array(IfoodCategoryResponseSchema);
export const IfoodCategoryDetailResponseSchema = IfoodCategoryResponseSchema;

export type TIfoodCategoryDTO = {
	id: string;
	nome: string | null;
	codigoExterno: string | null;
	status: string | null;
	indice: number | null;
	template: string | null;
	itens: TIfoodItemDTO[];
};

export function mapIfoodCategory(category: z.infer<typeof IfoodCategoryResponseSchema>): TIfoodCategoryDTO | null {
	if (!category.id) return null;
	return {
		id: category.id,
		nome: category.name,
		codigoExterno: category.externalCode,
		status: category.status,
		indice: category.index,
		template: category.template,
		itens: (category.items ?? []).map(mapIfoodItem),
	};
}

// ---------------------------------------------------------------------------
// Produtos (entidade base, sem contexto de venda)
// ---------------------------------------------------------------------------

const IfoodProductResponseSchema = z
	.object({
		id: NullableString,
		name: NullableString,
		description: NullableString,
		externalCode: NullableString,
		imagePath: NullableString,
		image: NullableString,
	})
	.passthrough();

export const IfoodProductsListResponseSchema = z.union([
	z.array(IfoodProductResponseSchema),
	z
		.object({
			elements: z.array(IfoodProductResponseSchema).optional().nullable(),
			page: NullableNumber,
			size: NullableNumber,
			total: NullableNumber,
		})
		.passthrough(),
]);

export const IfoodProductDetailResponseSchema = IfoodProductResponseSchema;

export type TIfoodProductDTO = {
	id: string;
	nome: string | null;
	descricao: string | null;
	codigoExterno: string | null;
	imagemUrl: string | null;
};

export function mapIfoodProduct(product: z.infer<typeof IfoodProductResponseSchema>): TIfoodProductDTO | null {
	if (!product.id) return null;
	return {
		id: product.id,
		nome: product.name,
		descricao: product.description,
		codigoExterno: product.externalCode,
		imagemUrl: buildIfoodCatalogImageUrl(product.imagePath ?? product.image),
	};
}

export type TIfoodProductsPageDTO = {
	produtos: TIfoodProductDTO[];
	paginacao: {
		pagina: number | null;
		total: number | null;
	};
};

export function mapIfoodProductsPage(payload: z.infer<typeof IfoodProductsListResponseSchema>): TIfoodProductsPageDTO {
	if (Array.isArray(payload)) {
		return {
			produtos: payload.map(mapIfoodProduct).filter((product): product is TIfoodProductDTO => !!product),
			paginacao: { pagina: null, total: null },
		};
	}
	return {
		produtos: (payload.elements ?? []).map(mapIfoodProduct).filter((product): product is TIfoodProductDTO => !!product),
		paginacao: { pagina: payload.page, total: payload.total },
	};
}

// ---------------------------------------------------------------------------
// Grupos de complementos (option groups) e opções
// ---------------------------------------------------------------------------

const IfoodOptionResponseSchema = z
	.object({
		id: NullableString,
		productId: NullableString,
		name: NullableString,
		externalCode: NullableString,
		status: NullableString,
		index: NullableNumber,
		price: IfoodItemPriceResponseSchema.optional().nullable(),
	})
	.passthrough();

const IfoodOptionGroupResponseSchema = z
	.object({
		id: NullableString,
		name: NullableString,
		externalCode: NullableString,
		status: NullableString,
		options: z.array(IfoodOptionResponseSchema).optional().nullable(),
	})
	.passthrough();

export const IfoodOptionGroupsListResponseSchema = z.union([
	z.array(IfoodOptionGroupResponseSchema),
	z
		.object({
			elements: z.array(IfoodOptionGroupResponseSchema).optional().nullable(),
			page: NullableNumber,
			size: NullableNumber,
			total: NullableNumber,
		})
		.passthrough(),
]);

export const IfoodOptionGroupDetailResponseSchema = IfoodOptionGroupResponseSchema;

export type TIfoodOptionDTO = {
	id: string | null;
	produtoId: string | null;
	nome: string | null;
	codigoExterno: string | null;
	status: string | null;
	indice: number | null;
	preco: number | null;
};

export type TIfoodOptionGroupDTO = {
	id: string;
	nome: string | null;
	codigoExterno: string | null;
	status: string | null;
	opcoes: TIfoodOptionDTO[];
};

export function mapIfoodOption(option: z.infer<typeof IfoodOptionResponseSchema>): TIfoodOptionDTO {
	return {
		id: option.id,
		produtoId: option.productId,
		nome: option.name,
		codigoExterno: option.externalCode,
		status: option.status,
		indice: option.index,
		preco: option.price?.value ?? null,
	};
}

export function mapIfoodOptionGroup(group: z.infer<typeof IfoodOptionGroupResponseSchema>): TIfoodOptionGroupDTO | null {
	if (!group.id) return null;
	return {
		id: group.id,
		nome: group.name,
		codigoExterno: group.externalCode,
		status: group.status,
		opcoes: (group.options ?? []).map(mapIfoodOption),
	};
}

export function mapIfoodOptionGroupsList(payload: z.infer<typeof IfoodOptionGroupsListResponseSchema>): TIfoodOptionGroupDTO[] {
	const groups = Array.isArray(payload) ? payload : (payload.elements ?? []);
	return groups.map(mapIfoodOptionGroup).filter((group): group is TIfoodOptionGroupDTO => !!group);
}

// ---------------------------------------------------------------------------
// Batch (operações em lote de preço/status)
// ---------------------------------------------------------------------------

export const IfoodBatchResponseSchema = z
	.object({
		batchId: NullableString,
		id: NullableString,
		status: NullableString,
	})
	.passthrough();

export type TIfoodBatchDTO = {
	id: string | null;
	status: string | null;
};

export function mapIfoodBatch(batch: z.infer<typeof IfoodBatchResponseSchema>): TIfoodBatchDTO {
	return {
		id: batch.batchId ?? batch.id,
		status: batch.status,
	};
}
