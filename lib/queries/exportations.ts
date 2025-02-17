import type { TClientExportResult } from "@/pages/api/exportation/clients";
import axios from "axios";

export async function fetchClientExportation() {
	try {
		const { data } = await axios.get("/api/exportation/clients");

		return data.data as TClientExportResult;
	} catch (error) {
		console.log("Error running fetchClientExportation", error);
		throw error;
	}
}
