"use server";

import { db } from "@/services/drizzle";

export async function getMessageTemplateById({ templateId, organizationId }: { templateId: string | null; organizationId: string }) {
	if (!templateId || !organizationId) return null;
	const template = await db.query.messageTemplates.findFirst({
		where: (fields, { and, eq }) => and(eq(fields.id, templateId), eq(fields.organizacaoId, organizationId)),
	});
	if (!template) throw new Error("Template não encontrado.");
	return template;
}
export type TGetBuilderMessageTemplateById = Awaited<ReturnType<typeof getMessageTemplateById>>;
