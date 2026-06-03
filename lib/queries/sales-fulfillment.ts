import type { TGetSalesFulfillmentOutput } from "@/app/api/sales/fulfillment/route";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export const SALES_FULFILLMENT_QUERY_KEY = ["sales-fulfillment"] as const;

async function fetchSalesFulfillment() {
	const { data } = await axios.get<TGetSalesFulfillmentOutput>("/api/sales/fulfillment");
	return data.data;
}

export function useSalesFulfillment() {
	return {
		// Sem refetch automatico: evita sobrescrever um movimento otimista enquanto a confirmacao
		// de entrega esta aberta. A reconciliacao acontece via invalidacao apos cada movimento e
		// pelo botao de atualizar. (Evolucao futura: refetch que pausa durante mutacoes pendentes.)
		...useQuery({
			queryKey: SALES_FULFILLMENT_QUERY_KEY,
			queryFn: fetchSalesFulfillment,
			refetchOnWindowFocus: false,
		}),
		queryKey: SALES_FULFILLMENT_QUERY_KEY,
	};
}
