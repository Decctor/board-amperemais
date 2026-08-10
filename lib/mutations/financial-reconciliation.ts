import type { TCreateStatementImportInput, TCreateStatementImportOutput } from "@/app/api/finances/reconciliation/imports/route";
import type {
	TCreateManualMatchInput,
	TCreateManualMatchOutput,
	TRejectMatchInput,
	TRejectMatchOutput,
} from "@/app/api/finances/reconciliation/matches/route";
import type { TRematchInput, TRematchOutput } from "@/app/api/finances/reconciliation/rematch/route";
import type {
	TUpdateStatementTransactionInput,
	TUpdateStatementTransactionOutput,
} from "@/app/api/finances/reconciliation/statement-transactions/route";
import type { TSyncReconciliationInput, TSyncReconciliationOutput } from "@/app/api/finances/reconciliation/sync/route";
import axios from "axios";

export async function createStatementImport(input: TCreateStatementImportInput) {
	const formData = new FormData();
	formData.append("contaFinanceiraId", input.contaFinanceiraId);
	formData.append("file", input.file);
	const { data } = await axios.post<TCreateStatementImportOutput>(`/api/finances/reconciliation/imports`, formData);
	return data;
}

export async function updateStatementTransaction(input: TUpdateStatementTransactionInput) {
	const { data } = await axios.put<TUpdateStatementTransactionOutput>(`/api/finances/reconciliation/statement-transactions`, input);
	return data;
}

export async function createManualReconciliationMatch(input: TCreateManualMatchInput) {
	const { data } = await axios.post<TCreateManualMatchOutput>(`/api/finances/reconciliation/matches`, input);
	return data;
}

export async function rejectReconciliationMatch(input: TRejectMatchInput) {
	const { data } = await axios.put<TRejectMatchOutput>(`/api/finances/reconciliation/matches`, input);
	return data;
}

export async function syncReconciliation(input: TSyncReconciliationInput) {
	const { data } = await axios.post<TSyncReconciliationOutput>(`/api/finances/reconciliation/sync`, input);
	return data;
}

export async function rematchStatementLines(input: TRematchInput) {
	const { data } = await axios.post<TRematchOutput>(`/api/finances/reconciliation/rematch`, input);
	return data;
}
