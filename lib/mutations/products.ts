import type { TUpdateProductInput, TUpdateProductOutput } from "@/pages/api/products";
import axios from "axios";

export async function updateProduct(input: TUpdateProductInput) {
	const { data } = await axios.put<TUpdateProductOutput>(`/api/products?id=${input.productId}`, input);
	return data;
}
