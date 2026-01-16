import { resend } from "@/services/resend";
import MagicLinkTemplate from "@/services/resend/templates/MagicLink";
import type { ComponentProps } from "react";

export enum EmailTemplate {
	AuthMagicLink = "AuthMagicLink",
}

export type PropsMap = {
	[EmailTemplate.AuthMagicLink]: ComponentProps<typeof MagicLinkTemplate>;
	// [EmailTemplate.PasswordReset]: ComponentProps<typeof ResetPasswordTemplate>;
};

function getReactEmailTemplateAndSubject<T extends EmailTemplate>(template: T, props: PropsMap[NoInfer<T>]) {
	switch (template) {
		case EmailTemplate.AuthMagicLink:
			console.log(props);
			return {
				templateComponent: <MagicLinkTemplate {...(props as PropsMap[EmailTemplate.AuthMagicLink])} />,
				subject: "Aqui está seu link de acesso ao Conecta Ampère.",
			};
		default:
			throw new Error("Template de email inválido.");
	}
}

export const sendEmailWithResend = async <T extends EmailTemplate>(to: string, template: T, props: PropsMap[NoInfer<T>]) => {
	try {
		const { templateComponent, subject } = getReactEmailTemplateAndSubject(template, props);
		const { data, error } = await resend.emails.send({
			from: "RecompraCRM <noreply@recompracrm.com.br>",
			to: [to],
			subject: subject,
			react: templateComponent,
		});
		console.log("RESPONSE RESEND", data);
		console.log("ERROR RESEND", error);
		return { success: true };
	} catch (error) {
		console.log(error);
	}
};
