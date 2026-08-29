import {
	createAgentTemplateMediaUpload,
	uploadAgentTemplateMediaContent,
	uploadAgentTemplateMediaFromUrl,
	validateAgentTemplateMedia,
} from "@/lib/message-templates/agent-media";
import createHttpError from "http-errors";
import z from "zod";
import { resolveOrganizationScope, resolveResponsibleUser } from "../organization-scope";
import { AgentMutationControlInputSchema, defineAgentTool } from "../types";

const OrganizationInputSchema = z.object({
	organizacaoId: z.string({ invalid_type_error: "Tipo inválido para o id da organização." }).optional().nullable(),
});

export const createMessageTemplateMediaUploadTool = defineAgentTool({
	name: "create_message_template_media_upload",
	title: "Preparar upload de imagem de template",
	scopes: ["agent:message-template-media:write"],
	modes: ["ORG", "PLATAFORMA"],
	requiresResponsibleUser: true,
	mutates: true,
	externalEffect: true,
	inputSchema: OrganizationInputSchema.merge(AgentMutationControlInputSchema).extend({
		nomeArquivo: z.string({ required_error: "Nome do arquivo não informado." }).min(1),
		mimeType: z.enum(["image/jpeg", "image/png"]),
		tamanhoBytes: z
			.number({ required_error: "Tamanho do arquivo não informado." })
			.int()
			.positive()
			.max(5 * 1024 * 1024),
	}),
	describe: (actor) =>
		`Cria uma URL assinada para upload direto de uma imagem JPEG/PNG de até 5 MB. Último recurso: prefira upload_message_template_media com \`conteudoUrl\` (ou \`conteudoBase64\` para arquivo local pequeno). Exige que VOCÊ consiga fazer requisição ao host de armazenamento, o que ambientes de conector costumam bloquear. Depois do upload, chame complete_message_template_media_upload. ${actor.mode === "PLATAFORMA" ? "Informe `organizacaoId` (id ou slug)." : ""}`,
	execute: async (input, actor) => {
		const organizationId = await resolveOrganizationScope(actor, input.organizacaoId);
		await resolveResponsibleUser(actor, organizationId);
		return createAgentTemplateMediaUpload({
			organizationId,
			fileName: input.nomeArquivo,
			mimeType: input.mimeType,
			fileSize: input.tamanhoBytes,
		});
	},
});

export const completeMessageTemplateMediaUploadTool = defineAgentTool({
	name: "complete_message_template_media_upload",
	title: "Validar upload de imagem de template",
	scopes: ["agent:message-template-media:write"],
	modes: ["ORG", "PLATAFORMA"],
	requiresResponsibleUser: true,
	mutates: true,
	externalEffect: true,
	inputSchema: OrganizationInputSchema.merge(AgentMutationControlInputSchema).extend({
		conteudoMidiaCaminho: z.string({ required_error: "Caminho da mídia não informado." }).min(1),
	}),
	describe: (actor) =>
		`Confirma e valida os bytes enviados pela URL assinada de create_message_template_media_upload, retornando o caminho usado nas mutações de template. Não é necessário depois de upload_message_template_media, que já devolve o caminho validado. ${actor.mode === "PLATAFORMA" ? "Informe `organizacaoId` (id ou slug)." : ""}`,
	execute: async (input, actor) => {
		const organizationId = await resolveOrganizationScope(actor, input.organizacaoId);
		await resolveResponsibleUser(actor, organizationId);
		return validateAgentTemplateMedia({ organizationId, storagePath: input.conteudoMidiaCaminho });
	},
});

/**
 * Upload em uma etapa, com duas entradas: `conteudoUrl` (o servidor baixa; preferida) ou
 * `conteudoBase64` (os bytes vêm na chamada; só para arquivos pequenos).
 *
 * É o caminho preferido sobre a URL assinada porque o cliente MCP não precisa alcançar o host de
 * armazenamento, só o próprio /api/mcp — ambientes de conector restringem a saída de rede a uma
 * allowlist, e o PUT direto na URL assinada volta 403 do proxy do cliente. E `conteudoUrl` é
 * preferida sobre o base64 porque argumentos de ferramenta são texto que o modelo gera token a
 * token: uma URL custa dezenas de tokens; uma imagem de 1 MB em base64 custa centenas de milhares
 * e estoura o timeout do cliente antes de a chamada chegar ao servidor.
 */
export const uploadMessageTemplateMediaTool = defineAgentTool({
	name: "upload_message_template_media",
	title: "Enviar imagem de template",
	scopes: ["agent:message-template-media:write"],
	modes: ["ORG", "PLATAFORMA"],
	requiresResponsibleUser: true,
	mutates: true,
	externalEffect: true,
	inputSchema: OrganizationInputSchema.merge(AgentMutationControlInputSchema).extend({
		conteudoUrl: z
			.string({ invalid_type_error: "Tipo inválido para a URL da imagem." })
			.optional()
			.nullable()
			.describe("URL https pública da imagem. O servidor baixa os bytes — caminho preferido, muito mais rápido que base64."),
		conteudoBase64: z
			.string({ invalid_type_error: "Tipo inválido para o conteúdo da imagem." })
			.optional()
			.nullable()
			.describe("Bytes da imagem em base64. Só para arquivos pequenos (até ~200 KB) que não estão hospedados em lugar nenhum."),
		nomeArquivo: z.string({ invalid_type_error: "Tipo inválido para o nome do arquivo." }).optional().nullable(),
		mimeType: z.enum(["image/jpeg", "image/png"]).optional().nullable(),
	}),
	describe: (actor) =>
		`Envia uma imagem JPEG/PNG (até 5 MB) e devolve o \`conteudoMidiaCaminho\` já validado, pronto para usar no cabeçalho de um template. Informe \`conteudoUrl\` de uma imagem pública https (preferido: o servidor baixa os bytes) OU \`conteudoBase64\` para um arquivo pequeno que só existe localmente (gerar base64 é lento; evite acima de ~200 KB, máximo 3 MB). ${actor.mode === "PLATAFORMA" ? "Informe `organizacaoId` (id ou slug)." : ""}`,
	execute: async (input, actor) => {
		const organizationId = await resolveOrganizationScope(actor, input.organizacaoId);
		await resolveResponsibleUser(actor, organizationId);
		if (input.conteudoUrl && input.conteudoBase64) {
			throw new createHttpError.BadRequest("Informe `conteudoUrl` OU `conteudoBase64`, não os dois.");
		}
		if (input.conteudoUrl) {
			return uploadAgentTemplateMediaFromUrl({ organizationId, fileName: input.nomeArquivo, url: input.conteudoUrl });
		}
		if (!input.conteudoBase64) {
			throw new createHttpError.BadRequest("Informe `conteudoUrl` (imagem hospedada) ou `conteudoBase64` (bytes do arquivo).");
		}
		return uploadAgentTemplateMediaContent({
			organizationId,
			fileName: input.nomeArquivo?.trim() || "imagem",
			mimeType: input.mimeType,
			conteudoBase64: input.conteudoBase64,
		});
	},
});
