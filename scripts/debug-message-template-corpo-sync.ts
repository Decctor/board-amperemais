/**
 * Compara o parsing de `corpo` entre Meta, parser interno e banco — sem atualizar templates.
 *
 * Uso:
 *   npx tsx scripts/debug-message-template-corpo-sync.ts
 *   npx tsx scripts/debug-message-template-corpo-sync.ts --organizacao-id <uuid>
 *   npx tsx scripts/debug-message-template-corpo-sync.ts --telefone-id <uuid>
 *   npx tsx scripts/debug-message-template-corpo-sync.ts --template-id <uuid>
 *   npx tsx scripts/debug-message-template-corpo-sync.ts --output ./corpo-diff.json
 */
import "dotenv/config";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { listMetaTemplatesForPhone } from "@/lib/message-templates";
import { getOrganizationWhatsappPhones } from "@/lib/whatsapp/organization-phones";
import { buildRemoteTemplateIndexes, resolveRemoteTemplate } from "@/lib/message-templates";
import { extractWhatsappContentFromMetaWithLocalContext } from "@/lib/message-templates/channels/whatsapp/meta-status";
import type { TMetaTemplateComponent } from "@/lib/message-templates/channels/whatsapp/types";
import type { TMessageTemplateContent } from "@/schemas/message-templates";
import { connection, db } from "@/services/drizzle";
import { messageTemplates, whatsappConnectionPhones } from "@/services/drizzle/schema";
import { and, eq } from "drizzle-orm";

type TCliArgs = {
	organizacaoId: string | null;
	telefoneId: string | null;
	templateId: string | null;
	outputPath: string;
};

type TCorpoComparisonEntry = {
	organizacaoId: string;
	templateId: string;
	templateNome: string;
	telefoneId: string;
	telefoneNumero: string;
	linguagem: string;
	status: "matched" | "skipped" | "error";
	erro?: string;
	corpo: {
		meta: TMetaTemplateComponent | null;
		parseado: TMessageTemplateContent["corpo"] | null;
		banco: TMessageTemplateContent["corpo"];
	};
	comparacao: {
		parseadoIgualBanco: boolean | null;
		metaTextoIgualParseado: boolean | null;
		metaTextoIgualBanco: boolean | null;
	};
};

function parseCliArgs(): TCliArgs {
	const args = process.argv.slice(2);
	const getArg = (flag: string) => {
		const index = args.indexOf(flag);
		return index >= 0 ? args[index + 1] : null;
	};

	const organizacaoId = getArg("--organizacao-id");
	const defaultOutputName = organizacaoId ? `message-template-corpo-diff-${organizacaoId}.json` : "message-template-corpo-diff-all.json";

	return {
		organizacaoId,
		telefoneId: getArg("--telefone-id"),
		templateId: getArg("--template-id"),
		outputPath: resolve(getArg("--output") ?? defaultOutputName),
	};
}

async function resolveOrganizacaoIds({ organizacaoId, telefoneId, templateId }: TCliArgs): Promise<string[]> {
	if (organizacaoId) return [organizacaoId];

	if (telefoneId) {
		const phone = await db.query.whatsappConnectionPhones.findFirst({
			where: eq(whatsappConnectionPhones.id, telefoneId),
			with: { conexao: { columns: { organizacaoId: true } } },
		});
		if (!phone) {
			console.error(`Erro: telefone ${telefoneId} não encontrado.`);
			process.exit(1);
		}
		return [phone.conexao.organizacaoId];
	}

	if (templateId) {
		const template = await db.query.messageTemplates.findFirst({
			where: eq(messageTemplates.id, templateId),
			columns: { organizacaoId: true },
		});
		if (!template) {
			console.error(`Erro: template ${templateId} não encontrado.`);
			process.exit(1);
		}
		return [template.organizacaoId];
	}

	const rows = await db.selectDistinct({ organizacaoId: messageTemplates.organizacaoId }).from(messageTemplates);
	return rows.map((row) => row.organizacaoId);
}

function extractMetaBodyComponent(components: TMetaTemplateComponent[]) {
	return components.find((component) => component.type === "BODY") ?? null;
}

function stableSerialize(value: unknown) {
	return JSON.stringify(value);
}

function compareCorpo(a: TMessageTemplateContent["corpo"] | null, b: TMessageTemplateContent["corpo"] | null) {
	if (!a || !b) return null;
	return stableSerialize(a) === stableSerialize(b);
}

