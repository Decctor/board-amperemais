import { WhatsappTemplateVariables } from "@/lib/whatsapp/template-variables";

export const MessageTemplateNativeVariables = WhatsappTemplateVariables.map((variable) => ({
	identificador: variable.value,
	label: variable.label,
	description: variable.description,
	contexto: variable.contexto,
	metaId: variable.id,
}));

export type TMessageTemplateNativeVariable = (typeof MessageTemplateNativeVariables)[number];
export type TMessageTemplateNativeVariableId = TMessageTemplateNativeVariable["identificador"];

export const MessageTemplateNativeVariablesById = new Map<string, TMessageTemplateNativeVariable>(
	MessageTemplateNativeVariables.map((variable) => [variable.identificador, variable]),
);

export const MessageTemplateVariableExampleValues: Record<string, string> = {
	clientName: "Lucas",
	clientPhoneNumber: "(11) 99999-9999",
	clientEmail: "lucas@exemplo.com",
	clientSegmentation: "Cliente VIP",
	clientFavoriteProduct: "Cappuccino",
	clientFavoriteProductGroup: "Cafés especiais",
	clientSuggestedProduct: "Croissant artesanal",
	purchaseValue: "R$ 120,00",
	purchaseCashbackAccumulated: "R$ 12,00",
	purchaseCashbackNewBalance: "R$ 42,00",
	purchaseSellerName: "Mariana",
	cashbackAvailableBalance: "R$ 42,00",
	cashbackLifetimeAccumulated: "R$ 180,00",
	cashbackLifetimeRedeemed: "R$ 138,00",
	cashbackExpiringAmount: "R$ 10,00",
	cashbackExpiringDate: "27/05/2026",
};

export function isAllowedMessageTemplateVariable(identifier: string) {
	return MessageTemplateNativeVariablesById.has(identifier);
}

export function getMessageTemplateVariable(identifier: string) {
	return MessageTemplateNativeVariablesById.get(identifier) ?? null;
}

export function getDefaultMessageTemplateVariableExample(identifier: string) {
	return MessageTemplateVariableExampleValues[identifier] ?? "Exemplo";
}
