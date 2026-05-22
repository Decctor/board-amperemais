import { Body, Button, Container, Head, Heading, Hr, Html, Img, Link, Preview, Section, Text } from "@react-email/components";
import {
	convertHtmlToPlainMessageText,
	getDefaultAppOrigin,
	getMessageTemplateButtonPreset,
	replaceMessageTemplateVariables,
	type TMessageTemplateRuntimeValues,
} from "@/lib/message-templates";
import type { TMessageTemplateContent } from "@/schemas/message-templates";
import * as React from "react";

type MessageTemplateEmailProps = {
	content: TMessageTemplateContent;
	variables: TMessageTemplateRuntimeValues;
	organization: {
		id: string;
		name: string;
		logoUrl?: string | null;
		primaryColor?: string | null;
		primaryForeground?: string | null;
	};
	clientId?: string | null;
	origin?: string;
	headerMediaUrl?: string | null;
};

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_URL || "";

function resolveText(text: string | null | undefined, variables: TMessageTemplateRuntimeValues) {
	return replaceMessageTemplateVariables(text ?? "", variables);
}

function resolveButtonHref({
	button,
	organizationId,
	clientId,
	origin,
}: {
	button: TMessageTemplateContent["botoes"][number];
	organizationId: string;
	clientId?: string | null;
	origin: string;
}) {
	if (button.tipo === "URL") return button.url;
	if (button.tipo === "URL_PRESET") {
		const preset = getMessageTemplateButtonPreset(button.preset);
		return (
			preset?.buildRuntimeUrl({
				origin,
				orgId: organizationId,
				clientId: clientId ?? button.exemplo,
			}) ?? "#"
		);
	}
	if (button.tipo === "TELEFONE") return `tel:${button.telefone.replace(/[^0-9+]/g, "")}`;
	return "#";
}

function HeaderBlock({
	content,
	variables,
	headerMediaUrl,
	organization,
}: {
	content: TMessageTemplateContent;
	variables: TMessageTemplateRuntimeValues;
	headerMediaUrl?: string | null;
	organization: MessageTemplateEmailProps["organization"];
}) {
	const header = content.cabecalho;
	if (!header || header.tipo === "NENHUM") return null;

	if (header.tipo === "TEXTO" && header.conteudoTexto) {
		return (
			<Section style={textHeader}>
				<Heading style={textHeaderTitle}>{resolveText(header.conteudoTexto, variables)}</Heading>
			</Section>
		);
	}

	const mediaUrl = header.tipo === "IMAGEM_DINAMICA" ? headerMediaUrl : header.conteudoMidiaUrl;
	if ((header.tipo === "IMAGEM" || header.tipo === "IMAGEM_DINAMICA") && mediaUrl) {
		return (
			<Section style={imageHeader}>
				<Img src={mediaUrl} width="600" alt="Cabeçalho do email" style={coverImage} />
			</Section>
		);
	}

	if (header.tipo === "VIDEO" && mediaUrl) {
		return (
			<Section style={fallbackHeader}>
				<Text style={fallbackHeaderText}>Há um vídeo associado a esta mensagem.</Text>
				<Link href={mediaUrl} style={fallbackHeaderLink}>
					Abrir vídeo
				</Link>
			</Section>
		);
	}

	if (header.tipo === "DOCUMENTO" && mediaUrl) {
		return (
			<Section style={fallbackHeader}>
				<Text style={fallbackHeaderText}>Há um documento associado a esta mensagem.</Text>
				<Link href={mediaUrl} style={fallbackHeaderLink}>
					Abrir documento
				</Link>
			</Section>
		);
	}

	if (header.tipo === "LOCALIZAÇÃO" && header.conteudoLocalizacao) {
		return (
			<Section style={fallbackHeader}>
				<Text style={locationTitle}>{header.conteudoLocalizacao.titulo}</Text>
				<Text style={fallbackHeaderText}>{header.conteudoLocalizacao.endereco}</Text>
			</Section>
		);
	}

	return (
		<Section style={fallbackHeader}>
			<Text style={fallbackHeaderText}>{organization.name}</Text>
		</Section>
	);
}

