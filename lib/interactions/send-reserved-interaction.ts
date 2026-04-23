import { formatToMoney } from "@/lib/formatting";
import { sendTemplateWhatsappMessage } from "@/lib/whatsapp";
import { parseTemplatePayloadToGatewayContent, sendMessage } from "@/lib/whatsapp/internal-gateway";
import type { TInteractionContextMetadados, TWhatsappTemplateVariables } from "@/lib/whatsapp/template-variables";
import { getWhatsappTemplatePayload } from "@/lib/whatsapp/templates";
import { formatPhoneForInternalGateway } from "@/lib/whatsapp/utils";
import { db } from "@/services/drizzle";
import { chatMessages, chats, interactions } from "@/services/drizzle/schema";
import { and, eq } from "drizzle-orm";
import type { ImmediateProcessingData, TSendReservedInteractionResult } from "./types";

export type TChatPromiseCache = Map<string, Promise<string | null>>;

export function buildContextVariablesMap(
	ctx?: TInteractionContextMetadados,
): Omit<
	Record<keyof TWhatsappTemplateVariables, string>,
	| "clientName"
	| "clientPhoneNumber"
	| "clientEmail"
	| "clientSegmentation"
	| "clientFavoriteProduct"
	| "clientFavoriteProductGroup"
	| "clientSuggestedProduct"
> {
	// if (!ctx) {
	// 	console.warn("[TEMPLATE_VARS] buildContextVariablesMap called without context metadados; context variables will resolve to empty strings.");
	// }

	return {
		purchaseValue: formatToMoney(ctx?.compraValor ?? 0),
		purchaseCashbackAccumulated: formatToMoney(ctx?.compraCashbackAcumulado ?? 0),
		purchaseCashbackNewBalance: formatToMoney(ctx?.compraCashbackNovoSaldo ?? 0),
		purchaseSellerName: ctx?.compraVendedorNome ?? "",
		cashbackAvailableBalance: formatToMoney(ctx?.cashbackSaldoDisponivel ?? 0),
		cashbackLifetimeAccumulated: formatToMoney(ctx?.cashbackTotalAcumuladoVida ?? 0),
		cashbackLifetimeRedeemed: formatToMoney(ctx?.cashbackTotalResgatadoVida ?? 0),
		cashbackExpiringAmount: formatToMoney(ctx?.cashbackExpirandoValor ?? 0),
		cashbackExpiringDate: ctx?.cashbackExpirandoData ?? "",
	};
}

async function failInteractionSend({
	interactionId,
	organizationId,
	errorMessage,
	insertedChatMessageId,
}: {
	interactionId: string;
	organizationId: string;
	errorMessage: string;
	insertedChatMessageId?: string | null;
}) {
	if (insertedChatMessageId) {
		await db
			.update(chatMessages)
			.set({
				whatsappMessageStatus: "FALHOU",
			})
			.where(eq(chatMessages.id, insertedChatMessageId));
	}

	await db
		.update(interactions)
		.set({
			statusEnvio: "FALHOU",
			erroEnvio: errorMessage,
			dataExecucao: null,
		})
		.where(and(eq(interactions.id, interactionId), eq(interactions.organizacaoId, organizationId)));
}

async function resolveHasHubAccess(organizationId: string) {
	const organization = await db.query.organizations.findFirst({
		where: (fields, { eq }) => eq(fields.id, organizationId),
		columns: { configuracao: true },
	});

	return organization?.configuracao?.recursos?.hubAtendimentos?.acesso ?? false;
}

