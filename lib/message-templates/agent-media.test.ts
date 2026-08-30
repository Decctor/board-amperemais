import assert from "node:assert/strict";
import test from "node:test";
import {
	assertAgentTemplateMediaPath,
	getAgentTemplateMediaPrefix,
	MAX_INLINE_IMAGE_SIZE,
	uploadAgentTemplateMediaContent,
	uploadAgentTemplateMediaFromUrl,
} from "./agent-media";

test("o prefixo de mídia é isolado por organização", () => {
	assert.equal(getAgentTemplateMediaPrefix({ organizacaoId: "org-1" }), "public/organizations/org-1/agent-message-template-media/");
	assert.doesNotThrow(() => assertAgentTemplateMediaPath("org-1", "public/organizations/org-1/agent-message-template-media/upload-1/header.png"));
});

test("caminho de outra organização, traversal e barra invertida são recusados", () => {
	assert.throws(
		() => assertAgentTemplateMediaPath("org-1", "public/organizations/org-2/agent-message-template-media/upload/header.png"),
		/organização/,
	);
	assert.throws(() => assertAgentTemplateMediaPath("org-1", "public/organizations/org-1/agent-message-template-media/../segredo"), /organização/);
	assert.throws(
		() => assertAgentTemplateMediaPath("org-1", "public/organizations/org-1/agent-message-template-media/upload\\header.png"),
		/organização/,
	);
});

// O caminho inline recusa antes de tocar no Storage: tipo não permitido, base64 vazio e
// arquivo acima do teto. Imagem válida exige Supabase e é coberta no teste de integração.
test("upload inline recusa mime fora da allowlist, conteúdo vazio e imagem acima do teto", async () => {
	await assert.rejects(
		() => uploadAgentTemplateMediaContent({ organizationId: "org-1", fileName: "a.gif", mimeType: "image/gif", conteudoBase64: "AAAA" }),
		/JPEG ou PNG/,
	);
	await assert.rejects(
		() => uploadAgentTemplateMediaContent({ organizationId: "org-1", fileName: "a.png", mimeType: "image/png", conteudoBase64: "   " }),
		/vazio/,
	);
	const oversized = Buffer.alloc(MAX_INLINE_IMAGE_SIZE + 1).toString("base64");
	await assert.rejects(
		() => uploadAgentTemplateMediaContent({ organizationId: "org-1", fileName: "a.png", mimeType: "image/png", conteudoBase64: oversized }),
		/3 MB/,
	);
});

// As barreiras anti-SSRF recusam antes de qualquer conexão: esquema não-https, IP privado
// (inclusive o endpoint de metadata da cloud) e host interno. Download real exige rede e é
// coberto no teste de integração.
test("upload por URL recusa esquema, IP privado e host interno sem tocar na rede", async () => {
	await assert.rejects(() => uploadAgentTemplateMediaFromUrl({ organizationId: "org-1", url: "http://example.com/a.png" }), /https/);
	await assert.rejects(
		() => uploadAgentTemplateMediaFromUrl({ organizationId: "org-1", url: "https://169.254.169.254/latest/meta-data/" }),
		/privado ou reservado/,
	);
	await assert.rejects(() => uploadAgentTemplateMediaFromUrl({ organizationId: "org-1", url: "https://localhost/a.png" }), /interno/);
	await assert.rejects(() => uploadAgentTemplateMediaFromUrl({ organizationId: "org-1", url: "isso-nao-e-url" }), /inválida/);
});
