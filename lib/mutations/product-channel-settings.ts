import type { TUpdateProductChannelSettingsInput, TUpdateProductChannelSettingsOutput } from "@/app/api/products/channel-settings/route";
import axios from "axios";

export async function updateProductChannelSettings(input: TUpdateProductChannelSettingsInput) {
	const { data } = await axios.put<TUpdateProductChannelSettingsOutput>("/api/products/channel-settings", input);
	return data;
}
