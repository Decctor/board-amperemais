import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

import { appApiHandler } from "@/lib/app-api";
import { parseWhatsappTemplateIntoMessageTemplate } from "@/lib/message-templates";
import { db } from "@/services/drizzle";
import { messageTemplates } from "@/services/drizzle/schema";

async function migrateWhatsappTemplatesToMessageTemplates({ persist }: { persist: boolean }) {
	const whatsappTemplatesResult = await db.query.whatsappTemplates.findMany({
		with: {
			telefones: true,
		},
	});

	const parsed = [];
	const skipped = [];

	for (const template of whatsappTemplatesResult) {
		const messageTemplate = parseWhatsappTemplateIntoMessageTemplate(template);

		if (!messageTemplate) {
			skipped.push({
				whatsappTemplateId: template.id,
				nome: template.nome,
				reason: "Template sem organizacaoId.",
			});
			continue;
		}

		parsed.push(messageTemplate);
	}

	if (!persist) {
		return {
			data: {
				parsed,
				skipped,
				inserted: [],
				alreadyExists: [],
			},
			message: `${parsed.length} template(s) convertido(s). Use persist=true para gravar no banco.`,
		};
	}

	const inserted: Array<{ whatsappTemplateId: string; messageTemplateId: string; nome: string }> = [];
	const alreadyExists: Array<{ whatsappTemplateId: string; nome: string; existingMessageTemplateId: string }> = [];

	for (const messageTemplate of parsed) {
		const existingTemplate = await db.query.messageTemplates.findFirst({
			where: and(eq(messageTemplates.organizacaoId, messageTemplate.organizacaoId), eq(messageTemplates.nome, messageTemplate.nome)),
			columns: { id: true },
		});

		if (existingTemplate) {
			alreadyExists.push({
				whatsappTemplateId: messageTemplate.legacyWhatsappTemplateId,
				nome: messageTemplate.nome,
				existingMessageTemplateId: existingTemplate.id,
			});
			continue;
		}

		const [insertedTemplate] = await db
			.insert(messageTemplates)
			.values({
				organizacaoId: messageTemplate.organizacaoId,
				nome: messageTemplate.nome,
				status: messageTemplate.status,
				alerta: messageTemplate.alerta,
				metadados: messageTemplate.metadados,
				conteudo: messageTemplate.conteudo,
				linguagem: messageTemplate.linguagem,
				categoria: messageTemplate.categoria,
				autorId: messageTemplate.autorId,
				dataInsercao: messageTemplate.dataInsercao,
			})
			.returning({ id: messageTemplates.id });

		inserted.push({
			whatsappTemplateId: messageTemplate.legacyWhatsappTemplateId,
			messageTemplateId: insertedTemplate.id,
			nome: messageTemplate.nome,
		});
	}

	return {
		data: {
			parsed,
			skipped,
			inserted,
			alreadyExists,
		},
		message: `Migração concluída: ${inserted.length} inserido(s), ${alreadyExists.length} já existente(s), ${skipped.length} ignorado(s).`,
	};
}

async function getMigrationPreviewRoute(request: NextRequest) {
	const persist = request.nextUrl.searchParams.get("persist") === "true";
	const result = await migrateWhatsappTemplatesToMessageTemplates({ persist });
	return NextResponse.json(result);
}

async function postMigrationRoute(request: NextRequest) {
	const result = await migrateWhatsappTemplatesToMessageTemplates({ persist: true });
	return NextResponse.json(result);
}

export const GET = appApiHandler({ GET: getMigrationPreviewRoute });
export const POST = appApiHandler({ POST: postMigrationRoute });
