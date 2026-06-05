import type { TMessageTemplateEntityLike, TMessageTemplatePhoneMetadata } from "../../types";
import { buildWhatsappMetadataPatchFromMeta, extractWhatsappCategoryFromMeta, extractWhatsappContentFromMetaWithLocalContext } from "./meta-status";
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
	alerta: string | null;
};

export function buildWhatsappTemplateSyncPatch({
	template,
	connectionId,
	metaTemplate,
}: {
	template: TMessageTemplateEntityLike;
	connectionId: string;
	metaTemplate: TMetaTemplate;
}): TWhatsappTemplateSyncPatch {
	const contentResult = extractWhatsappContentFromMetaWithLocalContext({
		metaTemplate,
		currentContent: template.conteudo,
	});

	return {
		nome: metaTemplate.name,
		categoria: extractWhatsappCategoryFromMeta(metaTemplate),
		linguagem: metaTemplate.language || template.linguagem,
		conteudo: contentResult.content,
		metadados: buildWhatsappMetadataPatchFromMeta({
			currentMetadata: template.metadados,
			connectionId,
			metaTemplate,
		}),
		alerta: contentResult.alerts.length > 0 ? contentResult.alerts.join("\n") : null,
	};
}
