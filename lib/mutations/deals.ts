import type { TCreateDealInput, TCreateDealOutput, TUpdateDealInput, TUpdateDealOutput } from "@/app/api/admin/deals/route";
import axios from "axios";

export async function createDeal(input: TCreateDealInput) {
	const response = await axios.post<TCreateDealOutput>("/api/admin/deals", input);
	return response.data;
}

export async function updateDeal(input: TUpdateDealInput) {
	const response = await axios.put<TUpdateDealOutput>("/api/admin/deals", input);
	return response.data;
}
