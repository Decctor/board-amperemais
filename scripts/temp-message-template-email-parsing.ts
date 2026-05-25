/**
 * Temp script — run with: npx tsx scripts/temp-message-template-email-parsing.ts
 */
import { convertHtmlToEmailHtml } from "../lib/message-templates/formatting";
import { replaceMessageTemplateVariables } from "../lib/message-templates/parsing";
import { MessageTemplateVariableExampleValues } from "../lib/message-templates/variables";

const html =
	'<p>Oi, <span data-type="mention" class="mention" data-id="clientName" data-label="clientName" data-mention-suggestion-char="{">{{NOME DO CLIENTE}}</span> ! Obrigado(a) pela confiança na *Ampère Mais*. 🚀 Confirmamos o seu primeiro pedido!</p>';

const variables = {
	...MessageTemplateVariableExampleValues,
	clientName: "Lucas Fernandes Leite dos Santos",
};

const resolvedHtml = replaceMessageTemplateVariables(html, variables);
const emailHtml = convertHtmlToEmailHtml(resolvedHtml);

console.log("=== Resolved HTML ===\n");
console.log(resolvedHtml);
console.log("\n=== Email HTML (convertHtmlToEmailHtml) ===\n");
console.log(emailHtml);
console.log("\n=== Checks ===");
console.log(`Contains <strong>Ampère Mais</strong>: ${emailHtml.includes("<strong>Ampère Mais</strong>")}`);
console.log(`Contains literal *Ampère Mais*: ${emailHtml.includes("*Ampère Mais*")}`);
console.log(`Contains resolved client name: ${emailHtml.includes("Lucas Fernandes Leite dos Santos")}`);
