import { appApiHandler } from "@/lib/app-api";
import { resend } from "@/services/resend";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const DataDeletionRequestInputSchema = z.object({
	nome: z.string({ required_error: "Nome não informado.", invalid_type_error: "Tipo não válido para nome." }).trim().min(2, "Nome não informado."),
	email: z.string({ required_error: "E-mail não informado.", invalid_type_error: "Tipo não válido para e-mail." }).trim().email("E-mail inválido."),
	telefone: z.string({ invalid_type_error: "Tipo não válido para telefone." }).trim().optional().or(z.literal("")),
	identificadorMeta: z.string({ invalid_type_error: "Tipo não válido para identificador Meta." }).trim().optional().or(z.literal("")),
	detalhes: z
		.string({ required_error: "Detalhes da solicitação não informados.", invalid_type_error: "Tipo não válido para detalhes." })
		.trim()
		.min(10, "Detalhes da solicitação não informados."),
	website: z.string().optional(),
});

export type TDataDeletionRequestInput = z.infer<typeof DataDeletionRequestInputSchema>;

function escapeHtml(value: string) {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#039;");
}

function buildRequestEmail(input: TDataDeletionRequestInput) {
	const safeInput = {
		nome: escapeHtml(input.nome),
		email: escapeHtml(input.email),
		telefone: input.telefone ? escapeHtml(input.telefone) : "Não informado",
		identificadorMeta: input.identificadorMeta ? escapeHtml(input.identificadorMeta) : "Não informado",
		detalhes: escapeHtml(input.detalhes),
	};

	return {
		subject: `Solicitação de exclusão de dados - ${input.nome}`,
		text: [
			"Nova solicitação de exclusão de dados recebida pelo site RecompraCRM.",
			"",
			`Nome: ${input.nome}`,
			`E-mail: ${input.email}`,
			`Telefone: ${input.telefone || "Não informado"}`,
			`Identificador Meta: ${input.identificadorMeta || "Não informado"}`,
			"",
			"Detalhes:",
			input.detalhes,
		].join("\n"),
		html: `
			<div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.5;">
				<h1 style="font-size: 20px;">Nova solicitação de exclusão de dados</h1>
				<p>Uma solicitação foi enviada pelo site RecompraCRM.</p>
				<table style="border-collapse: collapse; width: 100%; max-width: 640px;">
					<tr><td style="padding: 8px; border: 1px solid #e2e8f0;"><strong>Nome</strong></td><td style="padding: 8px; border: 1px solid #e2e8f0;">${safeInput.nome}</td></tr>
					<tr><td style="padding: 8px; border: 1px solid #e2e8f0;"><strong>E-mail</strong></td><td style="padding: 8px; border: 1px solid #e2e8f0;">${safeInput.email}</td></tr>
					<tr><td style="padding: 8px; border: 1px solid #e2e8f0;"><strong>Telefone</strong></td><td style="padding: 8px; border: 1px solid #e2e8f0;">${safeInput.telefone}</td></tr>
					<tr><td style="padding: 8px; border: 1px solid #e2e8f0;"><strong>Identificador Meta</strong></td><td style="padding: 8px; border: 1px solid #e2e8f0;">${safeInput.identificadorMeta}</td></tr>
				</table>
				<h2 style="font-size: 16px; margin-top: 24px;">Detalhes</h2>
				<p style="white-space: pre-wrap;">${safeInput.detalhes}</p>
			</div>
		`,
	};
}

async function createDataDeletionRequest(input: TDataDeletionRequestInput) {
	if (input.website) {
		return {
			data: { sent: true },
			message: "Solicitação enviada com sucesso.",
		};
	}

	const recipient = process.env.DATA_DELETION_REQUEST_EMAIL ?? "lucas@syncroniza.com.br";
	const email = buildRequestEmail(input);

	const { error } = await resend.emails.send({
		from: "RecompraCRM <noreply@recompracrm.com.br>",
		to: [recipient],
		subject: email.subject,
		text: email.text,
		html: email.html,
		replyTo: input.email,
	});

	if (error) {
		throw new Error(error.message);
	}

	return {
		data: { sent: true },
		message: "Solicitação enviada com sucesso. Entraremos em contato sobre o andamento do pedido.",
	};
}

export type TCreateDataDeletionRequestOutput = Awaited<ReturnType<typeof createDataDeletionRequest>>;

async function createDataDeletionRequestRoute(request: NextRequest) {
	const input = DataDeletionRequestInputSchema.parse(await request.json());
	const result = await createDataDeletionRequest(input);
	return NextResponse.json(result);
}

export const POST = appApiHandler({ POST: createDataDeletionRequestRoute });
