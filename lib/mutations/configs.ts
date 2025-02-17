import type { TRFMConfig } from "@/utils/rfm";
import axios from "axios";

export async function updateRFMConfig(info: TRFMConfig) {
	try {
		const { data } = await axios.put("/api/settings/rfm", info);

		return data.message as string;
	} catch (error) {
		console.log("Error running updateRFMConfig", error);
		throw error;
	}
}
