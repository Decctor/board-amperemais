import { Body, Button, Container, Head, Heading, Hr, Html, Img, Link, Preview, Section, Text } from "@react-email/components";
import * as React from "react";

type OrganizationInviteTemplateProps = {
	inviteLink: string;
	invitedName: string;
	organizationName?: string | null;
	expiresInHours: number;
};

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_URL || "";

export default function OrganizationInviteTemplate({ inviteLink, invitedName, organizationName, expiresInHours }: OrganizationInviteTemplateProps) {
	const orgLabel = organizationName ? `da ${organizationName}` : "da organização";
	return (
		<Html>
			<Head />
			<Preview>Convite para participar {orgLabel} no RecompraCRM</Preview>
			<Body style={main}>
				<Container style={container}>
					<Section style={header}>
						<Img src={`${baseUrl}/logo.png`} width="150" height="auto" alt="RecompraCRM" style={logo} />
					</Section>

					<Section style={content}>
						<Heading style={h1}>Você recebeu um convite</Heading>
						<Text style={text}>Olá, {invitedName}!</Text>
						<Text style={text}>Você foi convidado(a) para participar {orgLabel} no <strong>RecompraCRM</strong>.</Text>
						<Text style={text}>Clique no botão abaixo para aceitar o convite:</Text>

						<Section style={buttonContainer}>
							<Button style={button} href={inviteLink}>
								Aceitar convite
							</Button>
						</Section>

						<Text style={footerText}>
							Este convite expira em <strong>{expiresInHours} hora(s)</strong>.
							<br />
							Se você não esperava este email, pode ignorá-lo com segurança.
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
	backgroundColor: "#24549C",
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
