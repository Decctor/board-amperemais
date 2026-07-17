import type { TGetIntegrationsInput, TGetIntegrationsOutput } from "@/app/api/integrations/route";
import type { TGetIntegrationSettingsOutput } from "@/app/api/integrations/settings/route";
import type { TIntegrationTipoEnum } from "@/schemas/enums";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

async function fetchIntegrations(input: TGetIntegrationsInput) {
	const searchParams = new URLSearchParams();
	if (input.tipo) searchParams.set("tipo", input.tipo);
	const { data } = await axios.get<TGetIntegrationsOutput>(`/api/integrations?${searchParams.toString()}`);
	const result = data.data.default;
	if (!result) throw new Error("Integrações não encontradas.");
	return result;
}

export function useIntegrations({ tipo }: { tipo?: TIntegrationTipoEnum } = {}) {
	const queryKey = ["integrations", tipo ?? "all"];
	return {
		...useQuery({
			queryKey,
			queryFn: () => fetchIntegrations({ id: null, tipo: tipo ?? null }),
		}),
		queryKey,
	};
}

async function fetchIntegrationById(id: string) {
	const { data } = await axios.get<TGetIntegrationsOutput>(`/api/integrations?id=${id}`);
	const result = data.data.byId;
	if (!result) throw new Error("Integração não encontrada.");
	return result;
}

export function useIntegrationById({ integrationId }: { integrationId: string }) {
	const queryKey = ["integration-by-id", integrationId];
	return {
		...useQuery({
			queryKey,
			queryFn: () => fetchIntegrationById(integrationId),
			enabled: !!integrationId,
		}),
		queryKey,
	};
}

export const INTEGRATION_SETTINGS_QUERY_KEY = ["integration-settings"] as const;

async function fetchIntegrationSettings() {
	const { data } = await axios.get<TGetIntegrationSettingsOutput>("/api/integrations/settings");
	return data.data;
}

/** Política de canal de ERP (efeitos das vendas de integração: atendimento, estoque, financeiro, fiscal). */
export function useIntegrationSettings({ enabled = true }: { enabled?: boolean } = {}) {
	return {
		...useQuery({
			queryKey: INTEGRATION_SETTINGS_QUERY_KEY,
			queryFn: fetchIntegrationSettings,
			enabled,
			retry: false,
		}),
		queryKey: INTEGRATION_SETTINGS_QUERY_KEY,
	};
}
