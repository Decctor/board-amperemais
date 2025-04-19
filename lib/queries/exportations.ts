import type { TGetClientsExportationInput, TGetClientsExportationOutput } from "@/pages/api/exportation/clients";
import axios from "axios";

export async function fetchClientExportation({ filters }: { filters: TGetClientsExportationInput }) {
	try {
		const { data } = await axios.post("/api/exportation/clients", filters);

		return data.data as TGetClientsExportationOutput;
	} catch (error) {
		console.log("Error running fetchClientExportation", error);
		throw error;
	}
}
