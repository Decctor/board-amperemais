import { TCreatePurchaseInput, TCreatePurchaseOutput } from "@/app/api/purchases/route";
import axios from "axios";

export async function createPurchase(input: TCreatePurchaseInput) {
	const { data } = await axios.post<TCreatePurchaseOutput>("/api/purchases", input);
	return data;
}
