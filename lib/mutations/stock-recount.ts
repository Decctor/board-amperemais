import type { TApplyStockRecountInput, TApplyStockRecountOutput } from "@/app/api/products/stock-recount/route";
import axios from "axios";

export async function applyStockRecount(input: TApplyStockRecountInput) {
	const { data } = await axios.post<TApplyStockRecountOutput>("/api/products/stock-recount", input);
	return data;
}
