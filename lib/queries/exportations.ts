import type { TGetClientsExportationInput, TGetClientsExportationOutput } from "@/app/api/exportation/clients/route";
import axios from "axios";

export async function fetchClientExportation({ filters }: { filters: TGetClientsExportationInput }) {
	try {
		const searchParams = new URLSearchParams();
		searchParams.set("payload", JSON.stringify(filters));
		const { data } = await axios.get(`/api/exportation/clients?${searchParams.toString()}`);

		return data.data as TGetClientsExportationOutput;
	} catch (error) {
		console.log("Error running fetchClientExportation", error);
		throw error;
	}
}
