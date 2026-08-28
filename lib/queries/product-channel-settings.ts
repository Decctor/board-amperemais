import type { TGetProductChannelSettingsOutput } from "@/app/api/products/channel-settings/route";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

async function fetchProductChannelSettings(produtoId: string) {
	const { data } = await axios.get<TGetProductChannelSettingsOutput>(`/api/products/channel-settings?produtoId=${produtoId}`);
	return data.data;
}

export function useProductChannelSettings({ produtoId }: { produtoId: string }) {
	const queryKey = ["product-channel-settings", produtoId];
	return {
		...useQuery({
			queryKey,
			queryFn: () => fetchProductChannelSettings(produtoId),
		}),
		queryKey,
	};
}
