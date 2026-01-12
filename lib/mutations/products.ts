import type { TCreateProductInput, TCreateProductOutput, TUpdateProductInput, TUpdateProductOutput } from "@/pages/api/products";
import axios from "axios";

export async function createProduct(input: TCreateProductInput) {
	const { data } = await axios.post<TCreateProductOutput>("/api/products", input);
	return data;
}

export async function updateProduct(input: TUpdateProductInput) {
	const { data } = await axios.put<TUpdateProductOutput>(`/api/products?id=${input.productId}`, input);
	return data;
}
