import type { TEffectFinancialTransactionInput, TEffectFinancialTransactionOutput } from "@/app/api/finances/financial-transactions/effect/route";
import type {
	TCreateAccountingEntryInput,
	TCreateAccountingEntryOutput,
	TUpdateAccountingEntryInput,
	TUpdateAccountingEntryOutput,
} from "@/app/api/finances/accounting-entries/route";
import type { TUpdateFinancialTransactionInput, TUpdateFinancialTransactionOutput } from "@/app/api/finances/financial-transactions/route";
import type {
	TCreateFinancialTransferInput,
	TCreateFinancialTransferOutput,
} from "@/app/api/finances/financial-transactions/transfer/route";
import axios from "axios";

export async function effectFinancialTransaction(input: TEffectFinancialTransactionInput) {
	const { data } = await axios.post<TEffectFinancialTransactionOutput>(`/api/finances/financial-transactions/effect`, input);
	return data;
}

export async function updateFinancialTransaction(input: TUpdateFinancialTransactionInput) {
	const { data } = await axios.put<TUpdateFinancialTransactionOutput>(`/api/finances/financial-transactions`, input);
	return data;
}

export async function createFinancialTransfer(input: TCreateFinancialTransferInput) {
	const { data } = await axios.post<TCreateFinancialTransferOutput>(`/api/finances/financial-transactions/transfer`, input);
	return data;
}

export async function createAccountingEntry(input: TCreateAccountingEntryInput) {
	const { data } = await axios.post<TCreateAccountingEntryOutput>(`/api/finances/accounting-entries`, input);
	return data;
}

export async function updateAccountingEntry(input: TUpdateAccountingEntryInput) {
	const { data } = await axios.put<TUpdateAccountingEntryOutput>(`/api/finances/accounting-entries`, input);
	return data;
}
