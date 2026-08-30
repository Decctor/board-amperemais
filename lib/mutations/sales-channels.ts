import type { TUpdateSalesChannelInput, TUpdateSalesChannelOutput } from "@/app/api/sales-channels/route";
import axios from "axios";

export async function updateSalesChannel(input: TUpdateSalesChannelInput) {
	const { data } = await axios.put<TUpdateSalesChannelOutput>("/api/sales-channels", input);
	return data;
}
