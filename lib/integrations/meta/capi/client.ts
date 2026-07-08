import { getMetaGraphUrl } from "@/lib/integrations/meta/ads/client";

import type { TCapiEvent } from "./events";

type CapiResponse = {
	events_received?: number;
	messages?: unknown[];
	fbtrace_id?: string;
	error?: {
		message?: string;
		type?: string;
		code?: number;
		error_subcode?: number;
		fbtrace_id?: string;
	};
};

export type SendCapiResult = { ok: true; eventsReceived: number } | { ok: false; error: string };

/**
 * Envia eventos server-side para o Conversions API da Meta (`POST /{pixelId}/events`). Reusa a base
 * do Graph (`getMetaGraphUrl`) e o `fetch` nativo já usado pela integração de Ads.
 *
 * NÃO lança: falhas de CAPI nunca devem derrubar a ingestão/venda. O resultado é retornado para
 * log/observabilidade (persistido em `sales.capiMetadados`).
 */
export async function sendCapiEvents({
	pixelId,
	accessToken,
	events,
	testEventCode,
}: {
	pixelId: string;
	accessToken: string;
	events: TCapiEvent[];
	testEventCode?: string;
}): Promise<SendCapiResult> {
	if (events.length === 0) return { ok: true, eventsReceived: 0 };

	const url = getMetaGraphUrl(`/${pixelId}/events`);
	url.searchParams.set("access_token", accessToken);

	const body: Record<string, unknown> = { data: events };
	if (testEventCode) body.test_event_code = testEventCode;

	try {
		const response = await fetch(url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		});
		const payload = (await response.json()) as CapiResponse;

		if (!response.ok || payload.error) {
			const message = payload.error?.message ?? `HTTP ${response.status}`;
			console.error("[ERROR] [META_CAPI] Conversions API error:", {
				status: response.status,
				code: payload.error?.code,
				subcode: payload.error?.error_subcode,
				type: payload.error?.type,
				fbtraceId: payload.error?.fbtrace_id,
				message,
			});
			return { ok: false, error: message };
		}

		return { ok: true, eventsReceived: payload.events_received ?? events.length };
	} catch (error) {
		const message = error instanceof Error ? error.message : "Erro desconhecido ao enviar evento para o CAPI.";
		console.error("[ERROR] [META_CAPI] Falha de rede ao enviar para o CAPI:", message);
		return { ok: false, error: message };
	}
}
