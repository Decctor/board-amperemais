import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadBrandLogo } from "@/lib/brand/assets";
import { renderBrandAssetPng } from "@/lib/brand/render";
import { createMetaWhatsappTemplate, listMetaWhatsappTemplates } from "@/lib/message-templates/channels/whatsapp/meta-client";
import type { TMetaCreateTemplatePayload } from "@/lib/message-templates/channels/whatsapp/types";
import { buildOrganizationInviteHeaderElement, INVITE_HEADER_HEIGHT, INVITE_HEADER_WIDTH } from "@/lib/organizations/invite-header/template";
import {
	buildOrganizationInviteAcceptUrl,
	getOrganizationInviteExpirationLabel,
	ORGANIZATION_INVITE_PARAM_NAMES,
	ORGANIZATION_INVITE_PRODUCTION_ORIGIN,
	ORGANIZATION_INVITE_TEMPLATE_BODY_TEXT,
	ORGANIZATION_INVITE_TEMPLATE_BUTTON_TEXT,
	ORGANIZATION_INVITE_TEMPLATE_FOOTER_TEXT,
	ORGANIZATION_INVITE_TEMPLATE_LANGUAGE,
	ORGANIZATION_INVITE_TEMPLATE_NAME,
} from "@/lib/organizations/invite-template";
import { uploadTemplateMediaToMeta } from "@/lib/whatsapp/media-upload";

// Script temporario: registra o template oficial de convite de organizacao na
// WABA da plataforma. Rode uma vez, confirme a aprovacao no Business Manager e
// exclua o arquivo — o envio em producao nao depende dele.
//
// Uso:
//   npx tsx ./scripts/create-organization-invite-template.ts --dry-run
//   npx tsx ./scripts/create-organization-invite-template.ts

const SAMPLE_ORGANIZATION_NAME = "Sua Organização";
const SAMPLE_INVITATION_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
// `exports/brand/` já é gitignorado — a amostra é regenerável, não versionada.
const SAMPLE_HEADER_OUTPUT_PATH = path.join(process.cwd(), "exports", "brand", "organization-invite-template-header.png");

function requireEnvironmentVariable(name: "META_ACCESS_TOKEN" | "META_WHATSAPP_BUSINESS_ACCOUNT_ID" | "NEXT_PUBLIC_META_APP_ID") {
	const value = process.env[name]?.trim();
	if (!value) throw new Error(`${name} não configurado no .env.`);
	return value;
}

/**
 * Amostra do cabeçalho para a aprovação: o símbolo da Recompra nos dois orbes.
 *
 * No orbe claro entra a variante `iconBlue` — `iconColorOnDark` tem duas barras
 * brancas que somem em fundo branco.
 */
async function renderSampleHeaderPng() {
	const sampleOrganizationLogo = await loadBrandLogo("iconBlue");
	const element = await buildOrganizationInviteHeaderElement({
		organizationName: SAMPLE_ORGANIZATION_NAME,
		organizationLogoDataUrl: sampleOrganizationLogo.dataUrl,
	});

	return renderBrandAssetPng({ element, width: INVITE_HEADER_WIDTH, height: INVITE_HEADER_HEIGHT });
}

function buildTemplatePayload(headerHandle: string): TMetaCreateTemplatePayload {
	return {
		name: ORGANIZATION_INVITE_TEMPLATE_NAME,
		category: "utility",
		language: ORGANIZATION_INVITE_TEMPLATE_LANGUAGE,
		parameter_format: "named",
		components: [
			{
				type: "HEADER",
				format: "IMAGE",
				example: { header_handle: [headerHandle] },
			},
			{
				type: "BODY",
				text: ORGANIZATION_INVITE_TEMPLATE_BODY_TEXT,
				example: {
					body_text_named_params: [
						{ param_name: ORGANIZATION_INVITE_PARAM_NAMES.convidadoNome, example: "João da Silva" },
						{ param_name: ORGANIZATION_INVITE_PARAM_NAMES.organizacaoNome, example: "Loja Exemplo" },
						{ param_name: ORGANIZATION_INVITE_PARAM_NAMES.expiracao, example: getOrganizationInviteExpirationLabel() },
					],
				},
			},
			{
				type: "FOOTER",
				text: ORGANIZATION_INVITE_TEMPLATE_FOOTER_TEXT,
			},
			{
				type: "BUTTONS",
				buttons: [
					{
						type: "URL",
						text: ORGANIZATION_INVITE_TEMPLATE_BUTTON_TEXT,
						// A Meta anexa a variável ao FINAL da URL, então `{{1}}` precisa fechar a string.
						url: buildOrganizationInviteAcceptUrl({ origin: ORGANIZATION_INVITE_PRODUCTION_ORIGIN, invitationId: "{{1}}" }),
						example: [buildOrganizationInviteAcceptUrl({ origin: ORGANIZATION_INVITE_PRODUCTION_ORIGIN, invitationId: SAMPLE_INVITATION_ID })],
					},
				],
			},
		],
	};
}

async function main() {
	const isDryRun = process.argv.includes("--dry-run");

	console.log(`[INFO] Renderizando amostra do cabeçalho (${INVITE_HEADER_WIDTH}x${INVITE_HEADER_HEIGHT})...`);
	const headerPngBuffer = await renderSampleHeaderPng();

	if (isDryRun) {
		await mkdir(path.dirname(SAMPLE_HEADER_OUTPUT_PATH), { recursive: true });
		await writeFile(SAMPLE_HEADER_OUTPUT_PATH, headerPngBuffer);

		console.log(`[DRY-RUN] Amostra do cabeçalho salva em: ${SAMPLE_HEADER_OUTPUT_PATH}`);
		console.log("[DRY-RUN] Nenhuma chamada à Meta foi feita. Payload que seria enviado:");
		console.log(JSON.stringify(buildTemplatePayload("<header_handle:pendente>"), null, 2));
		return;
	}

	const accessToken = requireEnvironmentVariable("META_ACCESS_TOKEN");
	const whatsappBusinessAccountId = requireEnvironmentVariable("META_WHATSAPP_BUSINESS_ACCOUNT_ID");
	const appId = requireEnvironmentVariable("NEXT_PUBLIC_META_APP_ID");

	const existingTemplates = await listMetaWhatsappTemplates({
		accessToken,
		whatsappBusinessAccountId,
		fields: ["id", "name", "status", "category", "language", "parameter_format", "components"],
	});
	const existing = existingTemplates.find(
		(template) => template.name === ORGANIZATION_INVITE_TEMPLATE_NAME && template.language === ORGANIZATION_INVITE_TEMPLATE_LANGUAGE,
	);

	if (existing) {
		console.log(JSON.stringify({ created: false, reason: "Template já existe.", template: existing }, null, 2));
		return;
	}

	console.log("[INFO] Subindo a amostra do cabeçalho para a Meta...");
	const { headerHandle } = await uploadTemplateMediaToMeta({
		appId,
		accessToken,
		fileBuffer: headerPngBuffer,
		fileName: `${ORGANIZATION_INVITE_TEMPLATE_NAME}.png`,
		fileType: "image/png",
	});

	const created = await createMetaWhatsappTemplate({
		accessToken,
		whatsappBusinessAccountId,
		payload: buildTemplatePayload(headerHandle),
	});

	console.log(JSON.stringify({ created: true, template: created }, null, 2));
}

void main().catch((error) => {
	console.error("[CREATE_ORGANIZATION_INVITE_TEMPLATE_ERROR]", error instanceof Error ? error.message : error);
	process.exit(1);
});