async function processOrganizacao({
	organizacaoId,
	telefoneId,
	templateId,
}: {
	organizacaoId: string;
	telefoneId: string | null;
	templateId: string | null;
}) {
	const phones = await getOrganizationWhatsappPhones(organizacaoId);
	const phonesToSync = telefoneId ? phones.filter((phone) => phone.id === telefoneId) : phones;

	if (telefoneId && phonesToSync.length === 0) {
		console.warn(`Aviso: telefone ${telefoneId} não encontrado na organização ${organizacaoId}. Ignorando.`);
		return { entries: [], matched: 0, skipped: 0, errors: 0, divergenciasParseadoBanco: 0, phonesProcessed: 0, templatesProcessed: 0 };
	}

	const templates = templateId
		? await db.query.messageTemplates.findMany({
				where: and(eq(messageTemplates.id, templateId), eq(messageTemplates.organizacaoId, organizacaoId)),
			})
		: await db.query.messageTemplates.findMany({
				where: eq(messageTemplates.organizacaoId, organizacaoId),
			});

	const entries: TCorpoComparisonEntry[] = [];
	let matched = 0;
	let skipped = 0;
	let divergenciasParseadoBanco = 0;

	for (const phone of phonesToSync) {
		let remoteIndexes: ReturnType<typeof buildRemoteTemplateIndexes>;
		try {
			const remoteTemplates = await listMetaTemplatesForPhone(phone);
			remoteIndexes = buildRemoteTemplateIndexes(remoteTemplates);
		} catch (error) {
			const erro = error instanceof Error ? error.message : "Erro desconhecido";
			console.warn(`Aviso: falha ao listar templates da Meta para telefone ${phone.numero} (${phone.id}): ${erro}`);
			for (const template of templates) {
				entries.push({
					organizacaoId,
					templateId: template.id,
					templateNome: template.nome,
					telefoneId: phone.id,
					telefoneNumero: phone.numero,
					linguagem: template.linguagem,
					status: "error",
					erro,
					corpo: {
						meta: null,
						parseado: null,
						banco: template.conteudo.corpo,
					},
					comparacao: {
						parseadoIgualBanco: null,
						metaTextoIgualParseado: null,
						metaTextoIgualBanco: null,
					},
				});
			}
			continue;
		}

		for (const template of templates) {
			const metadataForPhone = template.metadados.porNumeroTelefone[phone.id];
			const remote = resolveRemoteTemplate({ indexes: remoteIndexes, template, metadataForPhone });

			if (!remote) {
				skipped += 1;
				entries.push({
					organizacaoId,
					templateId: template.id,
					templateNome: template.nome,
					telefoneId: phone.id,
					telefoneNumero: phone.numero,
					linguagem: template.linguagem,
					status: "skipped",
					corpo: {
						meta: null,
						parseado: null,
						banco: template.conteudo.corpo,
					},
					comparacao: {
						parseadoIgualBanco: null,
						metaTextoIgualParseado: null,
						metaTextoIgualBanco: null,
					},
				});
				continue;
			}

			const metaBody = extractMetaBodyComponent(remote.components);
			const parseadoConteudo = extractWhatsappContentFromMetaWithLocalContext({
				metaTemplate: remote,
				currentContent: template.conteudo,
			}).content;
			const parseadoCorpo = parseadoConteudo.corpo;
			const bancoCorpo = template.conteudo.corpo;

			const parseadoIgualBanco = compareCorpo(parseadoCorpo, bancoCorpo);
			if (parseadoIgualBanco === false) divergenciasParseadoBanco += 1;

			matched += 1;
			entries.push({
				organizacaoId,
				templateId: template.id,
				templateNome: template.nome,
				telefoneId: phone.id,
				telefoneNumero: phone.numero,
				linguagem: template.linguagem,
				status: "matched",
				corpo: {
					meta: metaBody,
					parseado: parseadoCorpo,
					banco: bancoCorpo,
				},
				comparacao: {
					parseadoIgualBanco,
					metaTextoIgualParseado: metaBody?.text != null ? metaBody.text === parseadoCorpo.conteudo : null,
					metaTextoIgualBanco: metaBody?.text != null ? metaBody.text === bancoCorpo.conteudo : null,
				},
			});
		}
	}

	const errorEntries = entries.filter((entry) => entry.status === "error").length;

	return {
		entries,
		matched,
		skipped,
		errors: errorEntries,
		divergenciasParseadoBanco,
		phonesProcessed: phonesToSync.length,
		templatesProcessed: templates.length,
	};
}

async function main() {
	const cliArgs = parseCliArgs();
	const { telefoneId, templateId, outputPath } = cliArgs;
	const organizacaoIds = await resolveOrganizacaoIds(cliArgs);

	if (organizacaoIds.length === 0) {
		console.error("Nenhuma organização com templates encontrada.");
		process.exit(1);
	}

	console.log(`Processando ${organizacaoIds.length} organização(ões)...`);

	const entries: TCorpoComparisonEntry[] = [];
	let matched = 0;
	let skipped = 0;
	let errors = 0;
	let divergenciasParseadoBanco = 0;
	let phonesProcessed = 0;
	let templatesProcessed = 0;

	for (const organizacaoId of organizacaoIds) {
		const result = await processOrganizacao({ organizacaoId, telefoneId, templateId });
		entries.push(...result.entries);
		matched += result.matched;
		skipped += result.skipped;
		errors += result.errors;
		divergenciasParseadoBanco += result.divergenciasParseadoBanco;
		phonesProcessed += result.phonesProcessed;
		templatesProcessed += result.templatesProcessed;
	}

	const output = {
		geradoEm: new Date().toISOString(),
		filtros: {
			organizacaoId: cliArgs.organizacaoId,
			telefoneId,
			templateId,
		},
		resumo: {
			organizacoesProcessadas: organizacaoIds.length,
			telefonesProcessados: phonesProcessed,
			templatesProcessados: templatesProcessed,
			entradas: entries.length,
			matched,
			skipped,
			errors,
			divergenciasParseadoBanco,
		},
		templates: entries,
	};

	writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf-8");

	console.log(`Arquivo gerado em: ${outputPath}`);
	console.log(`Resumo: ${matched} matched, ${skipped} skipped, ${errors} erro(s), ${divergenciasParseadoBanco} divergência(s) parseado vs banco.`);

	if (divergenciasParseadoBanco > 0) {
		console.log("\nTemplates com corpo parseado diferente do banco:");
		for (const entry of entries) {
			if (entry.comparacao.parseadoIgualBanco === false) {
				console.log(`  - [${entry.organizacaoId}] ${entry.templateNome} (telefone ${entry.telefoneNumero})`);
			}
		}
	}
}

main()
	.catch((error) => {
		console.error(error);
		process.exit(1);
	})
	.finally(async () => {
		await connection.end();
	});
