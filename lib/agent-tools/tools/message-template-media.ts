import { createAgentTemplateMediaUpload, validateAgentTemplateMedia } from "@/lib/message-templates/agent-media";
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
		`Cria uma URL assinada para upload direto de uma imagem JPEG/PNG de até 5 MB. Depois do upload, chame complete_message_template_media_upload. ${actor.mode === "PLATAFORMA" ? "Informe `organizacaoId` (id ou slug)." : ""}`,
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
		`Confirma e valida os bytes da imagem enviada, retornando o caminho que pode ser usado nas mutações de template. ${actor.mode === "PLATAFORMA" ? "Informe `organizacaoId` (id ou slug)." : ""}`,
	execute: async (input, actor) => {
		const organizationId = await resolveOrganizationScope(actor, input.organizacaoId);
		await resolveResponsibleUser(actor, organizationId);
		return validateAgentTemplateMedia({ organizationId, storagePath: input.conteudoMidiaCaminho });
	},
});
