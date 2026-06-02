import type {
	TCreatePointOfInteractionTransactionInput,
	TCreatePointOfInteractionTransactionOutput,
} from "@/app/api/point-of-interaction/new-transaction/route";
import type { TUpdateSaleAttendanceStatusInput, TUpdateSaleAttendanceStatusOutput } from "@/app/api/pos/sales/attendance-status/route";
import type { TCreateSaleInput, TCreateSaleOutput } from "@/app/api/sales/route";
import type { TBulkCreateSalesInput, TBulkCreateSalesOutput, TBulkSalesMapInput, TBulkSalesMapOutput } from "@/state-hooks/use-bulk-create-sales";
import axios from "axios";

export async function updateSaleAttendanceStatus(input: TUpdateSaleAttendanceStatusInput) {
	const { data } = await axios.post<TUpdateSaleAttendanceStatusOutput>("/api/pos/sales/attendance-status", input);
	return data;
}

export async function createSale(input: TCreateSaleInput) {
	try {
		// Client side checkings
		if (!input.orgId) {
			throw new Error("ID da organização não informado.");
		}
		if (!input.clientId) {
			throw new Error("Cliente não informado.");
		}
		if (!input.saleValue) {
			throw new Error("Valor total não informado.");
		}
		if (!input.password) {
			throw new Error("Senha do operador não informada.");
		}
		const { data } = await axios.post<TCreateSaleOutput>("/api/sales", input);
		return data;
	} catch (error) {
		console.log("Error running createSale", error);
		throw error;
	}
}

export async function createPointOfInteractionSale(input: TCreatePointOfInteractionTransactionInput) {
	try {
		// Client side checkings
		if (!input.orgId) {
			throw new Error("ID da organização não informado.");
		}
		if (!input.client.telefone) {
			throw new Error("Telefone do cliente não informado.");
		}
		if (!input.client.nome && !input.client.id) {
			throw new Error("Cliente não informado.");
		}
		if (!input.sale.valor || input.sale.valor <= 0) {
			throw new Error("Valor da venda deve ser positivo.");
		}
		if (!input.operatorIdentifier) {
			throw new Error("Identificador do operador não informado.");
		}
		const { data } = await axios.post<TCreatePointOfInteractionTransactionOutput>("/api/point-of-interaction/new-transaction", input);
		return data;
	} catch (error) {
		console.log("Error running createPointOfInteractionSale", error);
		throw error;
	}
}

export async function suggestSalesSheetMapping(input: TBulkSalesMapInput) {
	const { data } = await axios.post<{
		data: TBulkSalesMapOutput;
		message: string;
	}>("/api/sales/bulk/map", input);
	return data;
}

export async function bulkCreateSales(input: TBulkCreateSalesInput, onUploadProgress?: (progress: number) => void) {
	const { data } = await axios.post<TBulkCreateSalesOutput>("/api/sales/bulk", input, {
		onUploadProgress: (progressEvent) => onUploadProgress?.(Math.round((progressEvent.loaded * 100) / (progressEvent.total ?? 1))),
	});
	return data;
}
