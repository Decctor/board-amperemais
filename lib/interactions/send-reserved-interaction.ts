import { EmailTemplate, sendEmailWithResend } from "@/lib/email";
import { formatCashbackValue, formatToMoney } from "@/lib/formatting";
import {
	buildWhatsappTemplateSendPayload,
	convertHtmlToWhatsappText,
	replaceMessageTemplateVariables,
	type TMessageTemplateRuntimeContext,
} from "@/lib/message-templates";
import { sendTemplateWhatsappMessage } from "@/lib/whatsapp";
import { parseTemplatePayloadToGatewayContent, sendMessage } from "@/lib/whatsapp/internal-gateway";
import type { TInteractionContextMetadados, TMessageTemplateVariables } from "@/lib/message-templates";
import { formatPhoneForInternalGateway } from "@/lib/whatsapp/utils";
import type { TCashbackProgramTerminologyEnum } from "@/schemas/enums";
import { db } from "@/services/drizzle";
import { chatMessages, chats, interactions } from "@/services/drizzle/schema";
import { and, eq } from "drizzle-orm";
import type { ImmediateProcessingData, TSendReservedInteractionResult } from "./types";

export type TChatPromiseCache = Map<string, Promise<string | null>>;

export function buildContextVariablesMap(
	ctx?: TInteractionContextMetadados,
	terminology: TCashbackProgramTerminologyEnum = "DINHEIRO",
): Omit<
	Record<keyof TMessageTemplateVariables, string>,
	| "clientName"
	| "clientPhoneNumber"
	| "clientEmail"
	| "clientSegmentation"
	| "clientFavoriteProduct"
	| "clientFavoriteProductGroup"
	| "clientSuggestedProduct"
> {
	return {
		purchaseValue: formatToMoney(ctx?.compraValor ?? 0),
		purchaseCashbackAccumulated: formatCashbackValue(ctx?.compraCashbackAcumulado ?? 0, terminology),
		purchaseCashbackNewBalance: formatCashbackValue(ctx?.compraCashbackNovoSaldo ?? 0, terminology),
		purchaseSellerName: ctx?.compraVendedorNome ?? "",
		cashbackAvailableBalance: formatCashbackValue(ctx?.cashbackSaldoDisponivel ?? 0, terminology),
		cashbackLifetimeAccumulated: formatCashbackValue(ctx?.cashbackTotalAcumuladoVida ?? 0, terminology),
		cashbackLifetimeRedeemed: formatCashbackValue(ctx?.cashbackTotalResgatadoVida ?? 0, terminology),
		cashbackExpiringAmount: formatCashbackValue(ctx?.cashbackExpirandoValor ?? 0, terminology),
		cashbackExpiringDate: ctx?.cashbackExpirandoData ?? "",
		cashbackExpiringWindow: ctx?.cashbackExpirandoJanela ?? "",
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
		await db.update(chatMessages).set({ whatsappMessageStatus: "FALHOU" }).where(eq(chatMessages.id, insertedChatMessageId));
	}

	await db
		.update(interactions)
		.set({
			statusEnvio: "FALHOU",
			erroEnvio: errorMessage,
		})
		.where(and(eq(interactions.id, interactionId), eq(interactions.organizacaoId, organizationId)));
}

async function blockInteractionSend({
	interactionId,
	organizationId,
	errorMessage,
}: {
	interactionId: string;
	organizationId: string;
	errorMessage: string;
}) {
	await db
		.update(interactions)
		.set({
			statusEnvio: "BLOQUEADA",
			erroEnvio: errorMessage,
		})
		.where(and(eq(interactions.id, interactionId), eq(interactions.organizacaoId, organizationId)));
}

