import type { TCloseSalesSessionOutput } from "@/app/api/pos/sales-sessions/close/route";
import type { TRegisterSalesSessionMovementOutput } from "@/app/api/pos/sales-sessions/movements/route";
import type { TOpenSalesSessionOutput } from "@/app/api/pos/sales-sessions/open/route";
import type { TReviewSalesSessionOutput } from "@/app/api/pos/sales-sessions/review/route";
import type { TCloseSalesSessionInput, TOpenSalesSessionInput, TRegisterSalesSessionMovementInput, TReviewSalesSessionInput } from "@/schemas/sales-sessions";
import axios from "axios";

export async function openSalesSession(input: TOpenSalesSessionInput) {
	const { data } = await axios.post<TOpenSalesSessionOutput>("/api/pos/sales-sessions/open", input);
	return data;
}

export async function closeSalesSession(input: TCloseSalesSessionInput) {
	const { data } = await axios.post<TCloseSalesSessionOutput>("/api/pos/sales-sessions/close", input);
	return data;
}

export async function reviewSalesSession(input: TReviewSalesSessionInput) {
	const { data } = await axios.post<TReviewSalesSessionOutput>("/api/pos/sales-sessions/review", input);
	return data;
}

export async function registerSalesSessionMovement(input: TRegisterSalesSessionMovementInput) {
	const { data } = await axios.post<TRegisterSalesSessionMovementOutput>("/api/pos/sales-sessions/movements", input);
	return data;
}
