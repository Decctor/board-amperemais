import { TCreatePurchaseInput, TCreatePurchaseOutput, TUpdatePurchaseInput, TUpdatePurchaseOutput } from "@/app/api/purchases/route";
import axios from "axios";

export async function createPurchase(input: TCreatePurchaseInput) {
	const { data } = await axios.post<TCreatePurchaseOutput>("/api/purchases", input);
	return data;
}

export async function updatePurchase(input: TUpdatePurchaseInput) {
	const { data } = await axios.patch<TUpdatePurchaseOutput>("/api/purchases", input);
	return data;
}
