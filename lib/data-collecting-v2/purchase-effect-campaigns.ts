import { campaigns } from "@/services/drizzle/schema";
import { and, eq, or } from "drizzle-orm";
import type { TCampaignWithAudienceRelations, TDataCollectingV2Executor } from "./types";

export async function loadPurchaseEffectCampaigns(
	executor: Pick<TDataCollectingV2Executor, "query">,
	organizationId: string,
): Promise<TCampaignWithAudienceRelations[]> {
	const result = await executor.query.campaigns.findMany({
		where: and(
			eq(campaigns.organizacaoId, organizationId),
			eq(campaigns.ativo, true),
			or(
				eq(campaigns.gatilhoTipo, "NOVA-COMPRA"),
				eq(campaigns.gatilhoTipo, "PRIMEIRA-COMPRA"),
				eq(campaigns.gatilhoTipo, "CASHBACK-ACUMULADO"),
				eq(campaigns.gatilhoTipo, "QUANTIDADE-TOTAL-COMPRAS"),
				eq(campaigns.gatilhoTipo, "VALOR-TOTAL-COMPRAS"),
			),
		),
		with: {
			whatsappConexaoTelefone: {
				columns: { id: true },
				with: { conexao: { columns: { token: true, gatewaySessaoId: true } } },
			},
			segmentacoes: true,
			whatsappTemplate: true,
		},
	});

	return result as unknown as TCampaignWithAudienceRelations[];
}
