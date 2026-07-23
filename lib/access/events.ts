import type { TAccessEventTypeEnum } from "@/schemas/enums";
import { db } from "@/services/drizzle";
import { accessEvents } from "@/services/drizzle/schema";
import type { NextRequest } from "next/server";

type TRecordAccessEventParams = {
	tipo: TAccessEventTypeEnum;
	organizacaoId?: string | null;
	principalId?: string | null;
	credencialId?: string | null;
	enderecoIp?: string | null;
	userAgent?: string | null;
	metadados?: Record<string, unknown> | null;
};
// Auditoria nunca deve derrubar a operação que a originou — falhas são apenas logadas.
// Logs e metadados jamais contêm o segredo completo (§9.8 do plano).
export async function recordAccessEvent(params: TRecordAccessEventParams) {
	try {
		await db.insert(accessEvents).values({
			tipo: params.tipo,
			organizacaoId: params.organizacaoId ?? null,
			principalId: params.principalId ?? null,
			credencialId: params.credencialId ?? null,
			enderecoIp: params.enderecoIp ?? null,
			userAgent: params.userAgent ?? null,
			metadados: params.metadados ?? null,
		});
	} catch (error) {
		console.error("[ACCESS] Erro ao registrar access_event", params.tipo, error);
	}
}

// PREMISSA DE DEPLOY: o primeiro item do x-forwarded-for só é confiável porque a Vercel
// sobrescreve o header com o IP real do cliente. Atrás de outro proxy/provedor, este valor
// passa a ser forjável — e o rate limiting por IP do enrollment precisa ser revisto.
export function getRequestClientInfo(request: NextRequest) {
	const forwardedFor = request.headers.get("x-forwarded-for");
	const enderecoIp = forwardedFor ? forwardedFor.split(",")[0].trim() : (request.headers.get("x-real-ip") ?? null);
	return {
		enderecoIp,
		userAgent: request.headers.get("user-agent"),
	};
}
