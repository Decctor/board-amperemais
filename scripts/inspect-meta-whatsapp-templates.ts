import "dotenv/config";
import axios from "axios";
import { listMetaWhatsappTemplates } from "@/lib/message-templates/channels/whatsapp/meta-client";
import type { TMetaTemplate, TMetaTemplateComponent } from "@/lib/message-templates/channels/whatsapp/types";

const GRAPH_API_BASE_URL = "https://graph.facebook.com/v23.0";
const EXPECTED_HANDOFF_TEMPLATE = {
	name: "service_transfer_notification",
	language: "pt_BR",
	category: "UTILITY",
	buttonUrl: "https://www.recompracrm.com.br/redirects?type=client-whatsapp&phone={{1}}",
	requiredNamedParameters: ["organizacao_nome", "cliente_nome", "cliente_telefone", "atendimento_detalhes"],
} as const;

type TPhoneNumberDetails = {
	id: string;
	display_phone_number?: string;
	verified_name?: string;
	quality_rating?: string;
	code_verification_status?: string;
};

function requireEnvironmentVariable(name: "META_ACCESS_TOKEN" | "META_WHATSAPP_BUSINESS_ACCOUNT_ID" | "META_WHATSAPP_PHONE_NUMBER_ID") {
	const value = process.env[name]?.trim();
	if (!value) throw new Error(`${name} não configurado no .env.`);
	return value;
}

function extractVariables(component: TMetaTemplateComponent): string[] {
	if (!component.text) return [];
	const variables = new Set<string>();
	for (const match of component.text.matchAll(/\{\{\s*([^{}]+?)\s*\}\}/g)) {
		variables.add(match[1].trim());
	}
	return [...variables];
}

function summarizeComponents(template: TMetaTemplate) {
	return template.components.map((component) => ({
		type: component.type,
		format: component.format ?? null,
		text: component.text ?? null,
		variables: extractVariables(component),
		buttons: component.buttons ?? [],
	}));
}

function inspectHandoffCompatibility(templates: TMetaTemplate[]) {
	const candidates = templates.filter(
		(template) => template.name === EXPECTED_HANDOFF_TEMPLATE.name && template.language === EXPECTED_HANDOFF_TEMPLATE.language,
	);

	if (candidates.length === 0) {
		return {
			compatible: false,
			reason: `O template ${EXPECTED_HANDOFF_TEMPLATE.name} (${EXPECTED_HANDOFF_TEMPLATE.language}) não existe na WABA.`,
		};
	}

	const approved = candidates.find((template) => template.status === "APPROVED");
	if (!approved) {
		return {
			compatible: false,
			reason: `O template existe, mas não está aprovado. Status encontrados: ${candidates.map((template) => template.status).join(", ")}.`,
		};
	}

	const body = approved.components.find((component) => component.type === "BODY");
	const variables = body ? extractVariables(body) : [];
	const missingVariables = EXPECTED_HANDOFF_TEMPLATE.requiredNamedParameters.filter((variable) => !variables.includes(variable));
	const whatsappButton = approved.components
		.find((component) => component.type === "BUTTONS")
		?.buttons?.find((button) => button.type === "URL" && button.url === EXPECTED_HANDOFF_TEMPLATE.buttonUrl);
	const compatible = missingVariables.length === 0 && Boolean(whatsappButton);

	return {
		compatible,
		reason: compatible
			? "Template aprovado, com todas as variáveis e botão dinâmico esperados pelo handoff."
			: [
					missingVariables.length > 0 ? `Variáveis nomeadas ausentes: ${missingVariables.join(", ")}.` : null,
					!whatsappButton ? `Botão dinâmico ${EXPECTED_HANDOFF_TEMPLATE.buttonUrl} ausente.` : null,
				]
					.filter(Boolean)
					.join(" "),
		templateId: approved.id,
		parameterFormat: approved.parameter_format ?? null,
		variables,
	};
}

