import type { TConfirmSaleInput, TConfirmSaleOutput } from "@/app/api/pos/sales/confirm/route";
import type { TCreateAndConfirmSaleInput, TCreateAndConfirmSaleOutput } from "@/app/api/pos/sales/create-and-confirm/route";
import type { TEditConfirmedSaleInput, TEditConfirmedSaleOutput } from "@/app/api/pos/sales/edit/route";
import type { TCreateSaleDraftInput, TCreateSaleDraftOutput } from "@/app/api/pos/sales/route";
import type { TUpdateSaleDraftInput, TUpdateSaleDraftOutput } from "@/app/api/pos/sales/route";
import axios from "axios";

export async function createSaleDraft(input: TCreateSaleDraftInput) {
	const { data } = await axios.post<TCreateSaleDraftOutput>("/api/pos/sales", input);
	return data;
}

export async function updateSaleDraft(input: TUpdateSaleDraftInput) {
	const { data } = await axios.put<TUpdateSaleDraftOutput>(`/api/pos/sales?id=${input.id}`, input);
	return data;
}

export async function confirmSale(input: TConfirmSaleInput) {
	const { data } = await axios.post<TConfirmSaleOutput>(`/api/pos/sales/confirm?id=${input.id}`, input);
	return data;
}

export async function createAndConfirmSale(input: TCreateAndConfirmSaleInput) {
	const { data } = await axios.post<TCreateAndConfirmSaleOutput>("/api/pos/sales/create-and-confirm", input);
	return data;
}

export async function cancelSaleDraft(saleId: string) {
	const { data } = await axios.post(`/api/pos/sales/cancel?id=${saleId}`);
	return data;
}

export async function editConfirmedSale(input: TEditConfirmedSaleInput) {
	const { data } = await axios.put<TEditConfirmedSaleOutput>("/api/pos/sales/edit", input);
	return data;
}

// Cancelamento com estorno de venda CONFIRMADA (financeiro, estoque, cashback e cupons).
// A mesma rota trata rascunhos, mas para CONFIRMADA exige permissoes.vendas.excluir no servidor.
export async function cancelConfirmedSale({ id, reason, saleSessionId }: { id: string; reason: string; saleSessionId?: string | null }) {
	const searchParams = new URLSearchParams({ id, reason });
	if (saleSessionId) searchParams.set("saleSessionId", saleSessionId);
	const { data } = await axios.post<{ data: { saleId: string }; message: string }>(`/api/pos/sales/cancel?${searchParams.toString()}`);
	return data;
}