async function resolveOrganizationMessagingContext(organizationId: string) {
	const [organization, cashbackProgram] = await Promise.all([
		db.query.organizations.findFirst({
			where: (fields, { eq }) => eq(fields.id, organizationId),
			columns: {
				id: true,
				nome: true,
				logoUrl: true,
				corPrimaria: true,
				corPrimariaForeground: true,
				configuracao: true,
			},
		}),
		db.query.cashbackPrograms.findFirst({
			where: (fields, { eq }) => eq(fields.organizacaoId, organizationId),
			columns: { terminologia: true },
		}),
	]);

	return {
		organization,
		hasHubAccess: organization?.configuracao?.recursos?.hubAtendimentos?.acesso ?? false,
		organizationCashbackTerminology: cashbackProgram?.terminologia ?? "DINHEIRO",
	};
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
	if (cachedChatPromise) return cachedChatPromise;

	const chatIdPromise = (async () => {
		const existingChat = await db.query.chats.findFirst({
			where: (fields, { and, eq }) =>
				and(eq(fields.organizacaoId, organizationId), eq(fields.clienteId, clientId), eq(fields.whatsappConexaoTelefoneId, whatsappConnectionPhoneId)),
			columns: { id: true },
		});

		if (existingChat) return existingChat.id;

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

	if (chatIdCache) chatIdCache.set(cacheKey, chatIdPromise);

	try {
		const chatId = await chatIdPromise;
		if (!chatId) chatIdCache?.delete(cacheKey);
		return chatId;
	} catch (error) {
		chatIdCache?.delete(cacheKey);
		throw error;
	}
}

function getInteractionMetadata(metadados: unknown) {
	return metadados && typeof metadados === "object" && !Array.isArray(metadados) ? (metadados as Record<string, unknown>) : {};
}

async function persistInteractionDeliveryState({
	interactionId,
	organizationId,
	baseMetadata,
	statusEnvio,
	erroEnvio,
	chatMessageId,
	whatsappMessageId,
	emailMessageId,
	clientMessageId,
	jobId,
	messageTemplateId,
	channelsAttempted,
	channelsSkipped,
	channelsSent,
	channelErrors,
	whatsappStatus,
	emailStatus,
}: {
	interactionId: string;
	organizationId: string;
	baseMetadata: Record<string, unknown>;
	statusEnvio: "BLOQUEADA" | "FALHOU" | "PENDENTE" | "ENVIADO";
	erroEnvio: string | null;
	chatMessageId?: string | null;
	whatsappMessageId?: string;
	emailMessageId?: string;
	clientMessageId?: string;
	jobId?: string;
	messageTemplateId: string;
	channelsAttempted: string[];
	channelsSkipped: string[];
	channelsSent: string[];
	channelErrors: Record<string, string>;
	whatsappStatus?: string | null;
	emailStatus?: string | null;
}) {
	await db
		.update(interactions)
		.set({
			statusEnvio,
			erroEnvio,
			...(statusEnvio === "ENVIADO" ? { dataEnvio: new Date() } : {}),
			metadados: {
				...baseMetadata,
				...(clientMessageId ? { clientMessageId } : {}),
				...(jobId ? { jobId } : {}),
				...(chatMessageId ? { chatMessageId } : {}),
				...(whatsappMessageId ? { whatsappMessageId } : {}),
				...(emailMessageId ? { emailMessageId } : {}),
				...(whatsappStatus ? { whatsappStatus } : {}),
				...(emailStatus ? { emailStatus } : {}),
				whatsappTemplateId: messageTemplateId,
				messageTemplateId,
				channelsAttempted,
				channelsSkipped,
				channelsSent,
				channelErrors,
			},
		})
		.where(and(eq(interactions.id, interactionId), eq(interactions.organizacaoId, organizationId)));
}

function buildWhatsappPlainContent({
	template,
	variables,
}: {
	template: ImmediateProcessingData["campaign"]["whatsappTemplate"];
	variables: TMessageTemplateRuntimeContext["variaveis"];
}) {
	const header =
		template.conteudo.cabecalho?.tipo === "TEXTO" && template.conteudo.cabecalho.conteudoTexto
			? convertHtmlToWhatsappText(replaceMessageTemplateVariables(template.conteudo.cabecalho.conteudoTexto, variables))
			: "";
	const body = convertHtmlToWhatsappText(replaceMessageTemplateVariables(template.conteudo.corpo.conteudo, variables));
	const footer = template.conteudo.rodape ? convertHtmlToWhatsappText(replaceMessageTemplateVariables(template.conteudo.rodape, variables)) : "";
	return [header, body, footer].filter(Boolean).join("\n\n");
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
			columns: { id: true, metadados: true },
		});

		if (!interaction) {
			return { success: false, status: "FAILED", error: "Interacao nao encontrada para processamento." };
		}

		const organizationContext = await resolveOrganizationMessagingContext(organizationId);
		const hasHubAccess = params.hasHubAccess ?? organizationContext.hasHubAccess;
		// Resolve favorite and suggested product names in a single indexed lookup to avoid an extra round-trip on the hot path.
		const productIdsToResolve = [client.metadataProdutoMaisCompradoId, client.metadataProdutoSugeridoId].filter(Boolean) as string[];
		const resolvedProductNames = productIdsToResolve.length
			? await db.query.products.findMany({
					where: (fields, { inArray }) => inArray(fields.id, productIdsToResolve),
					columns: { id: true, nome: true },
				})
			: [];
		const productNameById = new Map(resolvedProductNames.map((product) => [product.id, product.nome]));
		const clientFavoriteProduct = client.metadataProdutoMaisCompradoId ? (productNameById.get(client.metadataProdutoMaisCompradoId) ?? "") : "";
		const clientSuggestedProduct = client.metadataProdutoSugeridoId ? (productNameById.get(client.metadataProdutoSugeridoId) ?? "") : "";

		const cashbackTerminology = contextMetadados?.terminologia ?? organizationContext.organizationCashbackTerminology;
		const contextVars = buildContextVariablesMap(contextMetadados, cashbackTerminology);
		const messageTemplateVariablesValuesMap: Record<keyof TMessageTemplateVariables, string> = {
			clientEmail: client.email ?? "",
			clientName: client.nome,
			clientPhoneNumber: effectivePhoneNumber ?? "",
			clientSegmentation: client.analiseRFMTitulo ?? "",
			clientFavoriteProduct,
			clientFavoriteProductGroup: client.metadataGrupoProdutoMaisComprado ?? "",
			clientSuggestedProduct,
			...contextVars,
		};
		const runtimeContext: TMessageTemplateRuntimeContext = {
			origin: process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_URL || "",
			organizacaoId: organizationId,
			clienteId: client.id,
			interactionId,
			variaveis: messageTemplateVariablesValuesMap,
			cabecalhoMidiaUrl:
				campaign.whatsappTemplate.conteudo.cabecalho?.tipo === "IMAGEM_DINAMICA"
					? undefined
					: campaign.whatsappTemplate.conteudo.cabecalho?.conteudoMidiaUrl,
		};

		const renderedWhatsappContent = buildWhatsappPlainContent({
			template: campaign.whatsappTemplate,
			variables: runtimeContext.variaveis,
		});

		const channelErrors: Record<string, string> = {};
		const channelsAttempted: string[] = [];
		const channelsSkipped: string[] = [];
		let whatsappMessageId: string | undefined;
		let emailMessageId: string | undefined;
		let interactionStatusEnvio: "PENDENTE" | "ENVIADO" = "ENVIADO";
		let interactionClientMessageId: string | undefined;
		let interactionJobId: string | undefined;

		if (!effectivePhoneNumber) {
			channelsSkipped.push("WHATSAPP: cliente sem telefone");
		} else if (!campaign.whatsappConexaoTelefoneId) {
			channelsSkipped.push("WHATSAPP: telefone de conexao nao configurado");
		} else {
			channelsAttempted.push("WHATSAPP");
			try {
				const whatsappConnectionPhone = await db.query.whatsappConnectionPhones.findFirst({
					where: (fields, { eq }) => eq(fields.id, campaign.whatsappConexaoTelefoneId as string),
					columns: { id: true, whatsappTelefoneId: true },
				});
				if (!whatsappConnectionPhone) throw new Error("Telefone de conexao do WhatsApp nao encontrado.");

				const payload = buildWhatsappTemplateSendPayload({
					template: campaign.whatsappTemplate,
					toPhoneNumber: effectivePhoneNumber,
					runtimeContext,
				});

				if (hasHubAccess) {
					const chatId = await getOrCreateChatId({
						organizationId,
						clientId: client.id,
						whatsappConnectionPhoneId: campaign.whatsappConexaoTelefoneId,
						whatsappPhoneId: whatsappConnectionPhone.whatsappTelefoneId,
						chatIdCache,
					});
					if (!chatId) throw new Error("Falha ao resolver o chat da interacao.");

					const insertedChatMessageResponse = await db
						.insert(chatMessages)
						.values({
							organizacaoId: organizationId,
							chatId,
							whatsappTemplateId: campaign.whatsappTemplate.id,
							autorTipo: "USUÁRIO",
							autorUsuarioId: campaign.autorId,
							conteudoTexto: renderedWhatsappContent,
							conteudoMidiaTipo: "TEXTO",
						})
						.returning({ id: chatMessages.id });

					insertedChatMessageId = insertedChatMessageResponse[0]?.id ?? null;
					if (!insertedChatMessageId) throw new Error("Falha ao inserir a mensagem no chat.");
				}

				if (whatsappToken && whatsappConnectionPhone.whatsappTelefoneId) {
					if (testing?.disableWhatsappCloudApi) {
						whatsappMessageId = `test-whatsapp-message-${interactionId}`;
					} else {
						const sentWhatsappTemplateResponse = await sendTemplateWhatsappMessage({
							fromPhoneNumberId: whatsappConnectionPhone.whatsappTelefoneId,
							templatePayload: payload,
							whatsappToken,
						});
						// console.log("[SEND_RESERVED_INTERACTION] WhatsApp template sent successfully:", sentWhatsappTemplateResponse);
						whatsappMessageId = sentWhatsappTemplateResponse.whatsappMessageId;
					}
				} else if (whatsappSessionId) {
					const gatewayPayload = { ...payload, to: formatPhoneForInternalGateway(effectivePhoneNumber) };
					const templateContent = parseTemplatePayloadToGatewayContent(gatewayPayload, { fallbackText: renderedWhatsappContent });

					if (testing?.disableInternalGateway) {
						interactionJobId = `test-gateway-job-${interactionId}`;
					} else {
						const sentWhatsappTemplateResponse = await sendMessage(
							whatsappSessionId,
							formatPhoneForInternalGateway(effectivePhoneNumber),
							templateContent,
							{
								clientMessageId: interactionId,
							},
						);
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
			} catch (error) {
				channelErrors.WHATSAPP = error instanceof Error ? error.message : "Falha desconhecida no WhatsApp.";
				if (insertedChatMessageId)
					await db.update(chatMessages).set({ whatsappMessageStatus: "FALHOU" }).where(eq(chatMessages.id, insertedChatMessageId));
			}
		}

		if (hasHubAccess && insertedChatMessageId && !channelErrors.WHATSAPP) {
			await db
				.update(chatMessages)
				.set({
					...(whatsappMessageId ? { whatsappMessageId } : {}),
					whatsappMessageStatus: interactionStatusEnvio === "PENDENTE" ? "PENDENTE" : "ENVIADO",
				})
				.where(eq(chatMessages.id, insertedChatMessageId));
		}

		if (!client.email) {
			channelsSkipped.push("EMAIL: cliente sem email");
		} else {
			channelsAttempted.push("EMAIL");
			try {
				const emailContent = {
					...campaign.whatsappTemplate.conteudo,
					assunto: replaceMessageTemplateVariables(campaign.whatsappTemplate.conteudo.assunto, runtimeContext.variaveis),
					preheader: replaceMessageTemplateVariables(campaign.whatsappTemplate.conteudo.preheader, runtimeContext.variaveis),
				};
				const emailResult = await sendEmailWithResend(
					client.email,
					EmailTemplate.MessageTemplate,
					{
						content: emailContent,
						variables: runtimeContext.variaveis,
						organization: {
							id: organizationId,
							name: organizationContext.organization?.nome ?? "RecompraCRM",
							logoUrl: organizationContext.organization?.logoUrl,
							primaryColor: organizationContext.organization?.corPrimaria,
							primaryForeground: organizationContext.organization?.corPrimariaForeground,
						},
						clientId: client.id,
						origin: runtimeContext.origin,
						headerMediaUrl: runtimeContext.cabecalhoMidiaUrl,
					},
					{
						from: {
							name: organizationContext.organization?.nome,
							prefix: organizationContext.organization?.nome,
						},
					},
				);
				// console.log("[SEND_RESERVED_INTERACTION] Email sent successfully:", emailResult);
				emailMessageId = (emailResult.data as { id?: string } | null | undefined)?.id;
			} catch (error) {
				channelErrors.EMAIL = error instanceof Error ? error.message : "Falha desconhecida no e-mail.";
			}
		}

		const successfulChannels = [whatsappMessageId || interactionJobId ? "WHATSAPP" : null, emailMessageId ? "EMAIL" : null].filter(
			(channel): channel is string => Boolean(channel),
		);
		const baseInteractionMetadata = getInteractionMetadata(interaction.metadados);
		const whatsappStatus = whatsappMessageId || interactionJobId ? interactionStatusEnvio : channelErrors.WHATSAPP ? "FALHOU" : null;
		const emailStatus = emailMessageId ? "ENVIADO" : channelErrors.EMAIL ? "FALHOU" : null;

		if (channelsAttempted.length === 0) {
			const errorMessage = "Cliente nao possui telefone nem e-mail para envio.";
			await blockInteractionSend({
				interactionId,
				organizationId,
				errorMessage,
			});
			await persistInteractionDeliveryState({
				interactionId,
				organizationId,
				baseMetadata: baseInteractionMetadata,
				statusEnvio: "BLOQUEADA",
				erroEnvio: errorMessage,
				messageTemplateId: campaign.whatsappTemplate.id,
				channelsAttempted,
				channelsSkipped,
				channelsSent: [],
				channelErrors,
			});
			return {
				success: false,
				status: "FAILED",
				error: errorMessage,
				channelsAttempted,
				channelsSkipped,
				channelsSent: [],
				channelErrors,
			};
		}

		if (successfulChannels.length === 0) {
			const errorMessage = Object.values(channelErrors).join(" | ") || "Houve uma falha ao enviar a mensagem.";
			await failInteractionSend({ interactionId, organizationId, errorMessage, insertedChatMessageId });
			await persistInteractionDeliveryState({
				interactionId,
				organizationId,
				baseMetadata: baseInteractionMetadata,
				statusEnvio: "FALHOU",
				erroEnvio: errorMessage,
				chatMessageId: insertedChatMessageId,
				messageTemplateId: campaign.whatsappTemplate.id,
				channelsAttempted,
				channelsSkipped,
				channelsSent: [],
				channelErrors,
				whatsappStatus,
				emailStatus,
			});
			return { success: false, status: "FAILED", error: errorMessage, channelsAttempted, channelsSkipped, channelsSent: [], channelErrors };
		}

		await persistInteractionDeliveryState({
			interactionId,
			organizationId,
			baseMetadata: baseInteractionMetadata,
			statusEnvio: interactionStatusEnvio,
			erroEnvio: Object.keys(channelErrors).length > 0 ? Object.values(channelErrors).join(" | ") : null,
			chatMessageId: insertedChatMessageId,
			whatsappMessageId,
			emailMessageId,
			clientMessageId: interactionClientMessageId,
			jobId: interactionJobId,
			messageTemplateId: campaign.whatsappTemplate.id,
			channelsAttempted,
			channelsSkipped,
			channelsSent: successfulChannels,
			channelErrors,
			whatsappStatus,
			emailStatus,
		});

		return {
			success: true,
			status: interactionStatusEnvio === "PENDENTE" ? "QUEUED" : "SENT",
			channelsAttempted,
			channelsSkipped,
			channelsSent: successfulChannels,
			channelErrors,
		};
	} catch (error) {
		console.error(`[INTERACTIONS] Failed to send interaction ${interactionId}:`, error);
		await failInteractionSend({
			interactionId,
			organizationId,
			errorMessage: "Houve uma falha ao enviar a mensagem.",
			insertedChatMessageId,
		});

		return { success: false, status: "FAILED", error: error instanceof Error ? error.message : "Unknown error" };
	}
}
