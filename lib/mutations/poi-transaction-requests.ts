import type {
	TCreatePoiTransactionRequestInput,
	TCreatePoiTransactionRequestOutput,
} from "@/app/api/point-of-interaction/transaction-requests/public/route";
import type {
	TRejectPoiTransactionRequestInput,
	TRejectPoiTransactionRequestOutput,
} from "@/app/api/point-of-interaction/transaction-requests/management/reject/route";
import axios from "axios";

export async function createPoiTransactionRequest(input: TCreatePoiTransactionRequestInput) {
	const { data } = await axios.post<TCreatePoiTransactionRequestOutput>("/api/point-of-interaction/transaction-requests/public", input);
	return data;
}

export async function approvePoiTransactionRequest(requestId: string) {
	const { data } = await axios.post(`/api/point-of-interaction/transaction-requests/management/approve?requestId=${requestId}`);
	return data;
}

export async function rejectPoiTransactionRequest({ requestId, input }: { requestId: string; input?: TRejectPoiTransactionRequestInput }) {
	const { data } = await axios.post<TRejectPoiTransactionRequestOutput>(
		`/api/point-of-interaction/transaction-requests/management/reject?requestId=${requestId}`,
		input ?? {},
	);
	return data;
}
