import dayjs from "dayjs";

import { DASTJS_TIME_DURATION_UNITS_MAP } from "@/lib/dates";
import type { TTimeDurationUnitsEnum } from "@/schemas/enums";
import { type DBTransaction } from "@/services/drizzle";

// Org-level minimum gap between any two campaign messages for the same client (hardcoded).
const ORG_FREQUENCY_LIMIT_HOURS = 24;

export async function canScheduleCampaignForClient(
	tx: DBTransaction,
	clienteId: string,
	campanhaId: string,
	organizacaoId: string,
	permitirRecorrencia: boolean,
	frequenciaIntervaloValor: number | null,
	frequenciaIntervaloMedida: string | null,
): Promise<boolean> {
	// Org-level 24h guard: block if client received ANY campaign message within the last 24h.
	// Interactions blocked (BLOQUEADA) or failed (FALHOU) are excluded — they were never delivered.
	const orgCutoff = dayjs().subtract(ORG_FREQUENCY_LIMIT_HOURS, "hour").toDate();
	const recentOrgInteraction = await tx.query.interactions.findFirst({
		where: (fields, { and, eq, gt, isNotNull, or, isNull, notInArray }) =>
			and(
				eq(fields.clienteId, clienteId),
				eq(fields.organizacaoId, organizacaoId),
				isNotNull(fields.campanhaId),
				gt(fields.dataInsercao, orgCutoff),
				or(isNull(fields.statusEnvio), notInArray(fields.statusEnvio, ["BLOQUEADA", "FALHOU"])),
			),
	});
	if (recentOrgInteraction) {
		console.log(
			`[CAMPAIGN_FREQUENCY] Org-level 24h limit reached for client ${clienteId} in org ${organizacaoId}. Last interaction: ${recentOrgInteraction.dataInsercao}.`,
		);
		return false;
	}

	// Per-campaign: block if campaign does not allow recurrence and client was already reached.
	if (!permitirRecorrencia) {
		const previousInteraction = await tx.query.interactions.findFirst({
			where: (fields, { and, eq }) => and(eq(fields.clienteId, clienteId), eq(fields.campanhaId, campanhaId)),
		});
		if (previousInteraction) {
			console.log(`[CAMPAIGN_FREQUENCY] Campaign ${campanhaId} does not allow recurrence. Skipping for client ${clienteId}.`);
			return false;
		}
	}

	// Per-campaign frequency interval cap.
	if (permitirRecorrencia && frequenciaIntervaloValor && frequenciaIntervaloValor > 0 && frequenciaIntervaloMedida) {
		const dayjsUnit = DASTJS_TIME_DURATION_UNITS_MAP[frequenciaIntervaloMedida as TTimeDurationUnitsEnum] || "day";
		const cutoffDate = dayjs().subtract(frequenciaIntervaloValor, dayjsUnit).toDate();

		const recentInteraction = await tx.query.interactions.findFirst({
			where: (fields, { and, eq, gt }) =>
				and(eq(fields.clienteId, clienteId), eq(fields.campanhaId, campanhaId), gt(fields.dataInsercao, cutoffDate)),
		});

		if (recentInteraction) {
			console.log(
				`[CAMPAIGN_FREQUENCY] Campaign ${campanhaId} frequency limit reached for client ${clienteId}. Last interaction: ${recentInteraction.dataInsercao}.`,
			);
			return false;
		}
	}

	return true;
}
