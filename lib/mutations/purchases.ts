import { TImportPurchaseCompositionInput, TImportPurchaseCompositionOutput } from "@/app/api/purchases/import-composition/route";
import { TCreatePurchaseInput, TCreatePurchaseOutput, TUpdatePurchaseInput, TUpdatePurchaseOutput } from "@/app/api/purchases/route";
import axios from "axios";

export async function createPurchase(input: TCreatePurchaseInput) {
	const { data } = await axios.post<TCreatePurchaseOutput>("/api/purchases", input);
	return data;
}

export async function updatePurchase(input: TUpdatePurchaseInput) {
	const { data } = await axios.put<TUpdatePurchaseOutput>("/api/purchases", input);
	return data;
}

export async function importPurchaseComposition(input: TImportPurchaseCompositionInput) {
	const { data } = await axios.post<TImportPurchaseCompositionOutput>("/api/purchases/import-composition", input, {
		// Vision extraction can take tens of seconds; mirror the route's maxDuration.
		timeout: 120_000,
	});
	return data;
}
