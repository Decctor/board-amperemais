import assert from "node:assert/strict";
import test from "node:test";
import { WHATSAPP_REPORT_TEMPLATES } from "./templates";

test("service transfer notification uses the global template contract and dynamic WhatsApp button", () => {
	const payload = WHATSAPP_REPORT_TEMPLATES.SERVICE_TRANSFER_NOTIFICATIONS.getPayload({
		templateKey: "SERVICE_TRANSFER_NOTIFICATIONS",
		toPhoneNumber: "+55 34 98888-7777",
		organizationName: "Loja Exemplo",
		clientName: "João da Silva",
		clientePhoneNumber: "(34) 99999-9999",
		serviceDescription: "Motivo: negociação. Resumo: cliente pediu atendimento humano.",
	}).data;

	assert.equal(payload.to, "5534988887777");
	assert.equal(payload.template.name, "service_transfer_notification");
	assert.deepEqual(payload.template.components[0], {
		type: "body",
		parameters: [
			{ type: "text", parameter_name: "organizacao_nome", text: "Loja Exemplo" },
			{ type: "text", parameter_name: "cliente_nome", text: "João da Silva" },
			{ type: "text", parameter_name: "cliente_telefone", text: "(34) 99999-9999" },
			{
				type: "text",
				parameter_name: "atendimento_detalhes",
				text: "Motivo: negociação. Resumo: cliente pediu atendimento humano.",
			},
		],
	});
	assert.deepEqual(payload.template.components[1], {
		type: "button",
		sub_type: "url",
		index: "0",
		parameters: [{ type: "text", text: "5534999999999" }],
	});
});
