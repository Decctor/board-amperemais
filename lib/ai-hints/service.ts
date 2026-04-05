import type { TCampaignCreationSuggestion, TCampaignUpdateSuggestion } from "@/lib/ai-agent/marketing/schemas";
import { AIHintCampaignCreationSuggestionSchema, AIHintCampaignUpdatesSuggestionSchema, AIHintSchema, type TAIHint, type TAIHintStatus } from "@/schemas/ai-hints";
import { db } from "@/services/drizzle";
import { aiHints } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { and, desc, eq } from "drizzle-orm";

type TCommonHintParams = {
	organizacaoId: string;
	resumoExecutivo: string;
	criterios: string[];
	modeloUtilizado?: string | null;
	tokensUtilizados?: number | null;
	relevancia?: number | null;
	dataExpiracao?: Date | null;
};

export async function createCampaignSuggestionHint({
	organizacaoId,
	suggestion,
	resumoExecutivo,
	criterios,
	modeloUtilizado = null,
	tokensUtilizados = null,
	relevancia = 0.8,
	dataExpiracao = dayjs().add(7, "days").toDate(),
}: TCommonHintParams & {
	suggestion: TCampaignCreationSuggestion;
}): Promise<TAIHint> {
	const conteudo = AIHintCampaignCreationSuggestionSchema.parse({
		tipo: "campaign-creation-suggestion",
		titulo: suggestion.titulo,
		descricao: suggestion.justificativa,
		acaoSugerida: "Revisar sugestão",
		urlAcao: null,
		dados: {
			resumoExecutivo,
			criterios,
			sugestao: suggestion,
		},
	});

	const [insertedHint] = await db
		.insert(aiHints)
		.values({
			organizacaoId,
			assunto: "campaigns",
			tipo: conteudo.tipo,
			conteudo,
			modeloUtilizado,
			tokensUtilizados,
			relevancia,
			dataExpiracao,
		})
		.returning();

	return AIHintSchema.parse(insertedHint);
}

export async function createCampaignUpdateSuggestionHint({
	organizacaoId,
	suggestion,
	resumoExecutivo,
	criterios,
	modeloUtilizado = null,
	tokensUtilizados = null,
	relevancia = 0.85,
	dataExpiracao = dayjs().add(7, "days").toDate(),
}: TCommonHintParams & {
	suggestion: TCampaignUpdateSuggestion;
}): Promise<TAIHint> {
	const conteudo = AIHintCampaignUpdatesSuggestionSchema.parse({
		tipo: "campaign-updates-suggestion",
		titulo: `Sugestão para ${suggestion.campaignTitle}`,
		descricao: suggestion.justificativa,
		acaoSugerida: "Revisar sugestão",
		urlAcao: null,
		dados: {
			resumoExecutivo,
			criterios,
			sugestao: suggestion,
		},
	});

	const [insertedHint] = await db
		.insert(aiHints)
		.values({
			organizacaoId,
			assunto: "campaigns",
			tipo: conteudo.tipo,
			conteudo,
			modeloUtilizado,
			tokensUtilizados,
			relevancia,
			dataExpiracao,
		})
		.returning();

	return AIHintSchema.parse(insertedHint);
}

export async function listCampaignSuggestionHints({
	organizacaoId,
	status = "active",
	limite = 10,
}: {
	organizacaoId: string;
	status?: TAIHintStatus;
	limite?: number;
}) {
	const hints = await db.query.aiHints.findMany({
		where: and(eq(aiHints.organizacaoId, organizacaoId), eq(aiHints.assunto, "campaigns"), eq(aiHints.status, status)),
		orderBy: [desc(aiHints.relevancia), desc(aiHints.dataInsercao)],
		limit: limite,
	});

	return hints.map((hint) => AIHintSchema.parse(hint));
}

export async function getHintById({
	organizacaoId,
	hintId,
}: {
	organizacaoId: string;
	hintId: string;
}) {
	const hint = await db.query.aiHints.findFirst({
		where: and(eq(aiHints.id, hintId), eq(aiHints.organizacaoId, organizacaoId)),
	});

	return hint ? AIHintSchema.parse(hint) : null;
}

export async function dismissHint({
	organizacaoId,
	hintId,
	userId,
}: {
	organizacaoId: string;
	hintId: string;
	userId: string;
}) {
	const [dismissedHint] = await db
		.update(aiHints)
		.set({
			status: "dismissed",
			descartadaPor: userId,
			dataDescarte: new Date(),
		})
		.where(and(eq(aiHints.id, hintId), eq(aiHints.organizacaoId, organizacaoId)))
		.returning();

	return dismissedHint ? AIHintSchema.parse(dismissedHint) : null;
}
