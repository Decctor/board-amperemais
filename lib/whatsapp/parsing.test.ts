import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	isMessageEchoEvent,
	isMessageEvent,
	isStatusUpdate,
	parseWebhookIncomingMessages,
	parseWebhookMessageEchoes,
	parseWebhookStatusUpdates,
} from "./parsing";

/** Payload mínimo da Cloud API com um change de `messages` por item passado. */
function buildMessagesPayload(...messageGroups: unknown[][]) {
	return {
		object: "whatsapp_business_account",
		entry: messageGroups.map((messages, index) => ({
			id: `waba-${index}`,
			changes: [
				{
					field: "messages",
					value: {
						messaging_product: "whatsapp",
						metadata: { display_phone_number: "5534999990000", phone_number_id: `phone-${index}` },
						contacts: [{ profile: { name: "Cliente Teste" }, wa_id: "5534999991111" }],
						messages,
					},
				},
			],
		})),
	};
}

function buildTextMessage(id: string, body: string) {
	return { id, from: "5534999991111", timestamp: "1755000000", type: "text", text: { body } };
}

describe("parseWebhookIncomingMessages", () => {
	it("varre todos os entries e mensagens do payload, não só o primeiro", () => {
		const payload = buildMessagesPayload(
			[buildTextMessage("wamid.1", "primeira"), buildTextMessage("wamid.2", "segunda")],
			[buildTextMessage("wamid.3", "terceira")],
		);

		const parsed = parseWebhookIncomingMessages(payload);
		assert.equal(parsed.length, 3);
		assert.deepEqual(
			parsed.map((message) => message.whatsappMessageId),
			["wamid.1", "wamid.2", "wamid.3"],
		);
		assert.equal(parsed[2].whatsappPhoneNumberId, "phone-1");
	});

	it("mapeia os tipos de mídia para o enum da aplicação", () => {
		const payload = buildMessagesPayload([
			{ id: "wamid.img", from: "5534999991111", timestamp: "1755000000", type: "image", image: { id: "media-1", mime_type: "image/jpeg", caption: "foto" } },
			{ id: "wamid.aud", from: "5534999991111", timestamp: "1755000000", type: "audio", audio: { id: "media-2", mime_type: "audio/ogg" } },
			{ id: "wamid.doc", from: "5534999991111", timestamp: "1755000000", type: "document", document: { id: "media-3", mime_type: "application/pdf", filename: "nota.pdf" } },
		]);

		const [image, audio, document] = parseWebhookIncomingMessages(payload);
		assert.equal(image.messageType, "IMAGEM");
		assert.equal(image.caption, "foto");
		assert.equal(audio.messageType, "AUDIO");
		assert.equal(document.messageType, "DOCUMENTO");
		assert.equal(document.filename, "nota.pdf");
	});

	it("persiste tipos desconhecidos como placeholder de texto em vez de descartar", () => {
		const payload = buildMessagesPayload([{ id: "wamid.order", from: "5534999991111", timestamp: "1755000000", type: "order", order: {} }]);

		const [parsed] = parseWebhookIncomingMessages(payload);
		assert.ok(parsed);
		assert.equal(parsed.messageType, "TEXTO");
		assert.equal(parsed.messageTypeRaw, "order");
		assert.match(parsed.textContent ?? "", /não suportado/);
	});

	it("captura o referral de anúncio Click-to-WhatsApp", () => {
		const payload = buildMessagesPayload([
			{
				...buildTextMessage("wamid.ctwa", "vim do anúncio"),
				referral: { source_url: "https://fb.me/ad", source_type: "ad", source_id: "123", headline: "Promoção", ctwa_clid: "clid-1" },
			},
		]);

		const [parsed] = parseWebhookIncomingMessages(payload);
		assert.equal(parsed.referral?.sourceUrl, "https://fb.me/ad");
		assert.equal(parsed.referral?.ctwaClid, "clid-1");
		assert.equal(parseWebhookIncomingMessages(buildMessagesPayload([buildTextMessage("wamid.plain", "oi")]))[0].referral, null);
	});
});

describe("parseWebhookStatusUpdates", () => {
	it("varre todos os recibos agrupados numa entrega só", () => {
		const payload = {
			entry: [
				{
					changes: [
						{
							field: "messages",
							value: {
								statuses: [
									{ id: "wamid.a", status: "sent", timestamp: "1755000000" },
									{ id: "wamid.b", status: "delivered", timestamp: "1755000001" },
								],
							},
						},
						{ field: "messages", value: { statuses: [{ id: "wamid.c", status: "read", timestamp: "1755000002" }] } },
					],
				},
			],
		};

		const parsed = parseWebhookStatusUpdates(payload);
		assert.deepEqual(
			parsed.map((status) => [status.whatsappMessageId, status.status]),
			[
				["wamid.a", "sent"],
				["wamid.b", "delivered"],
				["wamid.c", "read"],
			],
		);
		assert.equal(isStatusUpdate(payload), true);
	});

	it("extrai a mensagem de erro de um status de falha", () => {
		const payload = {
			entry: [
				{
					changes: [
						{
							field: "messages",
							value: {
								statuses: [
									{
										id: "wamid.fail",
										status: "failed",
										timestamp: "1755000000",
										errors: [{ code: 131047, title: "Re-engagement message", error_data: { details: "Janela expirada." } }],
									},
								],
							},
						},
					],
				},
			],
		};

		const [parsed] = parseWebhookStatusUpdates(payload);
		assert.equal(parsed.status, "failed");
		assert.match(parsed.errorMessage ?? "", /24 horas/);
		assert.equal(parsed.errors?.[0]?.code, 131047);
	});
});

describe("parseWebhookMessageEchoes", () => {
	it("varre todos os ecos e ignora changes de outros campos", () => {
		const payload = {
			entry: [
				{
					changes: [
						{ field: "messages", value: { messages: [buildTextMessage("wamid.msg", "entrada")] } },
						{
							field: "smb_message_echoes",
							value: {
								metadata: { phone_number_id: "phone-echo" },
								message_echoes: [
									{ id: "wamid.echo1", from: "5534999990000", to: "5534999991111", timestamp: "1755000000", type: "text", text: { body: "resposta 1" } },
									{ id: "wamid.echo2", from: "5534999990000", to: "5534999991111", timestamp: "1755000001", type: "text", text: { body: "resposta 2" } },
								],
							},
						},
					],
				},
			],
		};

		const parsed = parseWebhookMessageEchoes(payload);
		assert.equal(parsed.length, 2);
		assert.equal(parsed[0].whatsappPhoneNumberId, "phone-echo");
		assert.equal(parsed[1].textContent, "resposta 2");
		assert.equal(isMessageEchoEvent(payload), true);
		assert.equal(isMessageEvent(payload), true);
	});
});
