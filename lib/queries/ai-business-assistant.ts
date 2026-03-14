import { useChat } from "@ai-sdk/react";

// ═══════════════════════════════════════════════════════════════
// ACTION CARD PARSING
// ═══════════════════════════════════════════════════════════════

export type TActionCardType = "campaign" | "cashback" | "insight";

export type TActionCard = {
	tipo: TActionCardType;
	titulo: string;
	descricao: string;
	dados: {
		clienteIds?: string[];
		mensagemSugerida?: string;
		descricao?: string;
		url?: string;
	};
};

const ACTION_CARD_REGEX = /```action-card\s*([\s\S]*?)```/;

export function parseActionCard(content: string): TActionCard | null {
	const match = content.match(ACTION_CARD_REGEX);
	if (!match) return null;
	try {
		return JSON.parse(match[1].trim()) as TActionCard;
	} catch {
		return null;
	}
}

export function stripActionCard(content: string): string {
	return content.replace(ACTION_CARD_REGEX, "").trim();
}

// ═══════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════

export function useAIBusinessAssistant() {
	return useChat({
		api: "/api/ai-business-assistant",
	});
}
