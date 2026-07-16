import type { TGetIfoodInterruptionsOutput } from "@/app/api/integrations/ifood/merchants/interruptions/route";
import type { TGetIfoodOpeningHoursOutput } from "@/app/api/integrations/ifood/merchants/opening-hours/route";
import type { TGetIfoodMerchantsOutput } from "@/app/api/integrations/ifood/merchants/route";
import type { TGetIfoodMerchantStatusOutput } from "@/app/api/integrations/ifood/merchants/status/route";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

/**
 * Queries da GESTÃO do iFood. Erros 404 dessas rotas significam "iFood não conectado" — a UI usa
 * isso para renderizar o gate de conexão (IfoodConnectionGate).
 */

async function fetchIfoodMerchants() {
	const { data } = await axios.get<TGetIfoodMerchantsOutput>("/api/integrations/ifood/merchants");
	const result = data.data.default;
	if (!result) throw new Error("Lojas do iFood não encontradas.");
	return result;
}

export function useIfoodMerchants({ enabled = true }: { enabled?: boolean } = {}) {
	const queryKey = ["ifood-merchants"];
	return {
		...useQuery({
			queryKey,
			queryFn: fetchIfoodMerchants,
			enabled,
			retry: false,
		}),
		queryKey,
	};
}

async function fetchIfoodMerchantDetails(merchantId: string) {
	const { data } = await axios.get<TGetIfoodMerchantsOutput>(`/api/integrations/ifood/merchants?merchantId=${merchantId}`);
	const result = data.data.byId;
	if (!result) throw new Error("Detalhes da loja do iFood não encontrados.");
	return result;
}

export function useIfoodMerchantDetails({ merchantId }: { merchantId: string | null }) {
	const queryKey = ["ifood-merchant-details", merchantId];
	return {
		...useQuery({
			queryKey,
			queryFn: () => fetchIfoodMerchantDetails(merchantId as string),
			enabled: !!merchantId,
			retry: false,
		}),
		queryKey,
	};
}

async function fetchIfoodMerchantStatus(merchantId: string) {
	const { data } = await axios.get<TGetIfoodMerchantStatusOutput>(`/api/integrations/ifood/merchants/status?merchantId=${merchantId}`);
	return data.data.operacoes;
}

export function useIfoodMerchantStatus({ merchantId }: { merchantId: string | null }) {
	const queryKey = ["ifood-merchant-status", merchantId];
	return {
		...useQuery({
			queryKey,
			queryFn: () => fetchIfoodMerchantStatus(merchantId as string),
			enabled: !!merchantId,
			retry: false,
			refetchInterval: 60 * 1000,
		}),
		queryKey,
	};
}

async function fetchIfoodInterruptions(merchantId: string) {
	const { data } = await axios.get<TGetIfoodInterruptionsOutput>(`/api/integrations/ifood/merchants/interruptions?merchantId=${merchantId}`);
	return data.data.interrupcoes;
}

export function useIfoodInterruptions({ merchantId }: { merchantId: string | null }) {
	const queryKey = ["ifood-interruptions", merchantId];
	return {
		...useQuery({
			queryKey,
			queryFn: () => fetchIfoodInterruptions(merchantId as string),
			enabled: !!merchantId,
			retry: false,
		}),
		queryKey,
	};
}

async function fetchIfoodOpeningHours(merchantId: string) {
	const { data } = await axios.get<TGetIfoodOpeningHoursOutput>(`/api/integrations/ifood/merchants/opening-hours?merchantId=${merchantId}`);
	return data.data.turnos;
}

export function useIfoodOpeningHours({ merchantId }: { merchantId: string | null }) {
	const queryKey = ["ifood-opening-hours", merchantId];
	return {
		...useQuery({
			queryKey,
			queryFn: () => fetchIfoodOpeningHours(merchantId as string),
			enabled: !!merchantId,
			retry: false,
		}),
		queryKey,
	};
}
