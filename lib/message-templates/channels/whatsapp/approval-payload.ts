import type { TMessageTemplateEntityLike } from "../../types";
import { MESSAGE_TEMPLATE_CATEGORY_TO_META } from "./meta-maps";
import { buildWhatsappMetaTemplateComponents } from "./meta-components";
import type { TMetaCreateTemplatePayload } from "./types";

type BuildWhatsappTemplateApprovalPayloadParams = {
	template: TMessageTemplateEntityLike;
	organizationId: string;
	origin?: string;
};

export function buildWhatsappTemplateApprovalPayload({
	template,
	organizationId,
	origin,
}: BuildWhatsappTemplateApprovalPayloadParams): TMetaCreateTemplatePayload {
	return {
		name: template.nome,
		category: MESSAGE_TEMPLATE_CATEGORY_TO_META[template.categoria],
		language: template.linguagem,
		parameter_format: "positional",
		components: buildWhatsappMetaTemplateComponents({
			content: template.conteudo,
			origin,
			organizationId,
		}),
	};
}
