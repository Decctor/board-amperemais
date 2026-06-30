import type { TDiscardProductStockLotInput, TDiscardProductStockLotOutput } from "@/app/api/products/stock-lots/discard/route";
import axios from "axios";

export async function discardProductStockLot(input: TDiscardProductStockLotInput) {
	const { data } = await axios.post<TDiscardProductStockLotOutput>("/api/products/stock-lots/discard", input);
	return data;
}
