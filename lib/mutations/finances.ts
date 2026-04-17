import type { TEffectFinancialTransactionInput, TEffectFinancialTransactionOutput } from "@/app/api/finances/financial-transactions/effect/route";
import axios from "axios";

export async function effectFinancialTransaction(input: TEffectFinancialTransactionInput) {
	const { data } = await axios.post<TEffectFinancialTransactionOutput>(`/api/finances/financial-transactions/effect`, input);
	return data;
}
