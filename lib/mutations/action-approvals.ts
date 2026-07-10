import type { TCreateActionApprovalInput, TCreateActionApprovalOutput } from "@/app/api/action-approvals/route";
import type { TDecideActionApprovalInput, TDecideActionApprovalOutput } from "@/app/api/action-approvals/decide/route";
import type { TDecideActionApprovalWithPinInput, TDecideActionApprovalWithPinOutput } from "@/app/api/action-approvals/decide-with-pin/route";
import axios from "axios";

export async function createActionApproval(input: TCreateActionApprovalInput) {
	const { data } = await axios.post<TCreateActionApprovalOutput>("/api/action-approvals", input);
	return data;
}

export async function decideActionApproval(input: TDecideActionApprovalInput) {
	const { data } = await axios.post<TDecideActionApprovalOutput>("/api/action-approvals/decide", input);
	return data;
}

export async function decideActionApprovalWithPin(input: TDecideActionApprovalWithPinInput) {
	const { data } = await axios.post<TDecideActionApprovalWithPinOutput>("/api/action-approvals/decide-with-pin", input);
	return data;
}
