import { Body, Button, Container, Head, Heading, Hr, Html, Img, Link, Preview, Section, Text } from "@react-email/components";
import * as React from "react";

interface MagicLinkTemplateProps {
	magicLink: string;
	verificationCode: string;
	expiresInMinutes: number;
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_URL || "";

export default function MagicLinkTemplate({ magicLink, verificationCode, expiresInMinutes }: MagicLinkTemplateProps) {
	return (
		<Html>
			<Head />
			<Preview>Seu link de acesso seguro ao RecompraCRM</Preview>
			<Body style={main}>
				<Container style={container}>
					<Section style={header}>
						<Img src={`${baseUrl}/logo.png`} width="150" height="auto" alt="RecompraCRM" style={logo} />
					</Section>

					<Section style={content}>
						<Heading style={h1}>Seu link de acesso</Heading>
						<Text style={text}>
							Você solicitou um login seguro para acessar o painel do <strong>RecompraCRM</strong>.
						</Text>
						<Text style={text}>Clique no botão abaixo para entrar automaticamente:</Text>

						<Section style={buttonContainer}>
							<Button style={button} href={magicLink}>
								Entrar no Painel
							</Button>
						</Section>

						<Text style={orText}>— ou utilize o código de verificação —</Text>

						<Section style={codeContainer}>
							<Text style={codeTitle}>Seu código de acesso:</Text>
							<Text style={codeText}>{verificationCode}</Text>
						</Section>

						<Text style={footerText}>
							Este link e código expiram em <strong>{expiresInMinutes} minutos</strong>.
							<br />
							Se você não solicitou este acesso, pode ignorar este email com segurança.
						</Text>
					</Section>

					<Hr style={hr} />

					<Section style={footer}>
						<Text style={footerCopyright}>
							RecompraCRM © {new Date().getFullYear()}
							<br />
							<Link href={baseUrl} style={link}>
								{baseUrl.replace(/^https?:\/\//, "")}
							</Link>
						</Text>
					</Section>
				</Container>
			</Body>
		</Html>
	);
}

// Styles
const main = {
	backgroundColor: "#f6f9fc",
	fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
	backgroundColor: "#ffffff",
	margin: "0 auto",
	padding: "40px 20px",
	marginBottom: "64px",
};

const header = {
	padding: "20px 0",
	textAlign: "center" as const,
};

const logo = {
	margin: "0 auto",
	display: "block",
};

const content = {
	padding: "0 20px",
};

const h1 = {
	color: "#1a1a1a",
	fontSize: "24px",
	fontWeight: "600",
	lineHeight: "32px",
	margin: "30px 0",
	textAlign: "center" as const,
};

const text = {
	color: "#4a4a4a",
	fontSize: "16px",
	lineHeight: "26px",
	textAlign: "center" as const,
	margin: "16px 0",
};

const buttonContainer = {
	textAlign: "center" as const,
	margin: "32px 0",
};

const button = {
	backgroundColor: "#24549C", // Brand Blue
	borderRadius: "6px",
	color: "#fff",
	fontSize: "16px",
	fontWeight: "600",
	textDecoration: "none",
	textAlign: "center" as const,
	display: "inline-block",
	padding: "12px 32px",
	boxShadow: "0 4px 6px rgba(36, 84, 156, 0.2)",
};

const orText = {
	color: "#888888",
	fontSize: "12px",
	textTransform: "uppercase" as const,
	letterSpacing: "1px",
	textAlign: "center" as const,
	margin: "24px 0 16px",
};

const codeContainer = {
	backgroundColor: "#f9f9f9",
	borderRadius: "8px",
	border: "1px solid #eaeaea",
	padding: "24px",
	textAlign: "center" as const,
	margin: "0 auto 32px",
	maxWidth: "320px",
};

const codeTitle = {
	color: "#666",
	fontSize: "12px",
	fontWeight: "500",
	textTransform: "uppercase" as const,
	margin: "0 0 8px",
};

const codeText = {
	color: "#1a1a1a",
	fontSize: "36px",
	fontWeight: "700",
	letterSpacing: "6px",
	margin: "0",
	fontFamily: "monospace",
};

const footerText = {
	color: "#8898aa",
	fontSize: "12px",
	lineHeight: "16px",
	textAlign: "center" as const,
	margin: "32px 0 0",
};

const hr = {
	borderColor: "#e6ebf1",
	margin: "20px 0",
};

const footer = {
	textAlign: "center" as const,
};

const footerCopyright = {
	color: "#8898aa",
	fontSize: "12px",
	lineHeight: "20px",
};

const link = {
	color: "#24549C",
	textDecoration: "underline",
};
