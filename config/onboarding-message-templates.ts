import { getDefaultMessageTemplateVariableExample, type TMessageTemplateNativeVariableId } from "@/lib/message-templates/variables";
import type { TMessageTemplateContent } from "@/schemas/message-templates";
import type { DBTransaction } from "@/services/drizzle";
import { messageTemplates } from "@/services/drizzle/schema";
import { sql } from "drizzle-orm";

/**
 * Onboarding message-template catalog.
 *
 * Historically the default campaigns referenced hardcoded template UUIDs that were never actually
 * seeded as per-org rows. This catalog fixes that gap: each template is defined with real WhatsApp
 * body content in two variants — one that talks about cashback (`COM_CASHBACK`) and one that does
 * not (`SEM_CASHBACK`) — so campaigns stay coherent whether or not the merchant runs a cashback
 * program. The campaigns onboarding step seeds the chosen variant as real `messageTemplates` rows.
 */
export type TOnboardingTemplateVariant = "COM_CASHBACK" | "SEM_CASHBACK";

export type TOnboardingMessageTemplateKey =
	| "primeira_compra"
	| "segunda_compra"
	| "presente_aniversario"
	| "recuperacao_clientes"
	| "cashback_expirando";

type TOnboardingMessageTemplateDefinition = {
	key: TOnboardingMessageTemplateKey;
	nome: string;
	/** When true, the template only exists in the cashback-aware variant (no SEM_CASHBACK copy). */
	cashbackOnly?: boolean;
	bodies: Record<TOnboardingTemplateVariant, { text: string; variables: TMessageTemplateNativeVariableId[] } | null>;
};

function buildContent(body: { text: string; variables: TMessageTemplateNativeVariableId[] }): TMessageTemplateContent {
	return {
		assunto: "",
		preheader: "",
		cabecalho: { tipo: "NENHUM" },
		corpo: {
			conteudo: body.text,
			parametros: body.variables.map((variable, index) => ({
				identificadorInterno: variable,
				identificadorExterno: String(index + 1),
				exemplo: getDefaultMessageTemplateVariableExample(variable),
			})),
		},
		rodape: "Responda esta mensagem se quiser falar com a nossa equipe.",
		botoes: [],
	};
}

const ONBOARDING_MESSAGE_TEMPLATES: TOnboardingMessageTemplateDefinition[] = [
	{
		key: "primeira_compra",
		nome: "recompracrm_primeira_compra",
		bodies: {
			COM_CASHBACK: {
				text: "Olá {{clientName}}! 🎉 Obrigado pela sua primeira compra com a gente. Você já começou a acumular: {{purchaseCashbackAccumulated}} de cashback para usar na próxima visita. Esperamos te ver de novo em breve!",
				variables: ["clientName", "purchaseCashbackAccumulated"],
			},
			SEM_CASHBACK: {
				text: "Olá {{clientName}}! 🎉 Obrigado pela sua primeira compra com a gente. Foi um prazer te atender e esperamos te ver de novo em breve. Qualquer coisa, é só chamar por aqui!",
				variables: ["clientName"],
			},
		},
	},
	{
		key: "segunda_compra",
		nome: "recompracrm_segunda_compra",
		bodies: {
			COM_CASHBACK: {
				text: "Oi {{clientName}}! Que bom ter você de volta. 💛 Nesta compra você acumulou {{purchaseCashbackAccumulated}} e seu saldo de cashback já é de {{cashbackAvailableBalance}}. Use quando quiser na sua próxima visita!",
				variables: ["clientName", "purchaseCashbackAccumulated", "cashbackAvailableBalance"],
			},
			SEM_CASHBACK: {
				text: "Oi {{clientName}}! Que bom ter você de volta. 💛 Obrigado por comprar com a gente de novo. Estamos sempre por aqui para o que você precisar!",
				variables: ["clientName"],
			},
		},
	},
	{
		key: "presente_aniversario",
		nome: "recompracrm_presente_aniversario",
		bodies: {
			COM_CASHBACK: {
				text: "Feliz aniversário, {{clientName}}! 🥳 Para comemorar, preparamos um presente: um cashback especial já está no seu saldo ({{cashbackAvailableBalance}}). Aproveite para se presentear com a gente!",
				variables: ["clientName", "cashbackAvailableBalance"],
			},
			SEM_CASHBACK: {
				text: "Feliz aniversário, {{clientName}}! 🥳 Desejamos um dia incrível para você. Passe na nossa loja para comemorar com a gente, vai ser um prazer te receber!",
				variables: ["clientName"],
			},
		},
	},
	{
		key: "recuperacao_clientes",
		nome: "recompracrm_recuperacao_clientes",
		bodies: {
			COM_CASHBACK: {
				text: "Oi {{clientName}}, sentimos a sua falta! 💛 Você tem {{cashbackAvailableBalance}} de cashback esperando por você. Que tal usar na sua próxima compra? Estamos te esperando!",
				variables: ["clientName", "cashbackAvailableBalance"],
			},
			SEM_CASHBACK: {
				text: "Oi {{clientName}}, sentimos a sua falta! 💛 Faz um tempo que não te vemos por aqui. Temos novidades esperando por você. Volte para a gente quando puder!",
				variables: ["clientName"],
			},
		},
	},
	{
		key: "cashback_expirando",
		nome: "recompracrm_cashback_expirando",
		cashbackOnly: true,
		bodies: {
			COM_CASHBACK: {
				text: "Oi {{clientName}}! ⏳ Você tem {{cashbackExpiringAmount}} de cashback que expira em {{cashbackExpiringDate}}. Não deixe esse valor ir embora: passe na loja e aproveite antes do prazo!",
				variables: ["clientName", "cashbackExpiringAmount", "cashbackExpiringDate"],
			},
			SEM_CASHBACK: null,
		},
	},
];

