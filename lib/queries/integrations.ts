import type { TGetIntegrationsInput, TGetIntegrationsOutput } from "@/app/api/integrations/route";
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
