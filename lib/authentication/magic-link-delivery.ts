import { EmailTemplate, sendEmailWithResend } from "@/lib/email";
import { sendTemplateWhatsappMessage } from "@/lib/whatsapp";
import type { TemplatePayload } from "@/lib/whatsapp/templates";
import { formatPhoneForInternalGateway, sanitizeTemplateParameter } from "@/lib/whatsapp/utils";

export const MAGIC_LINK_EXPIRES_IN_MINUTES = 30;

const AUTHENTICATION_TEMPLATE_NAME = "recompracrm_verification_code";
const AUTHENTICATION_TEMPLATE_LANGUAGE = "pt_BR";

type SendMagicLinkVerificationParams = {
	email: string;
	phone?: string | null;
	verificationToken: string;
	verificationCode: string;
	expiresInMinutes?: number;
};

function buildMagicLinkUrl(verificationToken: string) {
	return `${process.env.NEXT_PUBLIC_URL}/auth/magic-link/callback?token=${verificationToken}`;
}

function buildAuthenticationTemplatePayload({
	toPhoneNumber,
	verificationCode,
}: {
	toPhoneNumber: string;
	verificationCode: string;
}): TemplatePayload {
	const sanitizedVerificationCode = sanitizeTemplateParameter(verificationCode);

	return {
		messaging_product: "whatsapp",
		to: formatPhoneForInternalGateway(toPhoneNumber),
		type: "template",
		template: {
			name: AUTHENTICATION_TEMPLATE_NAME,
			language: { code: AUTHENTICATION_TEMPLATE_LANGUAGE },
			components: [
				{
					type: "body",
					parameters: [
						{
							type: "text",
							text: sanitizedVerificationCode,
						},
					],
				},
				{
					type: "button",
					sub_type: "url",
					index: "0",
					parameters: [
						{
							type: "text",
							text: sanitizedVerificationCode,
						},
					],
				},
			],
		},
	};
}

async function sendMagicLinkEmail({ email, verificationToken, verificationCode, expiresInMinutes }: Omit<SendMagicLinkVerificationParams, "phone">) {
	return sendEmailWithResend(email, EmailTemplate.AuthMagicLink, {
		magicLink: buildMagicLinkUrl(verificationToken),
		verificationCode,
		expiresInMinutes: expiresInMinutes ?? MAGIC_LINK_EXPIRES_IN_MINUTES,
	});
}

async function sendMagicLinkWhatsapp({ phone, verificationCode }: Pick<SendMagicLinkVerificationParams, "phone" | "verificationCode">) {
	if (!phone?.trim()) return null;

	const whatsappToken = process.env.META_ACCESS_TOKEN;
	const whatsappPhoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID;

	if (!whatsappToken || !whatsappPhoneNumberId) {
		console.warn("[WARN] [AUTH_MAGIC_LINK_WHATSAPP] WhatsApp env vars not configured; skipping WhatsApp delivery.");
		return null;
	}

	return sendTemplateWhatsappMessage({
		fromPhoneNumberId: whatsappPhoneNumberId,
		templatePayload: buildAuthenticationTemplatePayload({
			toPhoneNumber: phone,
			verificationCode,
		}),
		whatsappToken,
	});
}

export async function sendMagicLinkVerification({
	email,
	phone,
	verificationToken,
	verificationCode,
	expiresInMinutes = MAGIC_LINK_EXPIRES_IN_MINUTES,
}: SendMagicLinkVerificationParams) {
	const [emailResult, whatsappResult] = await Promise.allSettled([
		sendMagicLinkEmail({
			email,
			verificationToken,
			verificationCode,
			expiresInMinutes,
		}),
		sendMagicLinkWhatsapp({
			phone,
			verificationCode,
		}),
	]);

	if (whatsappResult.status === "rejected") {
		console.error("[ERROR] [AUTH_MAGIC_LINK_WHATSAPP] WhatsApp delivery failed:", whatsappResult.reason);
	}

	if (emailResult.status === "rejected") {
		throw emailResult.reason;
	}

	return {
		email: emailResult.value,
		whatsapp: whatsappResult.status === "fulfilled" ? whatsappResult.value : null,
	};
}