const ONBOARDING_MESSAGE_TEMPLATES_BY_KEY = new Map(ONBOARDING_MESSAGE_TEMPLATES.map((template) => [template.key, template]));

export function getOnboardingMessageTemplateName(key: TOnboardingMessageTemplateKey): string {
	const template = ONBOARDING_MESSAGE_TEMPLATES_BY_KEY.get(key);
	if (!template) throw new Error(`Template de onboarding desconhecido: ${key}`);
	return template.nome;
}

/** Resolves a human-readable preview of a template body for the given variant (variables → examples). */
export function getOnboardingTemplatePreview(key: TOnboardingMessageTemplateKey, variant: TOnboardingTemplateVariant): string | null {
	const body = ONBOARDING_MESSAGE_TEMPLATES_BY_KEY.get(key)?.bodies[variant];
	if (!body) return null;
	return body.variables.reduce((text, variable) => text.replaceAll(`{{${variable}}}`, getDefaultMessageTemplateVariableExample(variable)), body.text);
}

/**
 * Upserts the requested onboarding templates as per-org `messageTemplates` rows (idempotent on the
 * unique (organizacaoId, nome) index) and returns a `key -> templateId` map for the campaigns to
 * reference. Re-running with a different variant refreshes the body content.
 */
export async function seedOnboardingMessageTemplates({
	tx,
	organizationId,
	autorId,
	variant,
	keys,
}: {
	tx: DBTransaction;
	organizationId: string;
	autorId: string;
	variant: TOnboardingTemplateVariant;
	keys: TOnboardingMessageTemplateKey[];
}): Promise<Map<TOnboardingMessageTemplateKey, string>> {
	const definitions = keys
		.map((key) => ONBOARDING_MESSAGE_TEMPLATES_BY_KEY.get(key))
		.filter((definition): definition is TOnboardingMessageTemplateDefinition => {
			if (!definition) return false;
			// cashbackOnly templates have no SEM_CASHBACK body — skip them in that variant.
			return definition.bodies[variant] !== null;
		});

	const map = new Map<TOnboardingMessageTemplateKey, string>();
	if (definitions.length === 0) return map;

	const rows = definitions.map((definition) => {
		const body = definition.bodies[variant];
		if (!body) throw new Error(`Template ${definition.key} sem corpo para a variante ${variant}.`);
		return {
			organizacaoId: organizationId,
			autorId,
			nome: definition.nome,
			status: "RASCUNHO" as const,
			categoria: "MARKETING" as const,
			linguagem: "pt_BR",
			metadados: { porNumeroTelefone: {} },
			conteudo: buildContent(body),
		};
	});

	const upserted = await tx
		.insert(messageTemplates)
		.values(rows)
		.onConflictDoUpdate({
			target: [messageTemplates.organizacaoId, messageTemplates.nome],
			set: { conteudo: sql.raw("excluded.conteudo"), dataAtualizacao: new Date() },
		})
		.returning({ id: messageTemplates.id, nome: messageTemplates.nome });

	const idByNome = new Map(upserted.map((row) => [row.nome, row.id]));
	for (const definition of definitions) {
		const id = idByNome.get(definition.nome);
		if (id) map.set(definition.key, id);
	}
	return map;
}
