"use client";

import { DynamicHeaderImagePreview } from "@/app/dashboard/communication/_components/dynamic-header-image-preview";
import { WhatsappIcon } from "@/components/icons";
import { Mail } from "lucide-react";
import {
	getMessageTemplateButtonPreviewHref,
	renderResolvedTemplateWithHighlights,
	slugifyMessageTemplateSender,
	type TMessageTemplateButton,
	type TMessageTemplateEntity,
	type TOrganizationTemplateTheme,
} from "./message-template-utils";
import { MessageTemplateValidationNotice } from "./MessageTemplateFields";

export function MessageTemplateWhatsappPreview({
	messageTemplate,
	organizationTheme,
	warnings,
}: {
	messageTemplate: TMessageTemplateEntity;
	organizationTheme: TOrganizationTemplateTheme;
	warnings: string[];
}) {
	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-center gap-2 text-sm font-bold">
				<WhatsappIcon className="h-4 w-4 text-emerald-600" />
				WhatsApp
			</div>
			<div className="rounded-2xl bg-[#e8f5e9] p-3">
				<div className="ml-auto flex max-w-[92%] flex-col gap-2 rounded-xl bg-white p-3 text-sm shadow-sm">
					<MessageTemplateHeaderPreview messageTemplate={messageTemplate} organizationTheme={organizationTheme} variant="whatsapp" />
					<p className="whitespace-pre-wrap leading-5">
						{renderResolvedTemplateWithHighlights(messageTemplate.conteudo.corpo.conteudo, messageTemplate.conteudo.corpo.parametros)}
					</p>
					{messageTemplate.conteudo.rodape ? (
						<p className="text-muted-foreground border-t pt-2 text-xs">
							{renderResolvedTemplateWithHighlights(messageTemplate.conteudo.rodape, messageTemplate.conteudo.corpo.parametros)}
						</p>
					) : null}
					{messageTemplate.conteudo.botoes.length > 0 ? (
						<div className="flex flex-col gap-1 border-t pt-2">
							{messageTemplate.conteudo.botoes.map((button, index) => (
								<button key={index} type="button" className="text-sky-600 text-xs font-bold">
									{button.texto}
									{button.tipo === "URL_PRESET" ? " ↗" : null}
								</button>
							))}
						</div>
					) : null}
				</div>
			</div>
			<MessageTemplateValidationNotice warnings={warnings} />
		</div>
	);
}

export function MessageTemplateEmailPreview({
	messageTemplate,
	organizationId,
	organizationName,
	organizationTheme,
	warnings,
}: {
	messageTemplate: TMessageTemplateEntity;
	organizationId: string;
	organizationName: string;
	organizationTheme: TOrganizationTemplateTheme;
	warnings: string[];
}) {
	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-center gap-2 text-sm font-bold">
				<Mail className="h-4 w-4 text-sky-600" />
				E-mail
			</div>
			<div className="border-border overflow-hidden rounded-xl border bg-white text-zinc-950">
				<div className="border-b bg-zinc-50 p-3">
					<p className="text-xs text-zinc-500">
						De: {organizationName} &lt;{slugifyMessageTemplateSender(organizationName)}@recompracrm.com.br&gt;
					</p>
					<p className="mt-1 text-sm font-bold">
						{renderResolvedTemplateWithHighlights(messageTemplate.conteudo.assunto || "Assunto do e-mail", messageTemplate.conteudo.corpo.parametros)}
					</p>
					{messageTemplate.conteudo.preheader ? (
						<p className="text-xs text-zinc-500">
							{renderResolvedTemplateWithHighlights(messageTemplate.conteudo.preheader, messageTemplate.conteudo.corpo.parametros)}
						</p>
					) : null}
				</div>
				<div className="p-4">
					<MessageTemplateHeaderPreview messageTemplate={messageTemplate} organizationTheme={organizationTheme} variant="email" />
					<p className="whitespace-pre-wrap text-sm leading-6">
						{renderResolvedTemplateWithHighlights(messageTemplate.conteudo.corpo.conteudo, messageTemplate.conteudo.corpo.parametros)}
					</p>
					{messageTemplate.conteudo.botoes[0] ? <EmailPreviewButton button={messageTemplate.conteudo.botoes[0]} organizationId={organizationId} /> : null}
					{messageTemplate.conteudo.rodape ? (
						<p className="mt-5 border-t pt-3 text-xs text-zinc-500">
							{renderResolvedTemplateWithHighlights(messageTemplate.conteudo.rodape, messageTemplate.conteudo.corpo.parametros)}
						</p>
					) : null}
				</div>
			</div>
			<MessageTemplateValidationNotice warnings={warnings} />
		</div>
	);
}

function MessageTemplateHeaderPreview({
	messageTemplate,
	organizationTheme,
	variant,
}: {
	messageTemplate: TMessageTemplateEntity;
	organizationTheme: TOrganizationTemplateTheme;
	variant: "whatsapp" | "email";
}) {
	const header = messageTemplate.conteudo.cabecalho;
	const textClassName = variant === "email" ? "mb-3 text-lg font-bold" : "font-bold";
	const mediaWrapperClassName = variant === "email" ? "mb-4" : "";

	if (header?.tipo === "TEXTO" && header.conteudoTexto) {
		return <p className={textClassName}>{renderResolvedTemplateWithHighlights(header.conteudoTexto, messageTemplate.conteudo.corpo.parametros)}</p>;
	}

	if (header?.tipo === "IMAGEM_DINAMICA") {
		return (
			<div className={mediaWrapperClassName}>
				<DynamicHeaderImagePreview presetId={header.imagemDinamicaPreset || "CASHBACK_AVAILABLE_BALANCE"} organizationTheme={organizationTheme} />
			</div>
		);
	}

	if (header?.tipo && header.tipo !== "NENHUM") {
		return (
			<div className={mediaWrapperClassName}>
				<HeaderMediaPreview type={header.tipo} url={header.conteudoMidiaUrl || ""} />
			</div>
		);
	}

	return null;
}

function EmailPreviewButton({ button, organizationId }: { button: TMessageTemplateButton; organizationId: string }) {
	return (
		<a
			href={getMessageTemplateButtonPreviewHref({ button, organizationId })}
			className="mt-4 inline-flex rounded-md bg-zinc-950 px-4 py-2 text-xs font-bold text-white"
			onClick={(event) => event.preventDefault()}
		>
			{button.texto}
		</a>
	);
}

function HeaderMediaPreview({ type, url }: { type: NonNullable<TMessageTemplateEntity["conteudo"]["cabecalho"]>["tipo"]; url: string }) {
	if (!url) {
		return <div className="bg-muted text-muted-foreground flex h-24 items-center justify-center rounded-lg text-xs font-semibold">{type}</div>;
	}

	if (type === "IMAGEM") {
		return <img src={url} alt="Cabeçalho do template" className="h-32 w-full rounded-lg object-cover" />;
	}

	if (type === "VIDEO") {
		return (
			<video src={url} className="h-32 w-full rounded-lg object-cover" controls>
				<track kind="captions" />
			</video>
		);
	}

	return (
		<a
			href={url}
			target="_blank"
			rel="noreferrer"
			className="bg-muted text-muted-foreground flex h-20 items-center justify-center rounded-lg text-xs font-semibold"
		>
			Documento anexado
		</a>
	);
}
