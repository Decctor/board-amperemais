import type { TEffectFinancialTransactionInput, TEffectFinancialTransactionOutput } from "@/app/api/finances/financial-transactions/effect/route";
import type {
	TCreateAccountingEntryInput,
	TCreateAccountingEntryOutput,
	TUpdateAccountingEntryInput,
	TUpdateAccountingEntryOutput,
} from "@/app/api/finances/accounting-entries/route";
import type { TUpdateFinancialTransactionInput, TUpdateFinancialTransactionOutput } from "@/app/api/finances/financial-transactions/route";
import type { TCreateFinancialTransferInput, TCreateFinancialTransferOutput } from "@/app/api/finances/financial-transactions/transfer/route";
import type {
	TCreateFinancialAccountInput,
	TCreateFinancialAccountOutput,
	TUpdateFinancialAccountInput,
	TUpdateFinancialAccountOutput,
} from "@/app/api/finances/financial-accounts/route";
import type {
	TCreateRecurringRuleInput,
	TCreateRecurringRuleOutput,
	TUpdateRecurringRuleInput,
	TUpdateRecurringRuleOutput,
} from "@/app/api/finances/recurring-rules/route";
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

export async function createFinancialAccount(input: TCreateFinancialAccountInput) {
	const { data } = await axios.post<TCreateFinancialAccountOutput>(`/api/finances/financial-accounts`, input);
	return data;
}

export async function updateFinancialAccount(input: TUpdateFinancialAccountInput) {
	const { data } = await axios.put<TUpdateFinancialAccountOutput>(`/api/finances/financial-accounts`, input);
	return data;
}

export async function createFinancialRecurringRule(input: TCreateRecurringRuleInput) {
	const { data } = await axios.post<TCreateRecurringRuleOutput>(`/api/finances/recurring-rules`, input);
	return data;
}

export async function updateFinancialRecurringRule(input: TUpdateRecurringRuleInput) {
	const { data } = await axios.put<TUpdateRecurringRuleOutput>(`/api/finances/recurring-rules`, input);
	return data;
}
