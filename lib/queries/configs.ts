import type { TRFMConfig } from "@/utils/rfm";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

async function fetchRFMConfig() {
	try {
		const { data } = await axios.get("/api/settings/rfm");
		return data.data as TRFMConfig;
	} catch (error) {
		console.log("Error running fetchRFMConfig", error);
		throw error;
	}
}

export function useRFMConfigQuery() {
	return useQuery({
		queryKey: ["rfm-config"],
		queryFn: fetchRFMConfig,
	});
}
