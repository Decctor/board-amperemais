import type { TCreateProductInput, TCreateProductOutput, TUpdateProductInput, TUpdateProductOutput } from "@/app/api/products/route";
import type {
	TCreateProductVariantInput,
	TCreateProductVariantOutput,
	TUpdateProductVariantInput,
	TUpdateProductVariantOutput,
} from "@/app/api/products/variants/route";
import axios from "axios";

export async function createProduct(input: TCreateProductInput) {
	const { data } = await axios.post<TCreateProductOutput>("/api/products", input);
	return data;
}

export async function updateProduct(input: TUpdateProductInput) {
	const { data } = await axios.put<TUpdateProductOutput>(`/api/products?id=${input.productId}`, input);
	return data;
}

export async function createProductVariant(input: TCreateProductVariantInput) {
	const { data } = await axios.post<TCreateProductVariantOutput>("/api/products/variants", input);
	return data;
}

export async function updateProductVariant(input: TUpdateProductVariantInput) {
	const { data } = await axios.put<TUpdateProductVariantOutput>("/api/products/variants", input);
	return data;
}
