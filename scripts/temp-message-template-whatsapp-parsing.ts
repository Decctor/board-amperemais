/**
 * Temp script — run with: npx tsx scripts/temp-message-template-whatsapp-parsing.ts
 *
 * Traces variable parsing through WhatsApp Meta approval payload and send payload builders.
 */
import { buildWhatsappTemplateApprovalPayload } from "../lib/message-templates/channels/whatsapp/approval-payload";
import { buildWhatsappMetaBodyComponent } from "../lib/message-templates/channels/whatsapp/meta-components";
import { buildWhatsappTemplateSendPayload } from "../lib/message-templates/channels/whatsapp/send-payload";
import { convertHtmlToWhatsappText } from "../lib/message-templates/formatting";
import {
	convertInternalVariablesToPositional,
	replaceMessageTemplateVariables,
	replaceMessageTemplateVariablesWithExamples,
} from "../lib/message-templates/parsing";
import type { TMessageTemplateEntityLike, TMessageTemplateRuntimeContext } from "../lib/message-templates/types";
import { MessageTemplateVariableExampleValues } from "../lib/message-templates/variables";
import type { TMessageTemplateContent } from "../schemas/message-templates";

const conteudo: TMessageTemplateContent = {
	assunto: "SEJA BEM-VINDO !",
	preheader: "Obrigado por comprar conosco !",
	cabecalho: { tipo: "NENHUM" },
	corpo: {
		conteudo:
			'<p>Oi, <span data-type="mention" class="mention" data-id="clientName" data-label="clientName" data-mention-suggestion-char="{">{{NOME DO CLIENTE}}</span> ! Obrigado(a) pela confiança na *Ampère Mais*. 🚀 Confirmamos o seu primeiro pedido! Tenho certeza que você vai adorar seus novos produtos. Se precisar de alguma dica de uso ou tiver dúvidas sobre os produtos, estou à disposição por aqui. Abraços, Aura !</p>',
		parametros: [
			{
				exemplo: "Lucas",
				identificadorExterno: "1",
				identificadorInterno: "clientName",
			},
		],
	},
	rodape: null,
	botoes: [],
};

const template: TMessageTemplateEntityLike = {
	nome: "boas_vindas_teste",
	categoria: "UTILIDADE",
	linguagem: "pt_BR",
	conteudo,
	metadados: { porNumeroTelefone: {} },
};

const runtimeContext: TMessageTemplateRuntimeContext = {
	origin: "http://localhost:3000",
	organizacaoId: "org-test",
	clienteId: "client-test",
	variaveis: {
		...MessageTemplateVariableExampleValues,
		clientName: "Lucas Silva",
	},
};

console.log("=== PATH A: Meta template submission (approval payload) ===\n");

console.log("Step 1 — convertHtmlToWhatsappText(html):");
const whatsappPlainText = convertHtmlToWhatsappText(conteudo.corpo.conteudo);
console.log(whatsappPlainText);

console.log("\nStep 2 — convertInternalVariablesToPositional(plainText, parametros):");
const positionalText = convertInternalVariablesToPositional(whatsappPlainText, conteudo.corpo.parametros);
console.log(positionalText);

console.log("\nStep 3 — buildWhatsappMetaBodyComponent (full Meta BODY component):");
console.log(JSON.stringify(buildWhatsappMetaBodyComponent(conteudo), null, 2));

console.log("\nStep 4 — buildWhatsappTemplateApprovalPayload (what goes to Meta API):");
console.log(JSON.stringify(buildWhatsappTemplateApprovalPayload({ template, organizationId: "org-test" }), null, 2));

console.log("\n=== PATH B: WhatsApp send payload (runtime message) ===\n");

console.log("Note: send payload does NOT re-parse body HTML. It uses template name + parametros order.\n");

const sendPayload = buildWhatsappTemplateSendPayload({
	template,
	toPhoneNumber: "11999999999",
	runtimeContext,
});
console.log(JSON.stringify(sendPayload, null, 2));

console.log("\n=== PATH C: Preview / reserved-interaction style ===\n");

console.log("Preview (convertHtmlToWhatsappText → replaceMessageTemplateVariablesWithExamples):");
console.log(replaceMessageTemplateVariablesWithExamples(whatsappPlainText, conteudo.corpo.parametros));

console.log("\nReserved interaction (replaceMessageTemplateVariables on HTML → convertHtmlToWhatsappText):");
console.log(convertHtmlToWhatsappText(replaceMessageTemplateVariables(conteudo.corpo.conteudo, runtimeContext.variaveis)));

console.log("\n=== CHECKS ===");
console.log(`Meta BODY has positional placeholder {{1}}: ${positionalText.includes("{{1}}")}`);
console.log(`Meta BODY still has unresolved {{NOME DO CLIENTE}}: ${positionalText.includes("{{NOME DO CLIENTE}}")}`);
console.log(`Meta BODY still has unresolved {{clientName}}: ${positionalText.includes("{{clientName}}")}`);
console.log(`Send payload includes body parameters: ${Boolean(sendPayload.template.components?.some((c) => c.type === "body"))}`);
