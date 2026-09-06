import type { DB, DBTransaction } from "@/services/drizzle";
import { db } from "@/services/drizzle";
import { campaigns, whatsappConnections } from "@/services/drizzle/schema";
import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { getOnboardingReadiness } from "./readiness";
import { captureOnboardingEvent } from "./analytics";

/**
 * Liga `campaigns.ativo` só quando a campanha semeada por preset está pronta E o usuário liberou
 * os envios; desliga quando uma dependência regrediu. Nunca toca campanhas sem `chavePreset`.
 * Idempotente: chamada em toda mudança de dependência (telefone conectado, template aprovado,
 * pagamento confirmado, liberação do usuário) e no fim do seed.
 */
export async function reconcileOnboardingCampaigns({ executor, organizationId }: { executor: DB | DBTransaction; organizationId: string }) {
	const connections = await executor.query.whatsappConnections.findMany({ where: eq(whatsappConnections.organizacaoId, organizationId), with: { telefones: true } });
	const connection = connections.find((item) => item.telefones.length && (item.tipoConexao === "INTERNAL_GATEWAY" ? item.gatewayStatus === "connected" : !item.dataExpiracao || item.dataExpiracao > new Date()));
	const phone = connection?.telefones[0];
	if (phone) await executor.update(campaigns).set({ whatsappConexaoTelefoneId: phone.id }).where(and(eq(campaigns.organizacaoId, organizationId), isNotNull(campaigns.chavePreset), isNull(campaigns.whatsappConexaoTelefoneId)));
	const readiness = await getOnboardingReadiness({ executor, organizationId });
	const changes: Array<{ id: string; chave: string; ativo: boolean }> = [];
	for (const campaign of readiness.campanhas) {
		const enabled = campaign.dependencias.some((dependency) => dependency.tipo === "LIBERACAO" && dependency.status === "OK");
		const shouldBeActive = campaign.pronta && enabled;
		const isActive = campaign.estado === "ATIVA";
		if (shouldBeActive === isActive) continue;
		await executor
			.update(campaigns)
			.set({ ativo: shouldBeActive })
			.where(and(eq(campaigns.id, campaign.id), eq(campaigns.organizacaoId, organizationId), isNotNull(campaigns.chavePreset)));
		changes.push({ id: campaign.id, chave: campaign.chave, ativo: shouldBeActive });
		if (shouldBeActive && executor === db) await captureOnboardingEvent(organizationId, "campaign_activated", { chave: campaign.chave });
	}
	return { readiness: changes.length ? await getOnboardingReadiness({ executor, organizationId }) : readiness, changes };
}
