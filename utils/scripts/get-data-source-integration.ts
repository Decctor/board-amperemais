import { getActiveDataSourceIntegrations, type TDataSourceIntegration, type TDataSourceIntegrationType } from "@/lib/integrations/data-sources";
import { db } from "@/services/drizzle";

/**
 * Resolução de credenciais para scripts: a fonte de dados vive em `integrations` (N conexões por
 * organização). Sem `integrationId`, exige que a organização tenha exatamente UMA conexão ativa
 * do(s) tipo(s) — com mais de uma, o script deve receber `--integration-id=<id>`.
 */
export async function getScriptDataSourceIntegration({
	organizationId,
	types,
	integrationId,
}: {
	organizationId: string;
	types?: readonly TDataSourceIntegrationType[];
	integrationId?: string | null;
}): Promise<TDataSourceIntegration> {
	const rows = await getActiveDataSourceIntegrations({ executor: db, organizationId, types });
	if (!rows.length) {
		throw new Error(`Organização ${organizationId} sem fonte de dados ativa${types?.length ? ` do tipo ${types.join("/")}` : ""} em integrations.`);
	}
	if (integrationId) {
		const row = rows.find((candidate) => candidate.id === integrationId);
		if (!row) throw new Error(`Conexão ${integrationId} não encontrada/ativa para a organização ${organizationId}.`);
		return row;
	}
	if (rows.length > 1) {
		throw new Error(
			`Organização ${organizationId} tem ${rows.length} conexões ativas — informe --integration-id=<id>. Opções: ${rows
				.map((row) => `${row.id} (${row.tipo}${row.apelido ? ` · ${row.apelido}` : ""})`)
				.join(", ")}`,
		);
	}
	return rows[0];
}
