import { createAgentTemplateMediaUpload, uploadAgentTemplateMediaContent, validateAgentTemplateMedia } from "@/lib/message-templates/agent-media";
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
		`Cria uma URL assinada para upload direto de uma imagem JPEG/PNG de até 5 MB, para quando o arquivo passa de 3 MB ou você já tem a imagem hospedada. Exige que VOCÊ consiga fazer requisição ao host de armazenamento; se não conseguir, use upload_message_template_media, que recebe os bytes por aqui. Depois do upload, chame complete_message_template_media_upload. ${actor.mode === "PLATAFORMA" ? "Informe `organizacaoId` (id ou slug)." : ""}`,
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
 * Upload em uma etapa. É o caminho preferido: o cliente MCP não precisa alcançar o host de
 * armazenamento, só o próprio /api/mcp — ambientes de conector restringem a saída de rede a uma
 * allowlist, e o PUT direto na URL assinada volta 403 do proxy do cliente.
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
		nomeArquivo: z.string({ required_error: "Nome do arquivo não informado." }).min(1),
		mimeType: z.enum(["image/jpeg", "image/png"]),
		conteudoBase64: z.string({ required_error: "Conteúdo da imagem não informado." }).min(1),
	}),
	describe: (actor) =>
		`Envia uma imagem JPEG/PNG de até 3 MB em base64 e devolve o \`conteudoMidiaCaminho\` já validado, pronto para usar no cabeçalho de um template. Caminho preferido para anexar imagem: não exige acesso de rede ao armazenamento. Para arquivos maiores, use create_message_template_media_upload. ${actor.mode === "PLATAFORMA" ? "Informe `organizacaoId` (id ou slug)." : ""}`,
	execute: async (input, actor) => {
		const organizationId = await resolveOrganizationScope(actor, input.organizacaoId);
		await resolveResponsibleUser(actor, organizationId);
		return uploadAgentTemplateMediaContent({
			organizationId,
			fileName: input.nomeArquivo,
			mimeType: input.mimeType,
			conteudoBase64: input.conteudoBase64,
		});
	},
});
