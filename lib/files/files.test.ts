import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { inspectImageFile } from "./inspect";
import { createUploadIntake } from "./intake";
import { sanitizeFileName } from "./service";

const ALLOWED = new Set(["image/jpeg", "image/png"]);

test("sanitizeFileName normaliza o nome e força a extensão pelo mime sniffado", () => {
	assert.equal(sanitizeFileName("Promoção de Verão.PNG", "image/png"), "promocao-de-verao.png");
	assert.equal(sanitizeFileName("foto", "image/jpeg"), "foto.jpg");
	assert.equal(sanitizeFileName("///", "image/png"), "arquivo.png");
});

test("a inspeção decodifica por completo: imagem válida passa, truncada e vazia são recusadas", async () => {
	const png = await sharp({ create: { width: 32, height: 24, channels: 3, background: { r: 10, g: 20, b: 30 } } })
		.png()
		.toBuffer();
	const inspected = await inspectImageFile(png, { allowedMimeTypes: ALLOWED });
	assert.deepEqual(inspected, { mimeType: "image/png", metadados: { tipo: "IMAGEM", largura: 32, altura: 24 } });

	// Um JPEG truncado mantém o cabeçalho válido (metadata() passa) com corpo de lixo — foi
	// exatamente assim que uma imagem cinza chegou a um template. A decodificação completa
	// precisa recusá-lo.
	const jpeg = await sharp({ create: { width: 512, height: 512, channels: 3, background: { r: 200, g: 40, b: 90 } } })
		.jpeg()
		.toBuffer();
	const truncated = jpeg.subarray(0, Math.floor(jpeg.length / 2));
	await assert.rejects(() => inspectImageFile(truncated, { allowedMimeTypes: ALLOWED }), /corrompido|não é uma imagem/);
	await assert.rejects(() => inspectImageFile(Buffer.alloc(0), { allowedMimeTypes: ALLOWED }), /vazio/);
	await assert.rejects(() => inspectImageFile(Buffer.from("isso não é uma imagem"), { allowedMimeTypes: ALLOWED }), /não é uma imagem/);
});

test("o intake recusa tamanho fora do teto e SHA-256 malformado antes de tocar no banco", async () => {
	await assert.rejects(() => createUploadIntake({ organizacaoId: "org-1", proposito: "MIDIA_TEMPLATE_MENSAGEM", tamanhoEsperadoBytes: 0 }), /máximo/);
	await assert.rejects(
		() => createUploadIntake({ organizacaoId: "org-1", proposito: "MIDIA_TEMPLATE_MENSAGEM", tamanhoEsperadoBytes: 5 * 1024 * 1024 }),
		/máximo/,
	);
	await assert.rejects(
		() =>
			createUploadIntake({
				organizacaoId: "org-1",
				proposito: "MIDIA_TEMPLATE_MENSAGEM",
				tamanhoEsperadoBytes: 1000,
				sha256Esperado: "não-é-um-hash",
			}),
		/SHA-256/,
	);
});
