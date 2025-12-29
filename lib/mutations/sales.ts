import type { TCreateSaleInput, TCreateSaleOutput } from "@/pages/api/sales";
import axios from "axios";

export async function createSale(input: TCreateSaleInput) {
	try {
		// Client side checkings
		if (!input.orgId) {
			throw new Error("ID da organização não informado.");
		}
		if (!input.clientId) {
			throw new Error("Cliente não informado.");
		}
		if (!input.saleValue) {
			throw new Error("Valor total não informado.");
		}
		if (!input.password) {
			throw new Error("Senha do operador não informada.");
		}
		const { data } = await axios.post<TCreateSaleOutput>("/api/sales", input);
		return data;
	} catch (error) {
		console.log("Error running createSale", error);
		throw error;
	}
}
