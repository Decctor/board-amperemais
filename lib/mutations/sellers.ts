import type { TCreateSellerInput, TCreateSellerOutput, TUpdateSellerInput, TUpdateSellerOutput } from "@/pages/api/sellers";
import axios from "axios";

export async function updateSeller(info: TUpdateSellerInput) {
	try {
		const { data } = await axios.put<TUpdateSellerOutput>("/api/sellers", info);

		return data;
	} catch (error) {
		console.log("Error running updateSeller", error);
		throw error;
	}
}

export async function createSeller(info: TCreateSellerInput) {
	try {
		const { data } = await axios.post<TCreateSellerOutput>("/api/sellers", info);

		return data;
	} catch (error) {
		console.log("Error running createSeller", error);
		throw error;
	}
}
