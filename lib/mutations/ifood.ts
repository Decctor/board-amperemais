import type {
	TCreateIfoodInterruptionInput,
	TCreateIfoodInterruptionOutput,
	TDeleteIfoodInterruptionInput,
	TDeleteIfoodInterruptionOutput,
} from "@/app/api/integrations/ifood/merchants/interruptions/route";
import type {
	TCreateIfoodCategoryInput,
	TCreateIfoodCategoryOutput,
	TDeleteIfoodCategoryInput,
	TDeleteIfoodCategoryOutput,
	TUpdateIfoodCategoryInput,
	TUpdateIfoodCategoryOutput,
} from "@/app/api/integrations/ifood/catalog/categories/route";
import type { TUploadIfoodImageOutput } from "@/app/api/integrations/ifood/catalog/image/route";
import type {
	TPatchIfoodItemInput,
	TPatchIfoodItemOutput,
	TUpsertIfoodItemInput,
	TUpsertIfoodItemOutput,
} from "@/app/api/integrations/ifood/catalog/items/route";
import type {
	TDeleteIfoodOptionGroupInput,
	TDeleteIfoodOptionGroupOutput,
	TUpdateIfoodOptionGroupInput,
	TUpdateIfoodOptionGroupOutput,
} from "@/app/api/integrations/ifood/catalog/option-groups/route";
import type {
	TCreateIfoodOptionsInput,
	TCreateIfoodOptionsOutput,
	TPatchIfoodOptionsInput,
	TPatchIfoodOptionsOutput,
} from "@/app/api/integrations/ifood/catalog/options/route";
import type { TSetIfoodInventoryInput, TSetIfoodInventoryOutput } from "@/app/api/integrations/ifood/catalog/inventory/route";
import type { TBatchUpdateIfoodProductsInput, TBatchUpdateIfoodProductsOutput } from "@/app/api/integrations/ifood/catalog/products/batch/route";
import type {
	TCreateIfoodProductInput,
	TCreateIfoodProductOutput,
	TDeleteIfoodProductInput,
	TDeleteIfoodProductOutput,
	TUpdateIfoodProductInput,
	TUpdateIfoodProductOutput,
} from "@/app/api/integrations/ifood/catalog/products/route";
import type { TCatalogActionInput, TCatalogActionOutput } from "@/app/api/integrations/ifood/catalog/route";
import type { TUpdateIfoodOpeningHoursInput, TUpdateIfoodOpeningHoursOutput } from "@/app/api/integrations/ifood/merchants/opening-hours/route";
import type { TPostIfoodOrderActionInput, TPostIfoodOrderActionOutput } from "@/app/api/integrations/ifood/orders/actions/route";
import type { TPostIfoodDisputeResponseInput, TPostIfoodDisputeResponseOutput } from "@/app/api/integrations/ifood/orders/disputes/route";
import axios from "axios";

export async function postIfoodOrderAction(input: TPostIfoodOrderActionInput) {
	const { data } = await axios.post<TPostIfoodOrderActionOutput>("/api/integrations/ifood/orders/actions", input);
	return data;
}

export async function postIfoodDisputeResponse(input: TPostIfoodDisputeResponseInput) {
	const { data } = await axios.post<TPostIfoodDisputeResponseOutput>("/api/integrations/ifood/orders/disputes", input);
	return data;
}

export async function createIfoodInterruption(input: TCreateIfoodInterruptionInput) {
	const { data } = await axios.post<TCreateIfoodInterruptionOutput>("/api/integrations/ifood/merchants/interruptions", input);
	return data;
}

export async function deleteIfoodInterruption(input: TDeleteIfoodInterruptionInput) {
	const { data } = await axios.delete<TDeleteIfoodInterruptionOutput>(
		`/api/integrations/ifood/merchants/interruptions?merchantId=${input.merchantId}&interruptionId=${input.interruptionId}`,
	);
	return data;
}

export async function updateIfoodOpeningHours(input: TUpdateIfoodOpeningHoursInput) {
	const { data } = await axios.put<TUpdateIfoodOpeningHoursOutput>("/api/integrations/ifood/merchants/opening-hours", input);
	return data;
}