export default function MessageTemplateEmail({ content, variables, organization, clientId, origin, headerMediaUrl }: MessageTemplateEmailProps) {
	const effectiveOrigin = origin || getDefaultAppOrigin();
	const primaryColor = organization.primaryColor || "#24549C";
	const primaryForeground = organization.primaryForeground || "#ffffff";

	return (
		<Html>
			<Head />
			<Preview>{resolveText(content.preheader, variables)}</Preview>
			<Body style={main}>
				<Container style={container}>
					<Section style={brandHeader}>
						{organization.logoUrl ? <Img src={organization.logoUrl} width="56" height="56" alt={organization.name} style={logo} /> : null}
						<Text style={brandName}>{organization.name}</Text>
					</Section>

					<HeaderBlock content={content} variables={variables} headerMediaUrl={headerMediaUrl} organization={organization} />

					<Section style={contentSection}>
						<Text style={bodyText}>{convertHtmlToPlainMessageText(resolveText(content.corpo.conteudo, variables))}</Text>

						{content.botoes.length > 0 ? (
							<Section style={buttonsSection}>
								{content.botoes.map((button, index) => (
									<Button
										key={`${button.tipo}-${button.texto}-${index}`}
										style={{ ...buttonStyle, backgroundColor: primaryColor, color: primaryForeground }}
										href={resolveButtonHref({
											button,
											organizationId: organization.id,
											clientId,
											origin: effectiveOrigin,
										})}
									>
										{resolveText(button.texto, variables)}
									</Button>
								))}
							</Section>
						) : null}

						{content.rodape ? (
							<>
								<Hr style={hr} />
								<Text style={footerText}>{resolveText(content.rodape, variables)}</Text>
							</>
						) : null}
					</Section>

					<Section style={footer}>
						<Text style={footerCopyright}>
							{organization.name} via RecompraCRM
							<br />
							<Link href={baseUrl || effectiveOrigin} style={{ ...link, color: primaryColor }}>
								{(baseUrl || effectiveOrigin).replace(/^https?:\/\//, "")}
							</Link>
						</Text>
					</Section>
				</Container>
			</Body>
		</Html>
	);
}

const main = {
	backgroundColor: "#f6f9fc",
	fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
	backgroundColor: "#ffffff",
	margin: "0 auto",
	marginBottom: "64px",
	maxWidth: "600px",
	overflow: "hidden",
};

const brandHeader = {
	padding: "24px 28px",
	textAlign: "center" as const,
};

const logo = {
	borderRadius: "14px",
	display: "block",
	margin: "0 auto 10px",
	objectFit: "cover" as const,
};

const brandName = {
	color: "#111827",
	fontSize: "15px",
	fontWeight: "700",
	margin: "0",
};

const imageHeader = {
	padding: "0",
	lineHeight: "0",
};

const coverImage = {
	width: "100%",
	maxWidth: "600px",
	height: "auto",
	display: "block",
};

const textHeader = {
	backgroundColor: "#f3f6fb",
	padding: "42px 32px",
	textAlign: "center" as const,
};

const textHeaderTitle = {
	color: "#111827",
	fontSize: "28px",
	fontWeight: "800",
	lineHeight: "36px",
	margin: "0",
};

const fallbackHeader = {
	backgroundColor: "#f3f6fb",
	padding: "28px 32px",
	textAlign: "center" as const,
};

const fallbackHeaderText = {
	color: "#4b5563",
	fontSize: "15px",
	lineHeight: "24px",
	margin: "0 0 10px",
};

const fallbackHeaderLink = {
	color: "#24549C",
	fontSize: "14px",
	fontWeight: "700",
};

const locationTitle = {
	color: "#111827",
	fontSize: "18px",
	fontWeight: "700",
	margin: "0 0 8px",
};

const contentSection = {
	padding: "34px 28px 12px",
};

const bodyText = {
	color: "#374151",
	fontSize: "16px",
	lineHeight: "26px",
	whiteSpace: "pre-wrap" as const,
	margin: "0",
};

const buttonsSection = {
	margin: "30px 0 20px",
	textAlign: "center" as const,
};

const buttonStyle = {
	borderRadius: "8px",
	display: "inline-block",
	fontSize: "15px",
	fontWeight: "700",
	margin: "6px",
	padding: "12px 24px",
	textDecoration: "none",
};

const hr = {
	borderColor: "#e6ebf1",
	margin: "28px 0 16px",
};

const footerText = {
	color: "#6b7280",
	fontSize: "12px",
	lineHeight: "18px",
	margin: "0",
};

const footer = {
	padding: "12px 28px 34px",
	textAlign: "center" as const,
};

const footerCopyright = {
	color: "#9ca3af",
	fontSize: "12px",
	lineHeight: "20px",
};

const link = {
	textDecoration: "underline",
};
