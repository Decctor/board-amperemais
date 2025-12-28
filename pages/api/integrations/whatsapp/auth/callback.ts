import { api } from "@/convex/_generated/api";
import { FacebookOAuth } from "@/lib/authentication/oauth";
import { getCurrentSessionUncached } from "@/lib/authentication/pages-session";

import { ConvexHttpClient } from "convex/browser";
import dayjs from "dayjs";
import type { NextApiRequest, NextApiResponse } from "next";

type TWhatsappIntegrationData = {
	tipo: "WHATSAPP";
	organizacaoId: string;
	token: string;
	dataExpiracao: string;
	metaAutorAppId: string;
	metaEscopo: string[];
	telefones: { nome: string; whatsappBusinessAccountId: string; whatsappTelefoneId: string; numero: string }[];
};
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL as string;
// Este é um pseudo-código para o banco de dados. Adapte para sua implementação (Prisma, etc.)
async function saveCredentialsToDB(whatsappConnection: TWhatsappIntegrationData) {
	console.log("Salvando no DB:", { whatsappConnection });
	const convex = new ConvexHttpClient(CONVEX_URL);
	// LÓGICA DO SEU BANCO DE DADOS AQUI
	await convex.mutation(api.mutations.connections.syncWhatsappConnection, {
		organizacaoId: whatsappConnection.organizacaoId,
		token: whatsappConnection.token,
		dataExpiracao: new Date(whatsappConnection.dataExpiracao).getTime(),
		metaAutorAppId: whatsappConnection.metaAutorAppId,
		metaEscopo: whatsappConnection.metaEscopo,
		telefones: whatsappConnection.telefones,
	});
	return true;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	// Get user session to determine organization
	const sessionUser = await getCurrentSessionUncached(req.cookies);
	if (!sessionUser) {
		return res.status(401).json({ error: "Você precisa estar autenticado para conectar o WhatsApp." });
	}
	const userOrgId = sessionUser.user.organizacaoId;
	if (!userOrgId) {
		return res.status(400).json({ error: "Você precisa estar vinculado a uma organização para conectar o WhatsApp." });
	}
	console.log("[INFO] [WHATSAPP_CONNECT_CALLBACK] Query Params:", req.query);
	console.log("[INFO] [WHATSAPP_CONNECT_CALLBACK] Body:", req.body);
	const { code, state } = req.query;
	if (!code) {
		return res.status(400).json({ error: "Authorization code is missing." });
	}

	const appId = process.env.NEXT_PUBLIC_META_APP_ID;
	const appSecret = process.env.META_APP_SECRET;
	// O redirect_uri deve ser um dos URIs configurados no seu painel da Meta
	const tokens = await FacebookOAuth.validateAuthorizationCode(code as string);
	let accessToken: string | undefined;
	let accessTokenExpiresAt: Date | undefined;
	try {
		accessToken = tokens.accessToken();
		accessTokenExpiresAt = tokens.accessTokenExpiresAt();
	} catch (error) {
		console.error("[ERROR] [WHATSAPP_CONNECT_CALLBACK] Error validating authorization code:", error);
	}

	console.log("[INFO] [WHATSAPP_CONNECT_CALLBACK] Tokens:", { tokens, accessToken, accessTokenExpiresAt });

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
					const subscribeUrl = `https://graph.facebook.com/v19.0/${whatsappBusinessAccountId}/subscribed_apps`;
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

				const phoneNumbersUrl = `https://graph.facebook.com/v19.0/${whatsappBusinessAccountId}/phone_numbers?access_token=${accessToken}`;
				const phoneNumbersResponse = await fetch(phoneNumbersUrl);
				const phoneNumbersDataResult = await phoneNumbersResponse.json();
				const phoneNumbersData = phoneNumbersDataResult.data[0];
				console.log(`[INFO] [WHATSAPP_CONNECT] Phone Numbers Data for ${whatsappBusinessAccountId}:`, phoneNumbersData);
				if (phoneNumbersData.platform_type !== "CLOUD_API") return null;
				return {
					nome: phoneNumbersData.verified_name as string,
					whatsappBusinessAccountId: whatsappBusinessAccountId,
					whatsappTelefoneId: phoneNumbersData.id,
					numero: phoneNumbersData.display_phone_number,
				};
			}),
		)
	).filter((p) => !!p);

	const whatsappConnection: TWhatsappIntegrationData = {
		tipo: "WHATSAPP",
		organizacaoId: userOrgId,
		token: accessToken ?? "",
		dataExpiracao: accessTokenExpiresAt?.toISOString() ?? dayjs().add(1, "month").toISOString(),
		metaAutorAppId: debugData.data?.user_id,
		metaEscopo: debugData.data?.scopes,
		telefones: phones,
	};

	await saveCredentialsToDB(whatsappConnection);
	return res.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?view=meta-oauth`);
}
