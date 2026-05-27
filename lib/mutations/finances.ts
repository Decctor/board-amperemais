import type { TEffectFinancialTransactionInput, TEffectFinancialTransactionOutput } from "@/app/api/finances/financial-transactions/effect/route";
import type { TUpdateFinancialTransactionInput, TUpdateFinancialTransactionOutput } from "@/app/api/finances/financial-transactions/route";
import axios from "axios";

export async function effectFinancialTransaction(input: TEffectFinancialTransactionInput) {
	const { data } = await axios.post<TEffectFinancialTransactionOutput>(`/api/finances/financial-transactions/effect`, input);
	return data;
}

export async function updateFinancialTransaction(input: TUpdateFinancialTransactionInput) {
	const { data } = await axios.put<TUpdateFinancialTransactionOutput>(`/api/finances/financial-transactions`, input);
	return data;
}
