"use client";

import { renderWhatsappTextWithFormatting } from "@/components/Whatsapp/WhatsappMessageText";
import { getMessageTemplateButtonPreset } from "@/lib/message-templates/button-presets";
import { convertHtmlToWhatsappText } from "@/lib/message-templates/formatting";
import type { TUseMessageTemplateState } from "@/state-hooks/use-message-template-state";

export type TMessageTemplateEntity = TUseMessageTemplateState["state"]["messageTemplate"];
export type TMessageTemplateContentHeader = TMessageTemplateEntity["conteudo"]["cabecalho"];
export type TMessageTemplateButton = TMessageTemplateEntity["conteudo"]["botoes"][number];
export type TMessageTemplateParameter = TMessageTemplateEntity["conteudo"]["corpo"]["parametros"][number];

export type TOrganizationTemplateTheme = {
	name: string;
	logoUrl: string | null;
	primaryColor: string;
	primaryForeground: string;
	secondaryColor: string;
	secondaryForeground: string;
};

export function buildOrganizationTemplateTheme({
	name,
	logoUrl,
	primaryColor,
	primaryForeground,
	secondaryColor,
	secondaryForeground,
}: {
	name: string;
	logoUrl: string | null;
	primaryColor: string | null;
	primaryForeground: string | null;
	secondaryColor: string | null;
	secondaryForeground: string | null;
}): TOrganizationTemplateTheme {
	return {
		name,
		logoUrl,
		primaryColor: primaryColor || "#24549c",
		primaryForeground: primaryForeground || "#f8fafc",
		secondaryColor: secondaryColor || "#ffb900",
		secondaryForeground: secondaryForeground || "#171717",
	};
}

export function slugifyMessageTemplateSender(value: string) {
	return value
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "")
		.slice(0, 32);
}

export function renderResolvedTemplateWithHighlights(text: string, parametros: TMessageTemplateParameter[]) {
	return renderWhatsappTextWithFormatting(convertHtmlToWhatsappText(text), {
		renderVariable: ({ identifier, raw }) => {
			const parametro = parametros.find((item) => item.identificadorInterno === identifier);
			return <span className="rounded-md bg-primary/15 px-1 py-0.5 font-semibold text-primary">{parametro?.exemplo || raw}</span>;
		},
	});
}

export function getMessageTemplateButtonPreviewHref({ button, organizationId }: { button: TMessageTemplateButton; organizationId: string }) {
	if (button.tipo === "URL") return button.url;
	if (button.tipo !== "URL_PRESET") return "#";

	return (
		getMessageTemplateButtonPreset(button.preset)?.buildRuntimeUrl({
			origin: getDefaultAppOrigin(),
			orgId: organizationId,
			clientId: button.exemplo || "CLIENT_ID",
		}) ?? "#"
	);
}

function getDefaultAppOrigin() {
	if (typeof window !== "undefined") return window.location.origin;
	return process.env.NEXT_PUBLIC_APP_URL || "https://www.recompracrm.com.br";
}
