import { waitUntil } from "@vercel/functions";
import createHttpError from "http-errors";
import type { NextRequest } from "next/server";
import { type TExternalActorContext, authenticateExternalRequest, requireExternalScope } from "./authentication";
import { getRequestClientInfo, recordAccessEvent } from "./events";

export type TPoiActorResolution = {
	// Organização efetiva da chamada. Com dispositivo autenticado, deriva do principal —
	// o orgId do payload nunca é autoridade (plano §9.5).
	organizationId: string;
	// null no modo legado anônimo (POI web ainda não migrado — plano §9.10).
	actor: TExternalActorContext | null;
};

type TResolvePoiActorContextParams = {
	request: NextRequest;
	requiredScope: string;
	payloadOrgId?: string | null;
};
// Dual-mode das rotas POI durante a migração: credencial externa (Bearer rcm_...) com scope
// obrigatório, ou modo legado com orgId no payload. Toda chamada legada gera telemetria em
// access_events para medir a adoção por organização antes do enforcement.
export async function resolvePoiActorContext({ request, requiredScope, payloadOrgId }: TResolvePoiActorContextParams): Promise<TPoiActorResolution> {
	const authorizationHeader = request.headers.get("authorization");

	if (authorizationHeader?.startsWith("Bearer rcm_")) {
		const actor = await authenticateExternalRequest(request);
		requireExternalScope(actor, requiredScope);
		if (payloadOrgId && payloadOrgId !== actor.organizationId) {
			throw new createHttpError.Forbidden("A organização informada não corresponde ao dispositivo autenticado.");
		}
		return { organizationId: actor.organizationId, actor };
	}

	if (!payloadOrgId) throw new createHttpError.Unauthorized("Credencial de acesso ou organização não informada.");

	const { enderecoIp, userAgent } = getRequestClientInfo(request);
	waitUntil(
		recordAccessEvent({
			tipo: "CHAMADA_POI_LEGADO",
			organizacaoId: payloadOrgId,
			enderecoIp,
			userAgent,
			metadados: { rota: request.nextUrl.pathname },
		}),
	);
	return { organizationId: payloadOrgId, actor: null };
}
