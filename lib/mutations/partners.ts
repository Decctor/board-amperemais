import type { TCreatePartnerInput, TCreatePartnerOutput, TUpdatePartnerInput, TUpdatePartnerOutput } from "@/app/api/partners/route";
import axios from "axios";

export async function updatePartner(info: TUpdatePartnerInput) {
	try {
		const { data } = await axios.put<TUpdatePartnerOutput>(`/api/partners?id=${info.partnerId}`, info);
		return data;
	} catch (error) {
		console.log("Error running updatePartner", error);
		throw error;
	}
}

export async function createPartner(info: TCreatePartnerInput) {
	try {
		const { data } = await axios.post<TCreatePartnerOutput>("/api/partners", info);
		return data;
	} catch (error) {
		console.log("Error running createPartner", error);
		throw error;
	}
}
