import type { TMessageTemplateEntityLike } from "../../types";
import { buildWhatsappMetadataPatchFromMeta, extractWhatsappCategoryFromMeta, extractWhatsappContentFromMeta } from "./meta-status";
import type { TMetaTemplate } from "./types";

export type TWhatsappTemplateSyncPatch = {
	nome: string;
	categoria: TMessageTemplateEntityLike["categoria"];
	linguagem: string;
	conteudo: TMessageTemplateEntityLike["conteudo"];
	metadados: TMessageTemplateEntityLike["metadados"];
};

export function buildWhatsappTemplateSyncPatch({
	template,
	connectionId,
	metaTemplate,
	preserveLocalContent = true,
}: {
	template: TMessageTemplateEntityLike;
	connectionId: string;
	metaTemplate: TMetaTemplate;
	preserveLocalContent?: boolean;
}): TWhatsappTemplateSyncPatch {
	return {
		nome: metaTemplate.name,
		categoria: extractWhatsappCategoryFromMeta(metaTemplate),
		linguagem: metaTemplate.language || template.linguagem,
		conteudo: preserveLocalContent ? template.conteudo : extractWhatsappContentFromMeta(metaTemplate),
		metadados: buildWhatsappMetadataPatchFromMeta({
			currentMetadata: template.metadados,
			connectionId,
			metaTemplate,
		}),
	};
}
