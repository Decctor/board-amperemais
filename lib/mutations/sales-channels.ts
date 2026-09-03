import type { TUpdateSalesChannelInput, TUpdateSalesChannelOutput } from "@/app/api/sales-channels/route";
import type { TUpdateSalesChannelShowcaseInput, TUpdateSalesChannelShowcaseOutput } from "@/app/api/sales-channels/showcase/route";
import axios from "axios";

export async function updateSalesChannel(input: TUpdateSalesChannelInput) {
	const { data } = await axios.put<TUpdateSalesChannelOutput>("/api/sales-channels", input);
	return data;
}

export async function updateSalesChannelShowcase(input: TUpdateSalesChannelShowcaseInput) {
	const { data } = await axios.put<TUpdateSalesChannelShowcaseOutput>("/api/sales-channels/showcase", input);
	return data;
}
