import { db } from "@/services/drizzle";
import { segmentCadences } from "@/services/drizzle/schema";
import { eq } from "drizzle-orm";

// Cadência de comunicação por segmento RFM (docs/seller-routine-hub-design.md §4).
// `diasIdealEntreContatos` é o teto: acima disso o cliente entra em débito de comunicação.
// `diasMinimoEntreContatos` é o piso de fadiga: abaixo disso o cliente nunca entra na fila.
// A organização pode sobrescrever por segmento em `segment_cadences`; estes são os defaults.
export type TSegmentCadenceConfig = {
	segmento: string;
	diasIdealEntreContatos: number;
	diasMinimoEntreContatos: number;
	ativo: boolean;
};

export const DEFAULT_SEGMENT_CADENCES: TSegmentCadenceConfig[] = [
	{ segmento: "CAMPEÕES", diasIdealEntreContatos: 30, diasMinimoEntreContatos: 7, ativo: true },
	{ segmento: "CLIENTES LEAIS", diasIdealEntreContatos: 25, diasMinimoEntreContatos: 7, ativo: true },
	{ segmento: "POTENCIAIS CLIENTES LEAIS", diasIdealEntreContatos: 20, diasMinimoEntreContatos: 5, ativo: true },
	{ segmento: "CLIENTES RECENTES", diasIdealEntreContatos: 10, diasMinimoEntreContatos: 3, ativo: true },
	{ segmento: "PROMISSORES", diasIdealEntreContatos: 15, diasMinimoEntreContatos: 5, ativo: true },
	{ segmento: "PRECISAM DE ATENÇÃO", diasIdealEntreContatos: 15, diasMinimoEntreContatos: 5, ativo: true },
	{ segmento: "PRESTES A DORMIR", diasIdealEntreContatos: 12, diasMinimoEntreContatos: 5, ativo: true },
	{ segmento: "EM RISCO", diasIdealEntreContatos: 14, diasMinimoEntreContatos: 5, ativo: true },
	{ segmento: "NÃO PODE PERDÊ-LOS", diasIdealEntreContatos: 20, diasMinimoEntreContatos: 5, ativo: true },
	{ segmento: "HIBERNANDO", diasIdealEntreContatos: 40, diasMinimoEntreContatos: 10, ativo: true },
	{ segmento: "PERDIDOS", diasIdealEntreContatos: 90, diasMinimoEntreContatos: 15, ativo: true },
];

// Cliente ainda sem análise RFM (ex.: base recém-importada) usa uma cadência conservadora.
export const FALLBACK_SEGMENT_CADENCE: TSegmentCadenceConfig = {
	segmento: "SEM SEGMENTO",
	diasIdealEntreContatos: 30,
	diasMinimoEntreContatos: 7,
	ativo: true,
};

/** Cadências efetivas da organização: overrides persistidos por cima dos defaults. */
export async function getEffectiveSegmentCadences(organizacaoId: string): Promise<Map<string, TSegmentCadenceConfig>> {
	const overrides = await db.query.segmentCadences.findMany({
		where: eq(segmentCadences.organizacaoId, organizacaoId),
		columns: { segmento: true, diasIdealEntreContatos: true, diasMinimoEntreContatos: true, ativo: true },
	});

	const effective = new Map<string, TSegmentCadenceConfig>();
	for (const cadence of DEFAULT_SEGMENT_CADENCES) effective.set(cadence.segmento, cadence);
	for (const override of overrides) effective.set(override.segmento, override);
	return effective;
}

export function getCadenceForSegment(cadences: Map<string, TSegmentCadenceConfig>, segmento: string | null | undefined): TSegmentCadenceConfig {
	if (!segmento) return FALLBACK_SEGMENT_CADENCE;
	return cadences.get(segmento) ?? FALLBACK_SEGMENT_CADENCE;
}
