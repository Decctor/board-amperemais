import { tool } from "ai";
import z from "zod";
import {
	getAvailableProductGroups,
	getCustomerPurchaseHistory,
	getCustomerPurchaseInsights,
	getCustomerRecentPurchases,
	getProductByCode,
	getProductsByGroup,
	searchProducts,
} from "./database-tools";
import { transferServiceToHuman } from "./transfer-service-to-human";

// ============================================================================
// Customer Purchase History Tools
// ============================================================================

export const getCustomerPurchaseHistoryTool = tool({
	description: `Consulta o histórico completo de compras de um cliente. Use para:
- Ver todas as compras anteriores do cliente
- Identificar padrões de compra
- Entender preferências de produtos
- Recomendar produtos baseado em histórico
Retorna lista de vendas com produtos, valores e datas.`,
	inputSchema: z
		.object({
			clientId: z.string().describe("ID do cliente no banco de dados"),
			limit: z.number().optional().default(10).describe("Número máximo de compras a retornar (padrão: 10)"),
			startDate: z.string().optional().describe("Data inicial para filtrar compras (formato ISO: YYYY-MM-DD)"),
			endDate: z.string().optional().describe("Data final para filtrar compras (formato ISO: YYYY-MM-DD)"),
		})
		.strict(),
	execute: async ({ clientId, limit, startDate, endDate }) => {
		const options: {
			limit?: number;
			startDate?: Date;
			endDate?: Date;
		} = { limit };

		if (startDate) options.startDate = new Date(startDate);
		if (endDate) options.endDate = new Date(endDate);

		const response = await getCustomerPurchaseHistory(clientId, options);
		console.log("[INFO] [TOOLS] [GET_CUSTOMER_PURCHASE_HISTORY] Response:", response);
		return response;
	},
});

export const getCustomerInsightsTool = tool({
	description: `Obtém insights detalhados sobre o perfil e comportamento de compra do cliente. Use para:
- Ver análise RFM (Recência, Frequência, Valor Monetário) do cliente
- Conhecer estatísticas de compra (total gasto, ticket médio, frequência)
- Identificar produtos e categorias favoritas
- Personalizar o atendimento baseado no valor do cliente
SEMPRE use esta ferramenta no início da conversa para entender o perfil do cliente.`,
	inputSchema: z
		.object({
			clientId: z.string().describe("ID do cliente no banco de dados"),
		})
		.strict(),
	execute: async ({ clientId }) => {
		const response = await getCustomerPurchaseInsights(clientId);
		console.log("[INFO] [TOOLS] [GET_CUSTOMER_INSIGHTS] Response:", response);
		return response;
	},
});

export const getCustomerRecentPurchasesTool = tool({
	description: `Busca as compras mais recentes do cliente de forma resumida. Use para:
- Ver rapidamente o que o cliente comprou ultimamente
- Identificar necessidades recorrentes
- Sugerir reposições de produtos
Mais rápido que o histórico completo, ideal para contexto rápido.`,
	inputSchema: z
		.object({
			clientId: z.string().describe("ID do cliente no banco de dados"),
			limit: z.number().optional().default(5).describe("Número de compras recentes a retornar (padrão: 5)"),
		})
		.strict(),
	execute: async ({ clientId, limit }) => {
		const response = await getCustomerRecentPurchases(clientId, limit);
		console.log("[INFO] [TOOLS] [GET_CUSTOMER_RECENT_PURCHASES] Response:", response);
		return response;
	},
});

// ============================================================================
// Product Catalog Tools
// ============================================================================

export const searchProductsTool = tool({
	description: `Busca produtos no catálogo por nome/descrição. Use para:
- Encontrar produtos que o cliente está procurando
- Verificar se um produto existe no catálogo
- Listar opções disponíveis
- Responder "vocês têm X?"
Faça busca por palavras-chave (ex: "disjuntor", "fio 2.5mm", "lampada led").`,
	inputSchema: z
		.object({
			query: z.string().min(2).describe("Termo de busca (nome, descrição ou características do produto)"),
			limit: z.number().optional().default(10).describe("Número máximo de produtos a retornar (padrão: 10)"),
		})
		.strict(),
	execute: async ({ query, limit }) => {
		const response = await searchProducts(query, limit);
		console.log("[INFO] [TOOLS] [SEARCH_PRODUCTS] Response:", response);
		return response;
	},
});

export const getAvailableProductGroupsTool = tool({
	description: `Lista todas as categorias/grupos de produtos disponíveis no catálogo. Use SEMPRE PRIMEIRO quando:
- Cliente quer ver o catálogo por categoria
- Cliente pergunta "o que vocês vendem?"
- Você precisa buscar produtos por grupo

IMPORTANTE: Chame esta ferramenta ANTES de usar get_products_by_group para garantir que você está usando o nome exato do grupo!`,
	inputSchema: z.object({}).strict(),
	execute: async () => {
		const response = await getAvailableProductGroups();
		console.log("[INFO] [TOOLS] [GET_AVAILABLE_PRODUCT_GROUPS] Response:", response);
		return response;
	},
});

