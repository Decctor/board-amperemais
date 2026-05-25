"use client";

import { getMessageTemplateButtonPreset } from "@/lib/message-templates/button-presets";
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
	const normalizedText = text
		.replace(/<span[^>]*data-type=["']mention["'][^>]*data-id=["']([^"']+)["'][^>]*>[\s\S]*?<\/span>/gi, (_, dataId: string) => `{{${dataId}}}`)
		.replace(/<\/p>\s*<p[^>]*>/gi, "\n")
		.replace(/<p[^>]*>/gi, "")
		.replace(/<\/p>/gi, "")
		.replace(/<br\s*\/?>/gi, "\n")
		.replace(/<[^>]+>/g, "");
	const nodes: React.ReactNode[] = [];
	let lastIndex = 0;
	let index = 0;
	for (const match of normalizedText.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)) {
		const start = match.index ?? 0;
		const end = start + match[0].length;
		const parametro = parametros.find((item) => item.identificadorInterno === match[1]);
		if (start > lastIndex) nodes.push(normalizedText.slice(lastIndex, start));
		nodes.push(
			<span key={`${match[0]}-${index}`} className="rounded-md bg-primary/15 px-1 py-0.5 font-semibold text-primary">
				{parametro?.exemplo || match[0]}
			</span>,
		);
		lastIndex = end;
		index += 1;
	}
	if (lastIndex < normalizedText.length) nodes.push(normalizedText.slice(lastIndex));
	return nodes.length > 0 ? nodes : normalizedText;
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
	return process.env.NEXT_PUBLIC_APP_URL || "https://app.recompracrm.com.br";
}
