import { AI_AGENT_MODEL_CATALOG, type TAiAgentModelCatalogEntry } from "@/lib/ai/providers/model-catalog";
import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { gateway } from "ai";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";

// ============================================================================
// SERVICES
// ============================================================================

/** Preço do Gateway vem por token em string; a UI trabalha por 1 milhão de tokens. */
function toPricePerMillion(value: string | undefined): number | null {
	if (!value) return null;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed * 1_000_000 : null;
}

type TGatewayModelPricing = { precoEntrada: number | null; precoSaida: number | null };

/**
 * Preços correntes no AI Gateway, indexados por id de modelo. A presença da chave também é a
 * prova de que o Gateway serve aquele modelo.
 *
 * Best-effort de propósito: a tela de configuração não pode quebrar porque a consulta de
 * metadados do Gateway falhou. Sem ela, a UI mostra os preços de referência do catálogo.
 */
async function getGatewayPricingById(): Promise<Map<string, TGatewayModelPricing> | null> {
	try {
		const { models } = await gateway.getAvailableModels();
		return new Map(
			models.map((model) => [model.id, { precoEntrada: toPricePerMillion(model.pricing?.input), precoSaida: toPricePerMillion(model.pricing?.output) }]),
		);
	} catch (error) {
		console.error("[ERROR] [AI_AGENT] Falha ao consultar os modelos do AI Gateway:", error);
		return null;
	}
}

function mergeCatalogEntry(entry: TAiAgentModelCatalogEntry, live: TGatewayModelPricing | undefined) {
	return {
		...entry,
		// Preço do Gateway tem precedência; o do catálogo é referência conferida na curadoria.
		precoEntrada: live?.precoEntrada ?? entry.precoEntrada,
		precoSaida: live?.precoSaida ?? entry.precoSaida,
	};
}

async function getAiAgentModels() {
	const pricingById = await getGatewayPricingById();

	// Modelo que o Gateway não serve mais sai da lista — não faz sentido oferecer o que não roda.
	// Sem metadados não há como saber o que foi descontinuado: mantemos o catálogo inteiro em vez
	// de esconder opções válidas.
	const catalog = pricingById ? AI_AGENT_MODEL_CATALOG.filter((entry) => pricingById.has(entry.id)) : AI_AGENT_MODEL_CATALOG;
	const modelos = catalog.map((entry) => mergeCatalogEntry(entry, pricingById?.get(entry.id)));

	return {
		data: {
			modelos,
			// A UI avisa que os valores são de referência quando o Gateway não respondeu.
			precosAtualizados: pricingById !== null,
		},
		message: "Modelos disponíveis carregados com sucesso.",
	};
}
export type TGetAiAgentModelsOutput = Awaited<ReturnType<typeof getAiAgentModels>>;

// ============================================================================
// HANDLERS
// ============================================================================

async function getAiAgentModelsRoute(_request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session?.membership) throw new createHttpError.Unauthorized("Sessão não encontrada.");
	if (!session.membership.organizacao.configuracao?.recursos?.iaAtendimento?.acesso) {
		throw new createHttpError.Forbidden("O recurso de atendimento com IA não está disponível no plano da sua organização.");
	}
	if (!session.membership.permissoes.empresa.editar) {
		throw new createHttpError.Forbidden("Você não tem permissão para configurar o agente de IA.");
	}

	const result = await getAiAgentModels();
	return NextResponse.json(result);
}

export const GET = appApiHandler({ GET: getAiAgentModelsRoute });