async function getOrCreateChatId({
	organizationId,
	clientId,
	whatsappConnectionPhoneId,
	whatsappPhoneId,
	chatIdCache,
}: {
	organizationId: string;
	clientId: string;
	whatsappConnectionPhoneId: string;
	whatsappPhoneId: string | null;
	chatIdCache?: TChatPromiseCache;
}) {
	const cacheKey = `${organizationId}:${clientId}:${whatsappConnectionPhoneId}`;
	const cachedChatPromise = chatIdCache?.get(cacheKey);
	if (cachedChatPromise) {
		return cachedChatPromise;
	}

	const chatIdPromise = (async () => {
		const existingChat = await db.query.chats.findFirst({
			where: (fields, { and, eq }) =>
				and(eq(fields.organizacaoId, organizationId), eq(fields.clienteId, clientId), eq(fields.whatsappConexaoTelefoneId, whatsappConnectionPhoneId)),
			columns: {
				id: true,
			},
		});

		if (existingChat) {
			return existingChat.id;
		}

		const [newChat] = await db
			.insert(chats)
			.values({
				organizacaoId: organizationId,
				clienteId: clientId,
				whatsappTelefoneId: whatsappPhoneId,
				whatsappConexaoTelefoneId: whatsappConnectionPhoneId,
				ultimaMensagemData: new Date(),
				ultimaMensagemConteudoTipo: "TEXTO",
			})
			.returning({ id: chats.id });

		return newChat?.id ?? null;
	})();

	if (chatIdCache) {
		chatIdCache.set(cacheKey, chatIdPromise);
	}

	try {
		const chatId = await chatIdPromise;
		if (!chatId) {
			chatIdCache?.delete(cacheKey);
		}
		return chatId;
	} catch (error) {
		chatIdCache?.delete(cacheKey);
		throw error;
	}
}