async function getPhoneNumberDetails({ accessToken, phoneNumberId }: { accessToken: string; phoneNumberId: string }) {
	const response = await axios.get<TPhoneNumberDetails>(`${GRAPH_API_BASE_URL}/${phoneNumberId}`, {
		params: {
			fields: "id,display_phone_number,verified_name,quality_rating,code_verification_status",
		},
		headers: {
			Authorization: `Bearer ${accessToken}`,
		},
	});
	return response.data;
}

async function main() {
	const accessToken = requireEnvironmentVariable("META_ACCESS_TOKEN");
	const whatsappBusinessAccountId = requireEnvironmentVariable("META_WHATSAPP_BUSINESS_ACCOUNT_ID");
	const phoneNumberId = requireEnvironmentVariable("META_WHATSAPP_PHONE_NUMBER_ID");

	const [phone, templates] = await Promise.all([
		getPhoneNumberDetails({ accessToken, phoneNumberId }),
		listMetaWhatsappTemplates({
			accessToken,
			whatsappBusinessAccountId,
			fields: [
				"id",
				"name",
				"status",
				"category",
				"language",
				"parameter_format",
				"components",
				"quality_score",
				"rejected_reason",
			],
		}),
	]);

	const sortedTemplates = [...templates].sort(
		(left, right) => left.name.localeCompare(right.name) || left.language.localeCompare(right.language),
	);
	const statusCounts = Object.fromEntries(
		[...new Set(sortedTemplates.map((template) => template.status))]
			.sort()
			.map((status) => [status, sortedTemplates.filter((template) => template.status === status).length]),
	);
	const categoryCounts = Object.fromEntries(
		[...new Set(sortedTemplates.map((template) => template.category))]
			.sort()
			.map((category) => [category, sortedTemplates.filter((template) => template.category === category).length]),
	);
	const result = {
		checkedAt: new Date().toISOString(),
		wabaId: whatsappBusinessAccountId,
		phone,
		summary: {
			total: sortedTemplates.length,
			byStatus: statusCounts,
			byCategory: categoryCounts,
		},
		handoff: {
			expected: EXPECTED_HANDOFF_TEMPLATE,
			inspection: inspectHandoffCompatibility(sortedTemplates),
		},
		templates: sortedTemplates.map((template) => ({
			id: template.id,
			name: template.name,
			language: template.language,
			status: template.status,
			category: template.category,
			parameterFormat: template.parameter_format ?? null,
			quality: template.quality_score?.score ?? null,
			rejectedReason: template.rejected_reason ?? null,
			components: summarizeComponents(template),
		})),
	};

	if (process.argv.includes("--json")) {
		console.log(JSON.stringify(result, null, 2));
		return;
	}

	console.log(`Número: ${phone.display_phone_number ?? phone.id} (${phone.verified_name ?? "nome não informado"})`);
	console.log(`Qualidade: ${phone.quality_rating ?? "não informada"} | Verificação: ${phone.code_verification_status ?? "não informada"}`);
	console.log(`WABA: ${whatsappBusinessAccountId}`);
	console.log(`Templates: ${result.summary.total}`);
	console.log(`Por status: ${JSON.stringify(result.summary.byStatus)}`);
	console.log(`Por categoria: ${JSON.stringify(result.summary.byCategory)}`);
	console.log(`Handoff compatível: ${result.handoff.inspection.compatible ? "SIM" : "NÃO"}`);
	console.log(`Diagnóstico: ${result.handoff.inspection.reason}`);
	console.table(
		result.templates.map((template) => ({
			nome: template.name,
			idioma: template.language,
			status: template.status,
			categoria: template.category,
			formato: template.parameterFormat ?? "-",
			variaveis: template.components.flatMap((component) => component.variables).join(", ") || "-",
		})),
	);
}

void main().catch((error) => {
	const metaError = axios.isAxiosError(error) ? error.response?.data?.error : null;
	const message =
		(typeof metaError?.error_user_msg === "string" && metaError.error_user_msg) ||
		(typeof metaError?.message === "string" && metaError.message) ||
		(error instanceof Error ? error.message : "Erro desconhecido.");
	console.error(`[META_WHATSAPP_TEMPLATE_INSPECTION_ERROR] ${message}`);
	process.exit(1);
});