export async function upgradeIfoodCatalog(input: TCatalogActionInput) {
	const { data } = await axios.post<TCatalogActionOutput>("/api/integrations/ifood/catalog", input);
	return data;
}

export async function createIfoodCategory(input: TCreateIfoodCategoryInput) {
	const { data } = await axios.post<TCreateIfoodCategoryOutput>("/api/integrations/ifood/catalog/categories", input);
	return data;
}

export async function updateIfoodCategory(input: TUpdateIfoodCategoryInput) {
	const { data } = await axios.patch<TUpdateIfoodCategoryOutput>("/api/integrations/ifood/catalog/categories", input);
	return data;
}

export async function deleteIfoodCategory(input: TDeleteIfoodCategoryInput) {
	const { data } = await axios.delete<TDeleteIfoodCategoryOutput>(
		`/api/integrations/ifood/catalog/categories?merchantId=${input.merchantId}&categoryId=${input.categoryId}`,
	);
	return data;
}

export async function createIfoodProduct(input: TCreateIfoodProductInput) {
	const { data } = await axios.post<TCreateIfoodProductOutput>("/api/integrations/ifood/catalog/products", input);
	return data;
}

export async function updateIfoodProduct(input: TUpdateIfoodProductInput) {
	const { data } = await axios.put<TUpdateIfoodProductOutput>("/api/integrations/ifood/catalog/products", input);
	return data;
}

export async function deleteIfoodProduct(input: TDeleteIfoodProductInput) {
	const { data } = await axios.delete<TDeleteIfoodProductOutput>(
		`/api/integrations/ifood/catalog/products?merchantId=${input.merchantId}&productId=${input.productId}`,
	);
	return data;
}

export async function upsertIfoodItem(input: TUpsertIfoodItemInput) {
	const { data } = await axios.put<TUpsertIfoodItemOutput>("/api/integrations/ifood/catalog/items", input);
	return data;
}

export async function patchIfoodItem(input: TPatchIfoodItemInput) {
	const { data } = await axios.patch<TPatchIfoodItemOutput>("/api/integrations/ifood/catalog/items", input);
	return data;
}

export async function setIfoodInventory(input: TSetIfoodInventoryInput) {
	const { data } = await axios.put<TSetIfoodInventoryOutput>("/api/integrations/ifood/catalog/inventory", input);
	return data;
}

export async function batchUpdateIfoodProducts(input: TBatchUpdateIfoodProductsInput) {
	const { data } = await axios.patch<TBatchUpdateIfoodProductsOutput>("/api/integrations/ifood/catalog/products/batch", input);
	return data;
}

export async function updateIfoodOptionGroup(input: TUpdateIfoodOptionGroupInput) {
	const { data } = await axios.patch<TUpdateIfoodOptionGroupOutput>("/api/integrations/ifood/catalog/option-groups", input);
	return data;
}

export async function deleteIfoodOptionGroup(input: TDeleteIfoodOptionGroupInput) {
	const { data } = await axios.delete<TDeleteIfoodOptionGroupOutput>(
		`/api/integrations/ifood/catalog/option-groups?merchantId=${input.merchantId}&optionGroupId=${input.optionGroupId}`,
	);
	return data;
}

export async function addIfoodOptions(input: TCreateIfoodOptionsInput) {
	const { data } = await axios.post<TCreateIfoodOptionsOutput>("/api/integrations/ifood/catalog/options", input);
	return data;
}

export async function patchIfoodOptions(input: TPatchIfoodOptionsInput) {
	const { data } = await axios.patch<TPatchIfoodOptionsOutput>("/api/integrations/ifood/catalog/options", input);
	return data;
}

export async function uploadIfoodImage({ merchantId, file }: { merchantId: string; file: File }) {
	const formData = new FormData();
	formData.append("merchantId", merchantId);
	formData.append("file", file);
	const { data } = await axios.post<TUploadIfoodImageOutput>("/api/integrations/ifood/catalog/image", formData, {
		headers: { "Content-Type": "multipart/form-data" },
	});
	return data;
}
