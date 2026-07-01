import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import {
	applyWhatsappSubmissionResultToMetadata,
	getOrganizationWhatsappPhones,
	submitMessageTemplateToWhatsappPhone,
} from "@/app/api/message-templates/_lib";
import { consumeOAuthRedirect } from "@/lib/integrations/oauth-redirect";
import { triggerSmbAppContactsSync } from "@/lib/whatsapp/smb-contacts-sync";
import { db } from "@/services/drizzle";
import { messageTemplates, type TNewWhatsappConnection, whatsappConnectionPhones, whatsappConnections } from "@/services/drizzle/schema";
import { campaigns } from "@/services/drizzle/schema/campaigns";
import { and, eq, isNull } from "drizzle-orm";

import dayjs from "dayjs";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { WHATSAPP_OAUTH_REDIRECT_COOKIE_NAME } from "../route";

type TWhatsappIntegrationData = {
	tipo: "WHATSAPP";
	organizacaoId: string;
	token: string;
	dataExpiracao: string;
	metaAutorAppId: string;
	metaEscopo: string[];
	telefones: { nome: string; whatsappBusinessAccountId: string; whatsappTelefoneId: string; numero: string }[];
};

async function getWhatsappAuthCallbackRoute(req: NextRequest) {
	// Get user session to determine organization
	const sessionUser = await getCurrentSessionUncached();
	if (!sessionUser) {
		return NextResponse.json({ error: "Você precisa estar autenticado para conectar o WhatsApp." }, { status: 401 });
	}
	const userOrgId = sessionUser.membership?.organizacao.id;
	if (!userOrgId) {
		return NextResponse.json({ error: "Você precisa estar vinculado a uma organização para conectar o WhatsApp." }, { status: 400 });
	}
	const searchParams = req.nextUrl.searchParams;
	console.log("[INFO] [WHATSAPP_CONNECT_CALLBACK] Query Params:", Object.fromEntries(searchParams));
	const code = searchParams.get("code");
	const state = searchParams.get("state");
	void state;
	if (!code) {
		return NextResponse.json({ error: "Authorization code is missing." }, { status: 400 });
	}

	const appId = process.env.NEXT_PUBLIC_META_APP_ID;
	const appSecret = process.env.META_APP_SECRET;
	const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/whatsapp/auth/callback`;

	console.log("[INFO] [WHATSAPP_CONNECT_CALLBACK] Config:", {
		appId,
		appSecretPresent: !!appSecret,
		redirectUri,
		codeLength: code.length,
	});

	// O redirect_uri deve ser um dos URIs configurados no seu painel da Meta
	let tokens: any; // Usando any temporariamente para lidar com a resposta manual
	let accessToken: string | undefined;
	let accessTokenExpiresAt: Date | undefined;

	try {
		// Tentativa manual de troca de token para debug detalhado e contorno de erro da lib
		const tokenUrl = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
		tokenUrl.searchParams.set("client_id", appId as string);
		tokenUrl.searchParams.set("redirect_uri", redirectUri);
		tokenUrl.searchParams.set("client_secret", appSecret as string);
		tokenUrl.searchParams.set("code", code);

		console.log("[INFO] [WHATSAPP_CONNECT_CALLBACK] Trocando código por token manualmente:", tokenUrl.toString().replace(appSecret as string, "***"));

		const response = await fetch(tokenUrl.toString());
		const data = await response.json();

		console.log("[INFO] [WHATSAPP_CONNECT_CALLBACK] Resposta da troca de token:", data);

		if (data.error) {
			throw {
				message: data.error.message,
				data: data.error,
				status: 400,
			};
		}

		// Mapeia a resposta manual para o formato esperado
		accessToken = data.access_token;
		if (data.expires_in) {
			accessTokenExpiresAt = dayjs().add(data.expires_in, "seconds").toDate();
		} else {
			// Se não vier expires_in, definimos um padrão de 60 dias (token de longa duração comum no FB)
			console.warn("[WARN] 'expires_in' não retornado pela Meta. Usando padrão de 60 dias.");
			accessTokenExpiresAt = dayjs().add(60, "days").toDate();
		}

		// Simula o objeto tokens para compatibilidade se necessário, mas já extraímos o que precisamos
		tokens = {
			accessToken: () => accessToken,
			accessTokenExpiresAt: () => accessTokenExpiresAt,
		};
	} catch (error: any) {
		console.error("[ERROR] [WHATSAPP_CONNECT_CALLBACK] Error validating authorization code:", {
			message: error.message,
			status: error.status,
			data: error.data,
			stack: error.stack,
		});
		return NextResponse.json(
			{
				error: "Falha ao validar código de autorização",
				details: error.data || error.message,
				hint: "Verifique se o redirect_uri no Meta App Dashboard corresponde exatamente a: " + redirectUri,
			},
			{ status: 400 },
		);
	}

	console.log("[INFO] [WHATSAPP_CONNECT_CALLBACK] Tokens obtidos com sucesso:", {
		hasAccessToken: !!accessToken,
		accessTokenExpiresAt,
		tokenLength: accessToken?.length,
	});

	const debugUrl = `https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${appId}|${appSecret}`;
	const debugResponse = await fetch(debugUrl);
	const debugData = await debugResponse.json();

	console.log("[INFO] [WHATSAPP_CONNECT_CALLBACK] Debug Data:", debugData);
	console.log("[INFO] [WHATSAPP_CONNECT_CALLBACK] Debug Data Granular Scopes:", debugData.data?.granular_scopes);

	const whatsappMessagingTargeIds =
		debugData.data?.granular_scopes.find((scope: any) => scope.scope === "whatsapp_business_messaging")?.target_ids ?? [];
	const phones = (
		await Promise.all(
			whatsappMessagingTargeIds.map(async (targetId: string) => {
				const whatsappBusinessAccountId = targetId;

				try {
					const subscribeUrl = `https://graph.facebook.com/v21.0/${whatsappBusinessAccountId}/subscribed_apps`;
					const subscribeResponse = await fetch(subscribeUrl, {
						method: "POST",
						headers: {
							Authorization: `Bearer ${accessToken}`,
						},
					});
					const subscribeResult = await subscribeResponse.json();

					if (subscribeResult.success) {
						console.log(`[SUCCESS] App inscrito com sucesso no WABA: ${whatsappBusinessAccountId}`);
					} else {
						console.error("[ERROR] Falha ao inscrever app no WABA:", subscribeResult);
					}
				} catch (error) {
					console.error(`[ERROR] Erro na requisição de subscribed_apps para ${whatsappBusinessAccountId}:`, error);
				}

				const phoneNumbersUrl = `https://graph.facebook.com/v21.0/${whatsappBusinessAccountId}/phone_numbers?access_token=${accessToken}`;
				const phoneNumbersResponse = await fetch(phoneNumbersUrl);
				const phoneNumbersDataResult = await phoneNumbersResponse.json();
				const phoneNumbersList = (phoneNumbersDataResult.data ?? []) as Array<{
					id: string;
					verified_name?: string | null;
					display_phone_number: string;
					platform_type: string;
				}>;
				console.log(`[INFO] [WHATSAPP_CONNECT] Phone Numbers Data for ${whatsappBusinessAccountId}:`, phoneNumbersList);
				return phoneNumbersList
					.filter((phoneNumbersData) => phoneNumbersData.platform_type === "CLOUD_API")
					.map((phoneNumbersData) => ({
						nome: phoneNumbersData.verified_name?.trim() || phoneNumbersData.display_phone_number,
						whatsappBusinessAccountId,
						whatsappTelefoneId: phoneNumbersData.id,
						numero: phoneNumbersData.display_phone_number,
					}));
			}),
		)
	).flat();

	if (phones.length === 0) {
		console.error("[ERROR] [WHATSAPP_CONNECT_CALLBACK] Nenhum número Cloud API encontrado nos WABAs autorizados.");
		return NextResponse.json(
			{
				error: "Nenhum número de WhatsApp Cloud API foi encontrado na conta conectada.",
				hint: "Verifique se o número está registrado na API Cloud da Meta e se as permissões de mensagens foram concedidas.",
			},
			{ status: 400 },
		);
	}

	const insertedPhones = await db.transaction(async (tx) => {
		const whatsappConnection: TNewWhatsappConnection = {
			organizacaoId: userOrgId,
			token: accessToken ?? "",
			dataExpiracao: accessTokenExpiresAt ?? dayjs().add(1, "month").toDate(),
			autorId: sessionUser.user.id,
			metaEscopo: debugData.data?.scopes.join(","),
		};

		const insertedWhatsappConnection = await tx.insert(whatsappConnections).values(whatsappConnection).returning({ id: whatsappConnections.id });
		const insertedWhatsappConnectionId = insertedWhatsappConnection[0]?.id;
		if (!insertedWhatsappConnectionId) throw new Error("Failed to insert whatsapp connection");

		const insertedWhatsappConnectionPhones = await tx
			.insert(whatsappConnectionPhones)
			.values(
				phones.map((phone) => ({
					conexaoId: insertedWhatsappConnectionId,
					nome: phone.nome,
					whatsappBusinessAccountId: phone.whatsappBusinessAccountId,
					whatsappTelefoneId: phone.whatsappTelefoneId,
					numero: phone.numero,
				})),
			)
			.returning({
				id: whatsappConnectionPhones.id,
				whatsappBusinessAccountId: whatsappConnectionPhones.whatsappBusinessAccountId,
				whatsappTelefoneId: whatsappConnectionPhones.whatsappTelefoneId,
			});

		if (insertedWhatsappConnectionPhones.length === 0) {
			throw new Error("Failed to insert whatsapp connection phones");
		}

		const firstPhoneId = insertedWhatsappConnectionPhones[0]?.id;
		if (firstPhoneId) {
			await tx
				.update(campaigns)
				.set({
					whatsappConexaoTelefoneId: firstPhoneId,
				})
				.where(and(eq(campaigns.organizacaoId, userOrgId), isNull(campaigns.whatsappConexaoTelefoneId)));
		}

		return insertedWhatsappConnectionPhones;
	});

	for (const phone of insertedPhones) {
		if (!phone.whatsappTelefoneId || !accessToken) continue;
		try {
			const contactsSync = await triggerSmbAppContactsSync({
				phoneNumberId: phone.whatsappTelefoneId,
				accessToken,
			});
			console.log("[INFO] [WHATSAPP_CONNECT_CALLBACK] Contacts sync result:", {
				phoneId: phone.id,
				...contactsSync,
			});
		} catch (error) {
			// The WhatsApp connection must remain usable even if the asynchronous contacts sync cannot be requested.
			console.error("[ERROR] [WHATSAPP_CONNECT_CALLBACK] Failed to request contacts sync:", {
				phoneId: phone.id,
				error,
			});
		}
	}
	console.log("[INFO] [WHATSAPP_CONNECT_CALLBACK] Starting automatic message template submission for connected phones");
	const insertedPhoneIds = new Set(insertedPhones.map((phone) => phone.id));
	const phonesToSync = (await getOrganizationWhatsappPhones(userOrgId)).filter((phone) => insertedPhoneIds.has(phone.id));
	const organizationTemplates = await db.query.messageTemplates.findMany({
		where: eq(messageTemplates.organizacaoId, userOrgId),
	});

	for (const template of organizationTemplates) {
		let nextMetadata = template.metadados;
		let nextContent = template.conteudo;

		for (const phone of phonesToSync) {
			try {
				if (nextMetadata.porNumeroTelefone[phone.id]?.idExterno) continue;
				const result = await submitMessageTemplateToWhatsappPhone({
					template: { ...template, metadados: nextMetadata, conteudo: nextContent },
					phone,
					organizationId: userOrgId,
					origin: "whatsapp_auth_callback",
					mode: "create",
				});
				nextMetadata = applyWhatsappSubmissionResultToMetadata({
					metadata: nextMetadata,
					phoneId: phone.id,
					idExterno: result.idExterno,
				});
				if (result.content) nextContent = result.content;
				console.log(`[INFO] [WHATSAPP_CONNECT_CALLBACK] Message template ${template.id} submitted for phone ${phone.id}`);
			} catch (error) {
				console.error(`[ERROR] [WHATSAPP_CONNECT_CALLBACK] Failed to submit message template ${template.id} for phone ${phone.id}:`, error);
			}
		}

		if (nextMetadata !== template.metadados || nextContent !== template.conteudo) {
			await db
				.update(messageTemplates)
				.set({
					metadados: nextMetadata,
					conteudo: nextContent,
					dataAtualizacao: new Date(),
				})
				.where(eq(messageTemplates.id, template.id));
		}
	}

	const cookieStore = await cookies();
	const redirectPath = consumeOAuthRedirect(cookieStore, WHATSAPP_OAUTH_REDIRECT_COOKIE_NAME, "/dashboard/settings?view=meta-oauth");
	return NextResponse.redirect(new URL(redirectPath, process.env.NEXT_PUBLIC_APP_URL));
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = appApiHandler({
	GET: getWhatsappAuthCallbackRoute,
});
