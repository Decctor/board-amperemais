import "dotenv/config";
import { createMetaWhatsappTemplate, listMetaWhatsappTemplates } from "@/lib/message-templates/channels/whatsapp/meta-client";

const TEMPLATE_NAME = "service_transfer_notification";

function requireEnvironmentVariable(name: "META_ACCESS_TOKEN" | "META_WHATSAPP_BUSINESS_ACCOUNT_ID") {
	const value = process.env[name]?.trim();
	if (!value) throw new Error(`${name} não configurado no .env.`);
	return value;
}

async function main() {
	const accessToken = requireEnvironmentVariable("META_ACCESS_TOKEN");
	const whatsappBusinessAccountId = requireEnvironmentVariable("META_WHATSAPP_BUSINESS_ACCOUNT_ID");
	const existingTemplates = await listMetaWhatsappTemplates({
		accessToken,
		whatsappBusinessAccountId,
		fields: ["id", "name", "status", "category", "language", "parameter_format", "components"],
	});
	const existing = existingTemplates.find((template) => template.name === TEMPLATE_NAME && template.language === "pt_BR");

	if (existing) {
		console.log(JSON.stringify({ created: false, reason: "Template já existe.", template: existing }, null, 2));
		return;
	}

	const created = await createMetaWhatsappTemplate({
		accessToken,
		whatsappBusinessAccountId,
		payload: {
			name: TEMPLATE_NAME,
			category: "utility",
			language: "pt_BR",
			parameter_format: "named",
			components: [
				{
					type: "BODY",
					text: `Novo atendimento transferido pela IA.

Organização: {{organizacao_nome}}
Cliente: {{cliente_nome}}
Telefone: {{cliente_telefone}}

Detalhes:
{{atendimento_detalhes}}

Toque no botão abaixo para conversar com o cliente.`,
					example: {
						body_text_named_params: [
							{ param_name: "organizacao_nome", example: "Loja Exemplo" },
							{ param_name: "cliente_nome", example: "João da Silva" },
							{ param_name: "cliente_telefone", example: "+55 34 99999-9999" },
							{
								param_name: "atendimento_detalhes",
								example: "Motivo: negociação comercial. Resumo: cliente deseja negociar o prazo de entrega do pedido 1234.",
							},
						],
					},
				},
				{
					type: "BUTTONS",
					buttons: [
						{
							type: "URL",
							text: "CONVERSAR NO WHATSAPP",
							url: "https://www.recompracrm.com.br/redirects?type=client-whatsapp&phone={{1}}",
							example: ["5534999999999"],
						},
					],
				},
			],
		},
	});

	console.log(JSON.stringify({ created: true, template: created }, null, 2));
}

void main().catch((error) => {
	console.error("[CREATE_SERVICE_TRANSFER_TEMPLATE_ERROR]", error instanceof Error ? error.message : error);
	process.exit(1);
});
