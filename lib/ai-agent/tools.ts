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
	inputSchema: z.object({
		clientId: z.string().describe("ID do cliente no banco de dados"),
		limit: z.number().optional().default(10).describe("Número máximo de compras a retornar (padrão: 10)"),
		startDate: z.string().optional().describe("Data inicial para filtrar compras (formato ISO: YYYY-MM-DD)"),
		endDate: z.string().optional().describe("Data final para filtrar compras (formato ISO: YYYY-MM-DD)"),
	}),
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
	inputSchema: z.object({
		clientId: z.string().describe("ID do cliente no banco de dados"),
	}),
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
	inputSchema: z.object({
		clientId: z.string().describe("ID do cliente no banco de dados"),
		limit: z.number().optional().default(5).describe("Número de compras recentes a retornar (padrão: 5)"),
	}),
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
	inputSchema: z.object({
		query: z.string().min(2).describe("Termo de busca (nome, descrição ou características do produto)"),
		limit: z.number().optional().default(10).describe("Número máximo de produtos a retornar (padrão: 10)"),
	}),
	execute: async ({ query, limit }) => {
		const response = await searchProducts(query, limit);
		console.log("[INFO] [TOOLS] [SEARCH_PRODUCTS] Response:", response);
		return response;
	},
});

export const getProductsByGroupTool = tool({
	description: `Lista produtos de uma categoria/grupo específico. Use para:
- Mostrar todos os produtos de uma categoria
- Explorar o catálogo por tipo
- Oferecer opções dentro de uma categoria
Exemplo de grupos: "CABOS E FIOS", "DISJUNTORES", "ILUMINAÇÃO", etc.`,
	inputSchema: z.object({
		group: z.string().describe("Nome do grupo/categoria de produtos"),
		limit: z.number().optional().default(15).describe("Número máximo de produtos a retornar (padrão: 15)"),
	}),
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
	inputSchema: z.object({
		code: z.string().describe("Código do produto"),
	}),
	execute: async ({ code }) => {
		const response = await getProductByCode(code);
		console.log("[INFO] [TOOLS] [GET_PRODUCT_BY_CODE] Response:", response);
		return response;
	},
});

export const getAvailableProductGroupsTool = tool({
	description: `Lista todas as categorias/grupos de produtos disponíveis no catálogo. Use para:
- Mostrar ao cliente as categorias disponíveis
- Ajudar o cliente a navegar pelo catálogo
- Quando o cliente perguntar "o que vocês vendem?"`,

	inputSchema: z.object({}),
	execute: async () => {
		const response = await getAvailableProductGroups();
		console.log("[INFO] [TOOLS] [GET_AVAILABLE_PRODUCT_GROUPS] Response:", response);
		return response;
	},
});

// ============================================================================
// Service Management Tools
// ============================================================================

export const createServiceTicketTool = tool({
	description: `Cria um ticket de atendimento para acompanhamento. Use quando:
- Cliente relata um problema que precisa follow-up
- Cliente solicita um orçamento
- Cliente pede informações que requerem consulta
- Cliente expressa necessidade que precisa ação da equipe (visita, agendamento, etc)
SEMPRE crie um ticket para garantir que a solicitação seja acompanhada.`,
	inputSchema: z.object({
		chatId: z.string().describe("ID do chat/conversa atual"),
		clientId: z.string().describe("ID do cliente no banco de dados"),
		description: z.string().describe("Descrição clara e detalhada do atendimento (inclua contexto importante da conversa)"),
	}),
	execute: async ({ chatId, clientId, description }) => {
		// Return metadata that will be processed by the Convex action
		return {
			success: true,
			action: "create_ticket",
			data: {
				chatId,
				clientId,
				description,
			},
			message: "Ticket de atendimento será criado. Continue a conversa informando o cliente.",
		};
	},
});

export const transferToHumanTool = tool({
	description: `Transfere o atendimento para um atendente humano. Use IMEDIATAMENTE quando:
- Cliente solicita falar com uma pessoa
- Detecta reclamação ou insatisfação
- Negociação de preços/descontos
- Questão técnica complexa ou de segurança
- Problema com pedido/entrega
- Qualquer situação que exija julgamento humano
NÃO pergunte ao cliente se ele quer transferir - apenas transfira quando apropriado.`,
	inputSchema: z.object({
		reason: z.string().describe("Motivo da transferência (para contexto da equipe de atendimento)"),
		chatId: z.string().describe("ID do chat/conversa atual"),
		clientId: z.string().describe("ID do cliente"),
		conversationSummary: z.string().describe("Resumo breve da conversa até o momento (2-3 frases)"),
	}),
	execute: async ({ reason, chatId, clientId, conversationSummary }) => {
		// This will be handled by the agent handler to create a ticket and mark for human
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
	create_service_ticket: createServiceTicketTool,
	transfer_to_human: transferToHumanTool,
};
