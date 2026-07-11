import type { TGetBrandAssetsOutput } from "@/app/api/admin/brand-assets/route";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

async function fetchAdminBrandAssetTemplates() {
	const { data } = await axios.get<TGetBrandAssetsOutput>("/api/admin/brand-assets");
	return data.data.templates;
}

export function useAdminBrandAssetTemplates() {
	const queryKey = ["admin-brand-asset-templates"];
	return {
		...useQuery({ queryKey, queryFn: fetchAdminBrandAssetTemplates }),
		queryKey,
	};
}
