import { db } from "@/services/drizzle";
import { integrations } from "@/services/drizzle/schema";
import { and, eq } from "drizzle-orm";

export type TCapiPurchaseTarget = {
	organizacaoId: string;
	integrationId: string;
	pixelId: string;
	accessToken: string;
	testEventCode?: string;
};

const PURCHASE_EVENT_KEY = "purchase";

/** Uma config META_ADS é elegível para CAPI de Purchase se está ativa, tem pixelId e "purchase" em eventosCapi. */
function toTarget(row: { id: string; organizacaoId: string; configuracao: unknown }): TCapiPurchaseTarget | null {
	const config = row.configuracao;
	if (!config || typeof config !== "object") return null;
	const c = config as {
		tipo?: string;
		pixelId?: string;
		accessToken?: string;
		capiTestEventCode?: string;
		eventosCapi?: string[];
	};
	if (c.tipo !== "META_ADS" || !c.pixelId || !c.accessToken) return null;
	const eventos = (c.eventosCapi ?? []).map((event) => event.toLowerCase());
	if (!eventos.includes(PURCHASE_EVENT_KEY)) return null;
	return {
		organizacaoId: row.organizacaoId,
		integrationId: row.id,
		pixelId: c.pixelId,
		accessToken: c.accessToken,
		testEventCode: c.capiTestEventCode,
	};
}

/** Todos os alvos de CAPI Purchase (todas as organizações) — usado pelo cron de varredura. */
export async function getAllCapiPurchaseTargets(): Promise<TCapiPurchaseTarget[]> {
	const rows = await db
		.select({ id: integrations.id, organizacaoId: integrations.organizacaoId, configuracao: integrations.configuracao })
		.from(integrations)
		.where(and(eq(integrations.tipo, "META_ADS"), eq(integrations.ativo, true)));

	const targets: TCapiPurchaseTarget[] = [];
	for (const row of rows) {
		const target = toTarget(row);
		if (target) targets.push(target);
	}
	return targets;
}
