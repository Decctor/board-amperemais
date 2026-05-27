import type { TMessageTemplateEntityLike, TMessageTemplatePhoneMetadata } from "../../types";
import { buildWhatsappMetadataPatchFromMeta, extractWhatsappCategoryFromMeta, extractWhatsappContentFromMeta } from "./meta-status";
import type { TMetaTemplate } from "./types";

export type TRemoteTemplateIndexes = {
	byId: Map<string, TMetaTemplate>;
	templates: TMetaTemplate[];
};

export function buildRemoteTemplateIndexes(remoteTemplates: TMetaTemplate[]): TRemoteTemplateIndexes {
	return {
		byId: new Map(remoteTemplates.map((template) => [template.id, template])),
		templates: remoteTemplates,
	};
}

export function resolveRemoteTemplate({
	indexes,
	template,
	metadataForPhone,
}: {
	indexes: TRemoteTemplateIndexes;
	template: Pick<TMessageTemplateEntityLike, "nome" | "linguagem">;
	metadataForPhone?: TMessageTemplatePhoneMetadata | null;
}): TMetaTemplate | null {
	if (metadataForPhone?.idExterno) {
		const byId = indexes.byId.get(metadataForPhone.idExterno);
		if (byId) return byId;
	}

	return indexes.templates.find((remote) => remote.name === template.nome && remote.language === template.linguagem) ?? null;
}

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
