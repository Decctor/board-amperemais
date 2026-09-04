import type { TDismissClientDuplicateInput, TDismissClientDuplicateOutput } from "@/app/api/clients/duplicates/dismiss/route";
import type { TMergeClientDuplicateInput, TMergeClientDuplicateOutput } from "@/app/api/clients/duplicates/merge/route";
import axios from "axios";

export async function dismissClientDuplicate(info: TDismissClientDuplicateInput) {
	const { data } = await axios.post<TDismissClientDuplicateOutput>("/api/clients/duplicates/dismiss", info);
	return data;
}

export async function mergeClientDuplicate(info: TMergeClientDuplicateInput) {
	const { data } = await axios.post<TMergeClientDuplicateOutput>("/api/clients/duplicates/merge", info);
	return data;
}
