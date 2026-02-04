import type {
	TCreatePointOfInteractionTransactionInput,
	TCreatePointOfInteractionTransactionOutput,
} from "@/app/api/point-of-interaction/new-transaction/route";
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

export async function createPointOfInteractionSale(input: TCreatePointOfInteractionTransactionInput) {
	try {
		// Client side checkings
		if (!input.orgId) {
			throw new Error("ID da organização não informado.");
		}
		if (!input.client.telefone) {
			throw new Error("Telefone do cliente não informado.");
		}
		if (!input.client.nome && !input.client.id) {
			throw new Error("Cliente não informado.");
		}
		if (!input.sale.valor || input.sale.valor <= 0) {
			throw new Error("Valor da venda deve ser positivo.");
		}
		if (!input.operatorIdentifier) {
			throw new Error("Identificador do operador não informado.");
		}
		const { data } = await axios.post<TCreatePointOfInteractionTransactionOutput>("/api/point-of-interaction/new-transaction", input);
		return data;
	} catch (error) {
		console.log("Error running createPointOfInteractionSale", error);
		throw error;
	}
}