export const getProductsByGroupTool = tool({
	description: `Lista produtos de uma categoria/grupo específico. Use para:
- Mostrar todos os produtos de uma categoria
- Explorar o catálogo por tipo
- Oferecer opções dentro de uma categoria

⚠️ IMPORTANTE: SEMPRE chame get_available_product_groups PRIMEIRO para obter o nome exato do grupo!
Usar o nome exato é crítico para evitar que nenhum produto seja retornado.`,
	inputSchema: z
		.object({
			group: z.string().describe("Nome do grupo/categoria de produtos (DEVE ser o nome exato retornado por get_available_product_groups)"),
			limit: z.number().optional().default(15).describe("Número máximo de produtos a retornar (padrão: 15)"),
		})
		.strict(),
	execute: async ({ group, limit }) => {
		const response = await getProductsByGroup(group, limit);
		console.log("[INFO] [TOOLS] [GET_PRODUCTS_BY_GROUP] Response:", response);
		return response;
	},
});

export const getProductByCodeTool = tool({
	description: `Busca um produto específico pelo código. Use quando:
- Cliente menciona um código de produto
- Precisa de informações detalhadas de um produto específico
- Cliente já conhece o código do que quer`,
	inputSchema: z
		.object({
			code: z.string().describe("Código do produto"),
		})
		.strict(),
	execute: async ({ code }) => {
		const response = await getProductByCode(code);
		console.log("[INFO] [TOOLS] [GET_PRODUCT_BY_CODE] Response:", response);
		return response;
	},
});

// ============================================================================
// Service Management Tools
// ============================================================================

export const transferToHumanTool = tool({
	description: `⚠️ FERRAMENTA CRÍTICA - Transfere o atendimento para um atendente humano.

🔴 CHAME ESTA FERRAMENTA IMEDIATAMENTE quando o cliente mencionar:

PREÇOS E VENDAS (sempre transferir):
- "preço", "quanto custa", "valor", "cotação"
- "comprar", "fechar pedido", "finalizar", "confirmar orçamento"
- "desconto", "promoção", "negociar"
- "orçamento" ou "proposta"

PAGAMENTO E FINANCEIRO (sempre transferir):
- "pagamento", "parcelamento", "financiamento"
- "crédito", "forma de pagamento", "prazo"
- "boleto", "pix", "cartão"

PEDIDOS GRANDES (sempre transferir):
- "volume", "atacado", "lote", "quantidade grande"
- Pedidos acima de 50 unidades

LOGÍSTICA (sempre transferir):
- "entrega", "prazo de entrega", "frete"
- "envio", "logística"
- Agendamento de entregas

TÉCNICO COMPLEXO (transferir se complexo):
- Cálculos de dimensionamento elétrico
- Especificações técnicas muito detalhadas
- Questões de segurança (NR10, NBR)

PROBLEMAS E RECLAMAÇÕES (sempre transferir):
- Reclamações sobre produtos/serviços
- Problemas com entregas ou pedidos
- Devoluções, trocas, garantias
- Insatisfação detectada

SOLICITAÇÃO DIRETA (sempre transferir):
- Cliente pede "falar com atendente/pessoa/humano"
- Cliente pede "gerente" ou "supervisor"

⚠️ IMPORTANTE: NÃO pergunte ao cliente se ele quer transferir - APENAS TRANSFIRA imediatamente e informe de forma gentil.`,
	inputSchema: z
		.object({
			reason: z.string().describe("Motivo da transferência (para contexto da equipe de atendimento)"),
			chatId: z.string().describe("ID do chat/conversa atual"),
			clientId: z.string().describe("ID do cliente"),
			conversationSummary: z.string().describe("Resumo breve da conversa até o momento (2-3 frases)"),
		})
		.strict(),
	execute: async ({ reason, chatId, clientId, conversationSummary }) => {
		// This will be handled by the agent handler to create a ticket and mark for human
		console.log("[INFO] [TOOLS] [TRANSFER_TO_HUMAN] Transferring service to human", {
			reason,
			chatId,
			clientId,
			conversationSummary,
		});
		// O cliente vem do próprio chat; passá-lo aqui abria espaço para divergência.
		await transferServiceToHuman({
			chatId,
			reason,
			conversationSummary,
		});
		return {
			success: true,
			action: "transfer_to_human",
			data: {
				reason,
				chatId,
				clientId,
				conversationSummary,
			},
		};
	},
});

// Export all tools as a single object for easy integration
export const agentTools = {
	get_customer_purchase_history: getCustomerPurchaseHistoryTool,
	get_customer_insights: getCustomerInsightsTool,
	get_customer_recent_purchases: getCustomerRecentPurchasesTool,
	search_products: searchProductsTool,
	get_products_by_group: getProductsByGroupTool,
	get_product_by_code: getProductByCodeTool,
	get_available_product_groups: getAvailableProductGroupsTool,
	transfer_to_human: transferToHumanTool,
};