export async function sendReservedInteraction(
	params: ImmediateProcessingData & {
		hasHubAccess?: boolean;
		chatIdCache?: TChatPromiseCache;
	},
): Promise<TSendReservedInteractionResult> {
	const { interactionId, organizationId, client, campaign, whatsappToken, whatsappSessionId, contextMetadados, testing, chatIdCache } = params;
	const effectivePhoneNumber = testing?.overridePhoneNumber ?? client.telefone;
	let insertedChatMessageId: string | null = null;

	try {
		const interaction = await db.query.interactions.findFirst({
			where: (fields, { and, eq }) => and(eq(fields.id, interactionId), eq(fields.organizacaoId, organizationId)),
			columns: {
				id: true,
				metadados: true,
			},
		});

		if (!interaction) {
			return {
				success: false,
				status: "FAILED",
				error: "Interacao nao encontrada para processamento.",
			};
		}

		if (!effectivePhoneNumber) {
			await failInteractionSend({
				interactionId,
				organizationId,
				errorMessage: "Cliente nao tem telefone valido.",
			});

			return {
				success: false,
				status: "FAILED",
				error: "Cliente nao tem telefone valido.",
			};
		}

		const hasHubAccess = params.hasHubAccess ?? (await resolveHasHubAccess(organizationId));
		const clientFavoriteProduct = client.metadataProdutoMaisCompradoId
			? ((
					await db.query.products.findFirst({
						where: (fields, { eq }) => eq(fields.id, client.metadataProdutoMaisCompradoId as string),
						columns: { descricao: true },
					})
				)?.descricao ?? "")
			: "";

		const whatsappConnectionPhone = await db.query.whatsappConnectionPhones.findFirst({
			where: (fields, { eq }) => eq(fields.id, campaign.whatsappConexaoTelefoneId),
			columns: {
				id: true,
				whatsappTelefoneId: true,
			},
		});

		if (!whatsappConnectionPhone) {
			await failInteractionSend({
				interactionId,
				organizationId,
				errorMessage: "Telefone de conexao do WhatsApp nao encontrado.",
			});

			return {
				success: false,
				status: "FAILED",
				error: "Telefone de conexao do WhatsApp nao encontrado.",
			};
		}

		const contextVars = buildContextVariablesMap(contextMetadados);
		const whatsappTemplateVariablesValuesMap: Record<keyof TWhatsappTemplateVariables, string> = {
			clientEmail: client.email ?? "",
			clientName: client.nome,
			clientPhoneNumber: effectivePhoneNumber,
			clientSegmentation: client.analiseRFMTitulo ?? "",
			clientFavoriteProduct,
			clientFavoriteProductGroup: client.metadataGrupoProdutoMaisComprado ?? "",
			clientSuggestedProduct: "",
			...contextVars,
		};

		const payload = getWhatsappTemplatePayload({
			template: {
				name: campaign.whatsappTemplate.nome,
				content: campaign.whatsappTemplate.componentes.corpo.conteudo,
				components: campaign.whatsappTemplate.componentes,
			},
			variables: whatsappTemplateVariablesValuesMap,
			toPhoneNumber: effectivePhoneNumber,
		});

		if (hasHubAccess) {
			const chatId = await getOrCreateChatId({
				organizationId,
				clientId: client.id,
				whatsappConnectionPhoneId: campaign.whatsappConexaoTelefoneId,
				whatsappPhoneId: whatsappConnectionPhone.whatsappTelefoneId,
				chatIdCache,
			});

			if (!chatId) {
				throw new Error("Falha ao resolver o chat da interacao.");
			}

			const insertedChatMessageResponse = await db
				.insert(chatMessages)
				.values({
					organizacaoId: organizationId,
					chatId,
					autorTipo: "USUÁRIO",
					autorUsuarioId: campaign.autorId,
					conteudoTexto: payload.content,
					conteudoMidiaTipo: "TEXTO",
				})
				.returning({ id: chatMessages.id });

			insertedChatMessageId = insertedChatMessageResponse[0]?.id ?? null;

			if (!insertedChatMessageId) {
				throw new Error("Falha ao inserir a mensagem no chat.");
			}
		}

		let whatsappMessageId: string | undefined;
		let interactionStatusEnvio: "PENDENTE" | "ENVIADO" = "ENVIADO";
		let interactionClientMessageId: string | undefined;
		let interactionJobId: string | undefined;

		if (whatsappToken && whatsappConnectionPhone.whatsappTelefoneId) {
			if (testing?.disableWhatsappCloudApi) {
				whatsappMessageId = `test-whatsapp-message-${interactionId}`;
			} else {
				const sentWhatsappTemplateResponse = await sendTemplateWhatsappMessage({
					fromPhoneNumberId: whatsappConnectionPhone.whatsappTelefoneId,
					templatePayload: payload.data,
					whatsappToken,
				});
				whatsappMessageId = sentWhatsappTemplateResponse.whatsappMessageId;
			}
		} else if (whatsappSessionId) {
			const gatewayPayload = {
				...payload.data,
				to: formatPhoneForInternalGateway(effectivePhoneNumber),
			};
			const templateContent = parseTemplatePayloadToGatewayContent(gatewayPayload, {
				fallbackText: payload.content,
			});

			if (testing?.disableInternalGateway) {
				interactionJobId = `test-gateway-job-${interactionId}`;
			} else {
				const sentWhatsappTemplateResponse = await sendMessage(whatsappSessionId, formatPhoneForInternalGateway(effectivePhoneNumber), templateContent, {
					clientMessageId: interactionId,
				});

				if (!sentWhatsappTemplateResponse.success) {
					throw new Error(sentWhatsappTemplateResponse.error || "Falha ao enfileirar mensagem no Gateway Interno.");
				}

				interactionJobId = sentWhatsappTemplateResponse.jobId;
			}

			interactionStatusEnvio = "PENDENTE";
			interactionClientMessageId = interactionId;
		} else {
			throw new Error("WhatsApp token or session ID is required.");
		}

		if (hasHubAccess && insertedChatMessageId) {
			await db
				.update(chatMessages)
				.set({
					...(whatsappMessageId ? { whatsappMessageId } : {}),
					whatsappMessageStatus: interactionStatusEnvio === "PENDENTE" ? "PENDENTE" : "ENVIADO",
				})
				.where(eq(chatMessages.id, insertedChatMessageId));
		}

		await db
			.update(interactions)
			.set({
				statusEnvio: interactionStatusEnvio,
				erroEnvio: null,
				metadados: {
					...interaction.metadados,
					...(interactionClientMessageId ? { clientMessageId: interactionClientMessageId } : {}),
					...(interactionJobId ? { jobId: interactionJobId } : {}),
					...(insertedChatMessageId ? { chatMessageId: insertedChatMessageId } : {}),
					...(whatsappMessageId ? { whatsappMessageId } : {}),
					whatsappTemplateId: campaign.whatsappTemplate.id,
				},
			})
			.where(and(eq(interactions.id, interactionId), eq(interactions.organizacaoId, organizationId)));

		return {
			success: true,
			status: interactionStatusEnvio === "PENDENTE" ? "QUEUED" : "SENT",
		};
	} catch (error) {
		console.error(`[INTERACTIONS] Failed to send interaction ${interactionId}:`, error);

		await failInteractionSend({
			interactionId,
			organizationId,
			errorMessage: "Houve uma falha ao enviar a mensagem via WhatsApp.",
			insertedChatMessageId,
		});

		return {
			success: false,
			status: "FAILED",
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}
