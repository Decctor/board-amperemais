"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { useWhatsappConnection } from "@/lib/queries/whatsapp-connections";
import { formatPhoneAsWhatsappId } from "@/lib/whatsapp/utils";
import { CheckCircle2, Loader2, Send, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type TestingWhatsappPageProps = {
	user: TAuthUserSession["user"];
};

type EventType = "message" | "status" | "echo" | "template";

type WebhookResponse = {
	success: boolean;
	message?: string;
	error?: string;
};

export default function TestingWhatsappPage({ user }: TestingWhatsappPageProps) {
	const { data: whatsappConnectionData, isLoading: isLoadingConnection } = useWhatsappConnection();
	const whatsappConnection = whatsappConnectionData;
	const [selectedEventType, setSelectedEventType] = useState<EventType>("message");
	const [isSending, setIsSending] = useState(false);
	const [lastResponse, setLastResponse] = useState<WebhookResponse | null>(null);

	// Message form state
	const [messageForm, setMessageForm] = useState({
		whatsappPhoneNumberId: "",
		fromPhoneNumber: "",
		profileName: "Test User",
		messageType: "text" as "text" | "image" | "video" | "audio" | "document",
		textContent: "Olá! Esta é uma mensagem de teste.",
		mediaId: "",
		mimeType: "",
		filename: "",
		caption: "",
	});

	// Status form state
	const [statusForm, setStatusForm] = useState({
		whatsappMessageId: "",
		status: "sent" as "sent" | "delivered" | "read" | "failed",
	});

	// Echo form state
	const [echoForm, setEchoForm] = useState({
		whatsappPhoneNumberId: "",
		fromPhoneNumber: "",
		toPhoneNumber: "",
		messageType: "text" as "text" | "image" | "video" | "audio" | "document",
		textContent: "Mensagem enviada do app",
		mediaId: "",
		mimeType: "",
		filename: "",
		caption: "",
	});

	// Template form state
	const [templateForm, setTemplateForm] = useState({
		messageTemplateId: "",
		messageTemplateName: "test_template",
		event: "APPROVED" as "APPROVED" | "REJECTED" | "PENDING",
		reason: "",
	});

	// Helper functions to create webhook payloads
	const createMessagePayload = (form: typeof messageForm, phones: Array<{ id: string; nome: string; whatsappTelefoneId: string; numero: string }>) => {
		const timestamp = Math.floor(Date.now() / 1000).toString();
		const messageId = `wamid.${Date.now()}`;

		const baseMessage = {
			id: messageId,
			timestamp,
			type: form.messageType,
		};

		let messageContent: Record<string, unknown> = {};

		if (form.messageType === "text") {
			messageContent = {
				text: {
					body: form.textContent,
				},
			};
		} else {
			const mediaObj: Record<string, unknown> = {
				id: form.mediaId || `media_${Date.now()}`,
			};
			if (form.mimeType) mediaObj.mime_type = form.mimeType;
			if (form.caption) mediaObj.caption = form.caption;
			if (form.filename) mediaObj.filename = form.filename;

			messageContent = {
				[form.messageType]: mediaObj,
			};
		}

		return {
			object: "whatsapp_business_account",
			entry: [
				{
					id: "entry_id",
					changes: [
						{
							value: {
								messaging_product: "whatsapp",
								metadata: {
									display_phone_number: "5511999999999",
									phone_number_id: form.whatsappPhoneNumberId,
								},
								contacts: [
									{
										profile: {
											name: form.profileName,
										},
										wa_id: formatPhoneAsWhatsappId(form.fromPhoneNumber),
									},
								],
								messages: [
									{
										...baseMessage,
										from: formatPhoneAsWhatsappId(form.fromPhoneNumber),
										...messageContent,
									},
								],
							},
							field: "messages",
						},
					],
				},
			],
		};
	};

	const createStatusPayload = (form: typeof statusForm) => {
		const timestamp = Math.floor(Date.now() / 1000).toString();

		return {
			object: "whatsapp_business_account",
			entry: [
				{
					id: "entry_id",
					changes: [
						{
							value: {
								messaging_product: "whatsapp",
								metadata: {
									display_phone_number: "5511999999999",
									phone_number_id: "phone_number_id",
								},
								statuses: [
									{
										id: form.whatsappMessageId,
										status: form.status,
										timestamp,
										recipient_id: "5511999999999",
									},
								],
							},
							field: "messages",
						},
					],
				},
			],
		};
	};

	const createEchoPayload = (form: typeof echoForm, phones: Array<{ id: string; nome: string; whatsappTelefoneId: string; numero: string }>) => {
		const timestamp = Math.floor(Date.now() / 1000).toString();
		const messageId = `wamid.echo.${Date.now()}`;

		const baseMessage = {
			id: messageId,
			timestamp,
			type: form.messageType,
			from: formatPhoneAsWhatsappId(form.fromPhoneNumber),
			to: formatPhoneAsWhatsappId(form.toPhoneNumber),
		};

		let messageContent: Record<string, unknown> = {};

		if (form.messageType === "text") {
			messageContent = {
				text: {
					body: form.textContent,
				},
			};
		} else {
			const mediaObj: Record<string, unknown> = {
				id: form.mediaId || `media_${Date.now()}`,
			};
			if (form.mimeType) mediaObj.mime_type = form.mimeType;
			if (form.caption) mediaObj.caption = form.caption;
			if (form.filename) mediaObj.filename = form.filename;

			messageContent = {
				[form.messageType]: mediaObj,
			};
		}

		return {
			object: "whatsapp_business_account",
			entry: [
				{
					id: "entry_id",
					changes: [
						{
							value: {
								messaging_product: "whatsapp",
								metadata: {
									display_phone_number: form.fromPhoneNumber,
									phone_number_id: form.whatsappPhoneNumberId,
								},
								message_echoes: [
									{
										...baseMessage,
										...messageContent,
									},
								],
							},
							field: "smb_message_echoes",
						},
					],
				},
			],
		};
	};

	const createTemplatePayload = (form: typeof templateForm) => {
		return {
			object: "whatsapp_business_account",
			entry: [
				{
					id: "entry_id",
					changes: [
						{
							value: {
								messaging_product: "whatsapp",
								event: "MESSAGE_TEMPLATE_STATUS_UPDATE",
								message_template_id: form.messageTemplateId,
								message_template_name: form.messageTemplateName,
								message_template_status: form.event,
								...(form.reason && { reason: form.reason }),
							},
							field: "message_template_status_update",
						},
					],
				},
			],
		};
	};

	const handleSendWebhook = async () => {
		setIsSending(true);
		setLastResponse(null);

		try {
			let payload: unknown;

			switch (selectedEventType) {
				case "message":
					payload = createMessagePayload(messageForm, availablePhoneNumbers);
					break;
				case "status":
					payload = createStatusPayload(statusForm);
					break;
				case "echo":
					payload = createEchoPayload(echoForm, availablePhoneNumbers);
					break;
				case "template":
					payload = createTemplatePayload(templateForm);
					break;
			}

			const response = await fetch("/api/integrations/whatsapp", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(payload),
			});

			const data = await response.json();

			if (response.ok) {
				setLastResponse({ success: true, message: "Webhook enviado com sucesso!" });
				toast.success("Webhook enviado com sucesso!");
			} else {
				setLastResponse({ success: false, error: data.error || "Erro ao enviar webhook" });
				toast.error(data.error || "Erro ao enviar webhook");
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
			setLastResponse({ success: false, error: errorMessage });
			toast.error(errorMessage);
		} finally {
			setIsSending(false);
		}
	};

	// Auto-fill phone number ID if available
	const availablePhoneNumbers = whatsappConnection?.telefones || [];
	const defaultPhoneNumberId = availablePhoneNumbers[0]?.whatsappTelefoneId || "";

	return (
		<div className="container mx-auto p-6 space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold">Teste de Webhook WhatsApp</h1>
					<p className="text-muted-foreground mt-2">Simule eventos de webhook para testar o processamento em tempo real</p>
				</div>
			</div>

			{isLoadingConnection ? (
				<div className="flex items-center justify-center p-8">
					<Loader2 className="w-6 h-6 animate-spin" />
				</div>
			) : !whatsappConnection ? (
				<Card>
					<CardContent className="p-6">
						<p className="text-muted-foreground">Nenhuma conexão WhatsApp encontrada. Configure uma conexão primeiro.</p>
					</CardContent>
				</Card>
			) : (
				<>
					<Card>
						<CardHeader>
							<CardTitle>Informações da Conexão</CardTitle>
							<CardDescription>Telefones disponíveis para teste</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="space-y-2">
								{availablePhoneNumbers.map((phone: { id: string; nome: string; whatsappTelefoneId: string; numero: string }) => (
									<div key={phone.id} className="flex items-center gap-2 text-sm">
										<span className="font-medium">{phone.nome}:</span>
										<span className="text-muted-foreground">{phone.numero}</span>
										<span className="text-xs text-muted-foreground">({phone.whatsappTelefoneId})</span>
									</div>
								))}
							</div>
						</CardContent>
					</Card>

					<Tabs value={selectedEventType} onValueChange={(v: string) => setSelectedEventType(v as EventType)}>
						<TabsList className="grid w-full grid-cols-4">
							<TabsTrigger value="message">Mensagem</TabsTrigger>
							<TabsTrigger value="status">Status</TabsTrigger>
							<TabsTrigger value="echo">Echo</TabsTrigger>
							<TabsTrigger value="template">Template</TabsTrigger>
						</TabsList>

						<TabsContent value="message" className="space-y-4">
							<Card>
								<CardHeader>
									<CardTitle>Simular Mensagem Recebida</CardTitle>
									<CardDescription>Simula uma mensagem recebida de um cliente</CardDescription>
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="grid grid-cols-2 gap-4">
										<div className="space-y-2">
											<Label htmlFor="msg-phone-id">WhatsApp Phone Number ID *</Label>
											<Select
												value={messageForm.whatsappPhoneNumberId}
												onValueChange={(value) => setMessageForm({ ...messageForm, whatsappPhoneNumberId: value })}
											>
												<SelectTrigger id="msg-phone-id">
													<SelectValue placeholder="Selecione um telefone" />
												</SelectTrigger>
												<SelectContent>
													{availablePhoneNumbers.map((phone: { id: string; nome: string; whatsappTelefoneId: string; numero: string }) => (
														<SelectItem key={phone.id} value={phone.whatsappTelefoneId}>
															{phone.nome} ({phone.numero})
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
										<div className="space-y-2">
											<Label htmlFor="msg-from">Número do Remetente *</Label>
											<Input
												id="msg-from"
												placeholder="5511999999999"
												value={messageForm.fromPhoneNumber}
												onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMessageForm({ ...messageForm, fromPhoneNumber: e.target.value })}
											/>
										</div>
									</div>
									<div className="space-y-2">
										<Label htmlFor="msg-name">Nome do Perfil</Label>
										<Input id="msg-name" value={messageForm.profileName} onChange={(e) => setMessageForm({ ...messageForm, profileName: e.target.value })} />
									</div>
									<div className="space-y-2">
										<Label htmlFor="msg-type">Tipo de Mensagem</Label>
										<Select
											value={messageForm.messageType}
											onValueChange={(value) => setMessageForm({ ...messageForm, messageType: value as typeof messageForm.messageType })}
										>
											<SelectTrigger id="msg-type">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="text">Texto</SelectItem>
												<SelectItem value="image">Imagem</SelectItem>
												<SelectItem value="video">Vídeo</SelectItem>
												<SelectItem value="audio">Áudio</SelectItem>
												<SelectItem value="document">Documento</SelectItem>
											</SelectContent>
										</Select>
									</div>
									{messageForm.messageType === "text" ? (
										<div className="space-y-2">
											<Label htmlFor="msg-text">Conteúdo da Mensagem</Label>
											<Textarea
												id="msg-text"
												value={messageForm.textContent}
												onChange={(e) => setMessageForm({ ...messageForm, textContent: e.target.value })}
												rows={4}
											/>
										</div>
									) : (
										<>
											<div className="grid grid-cols-2 gap-4">
												<div className="space-y-2">
													<Label htmlFor="msg-media-id">Media ID (opcional)</Label>
													<Input id="msg-media-id" value={messageForm.mediaId} onChange={(e) => setMessageForm({ ...messageForm, mediaId: e.target.value })} />
												</div>
												<div className="space-y-2">
													<Label htmlFor="msg-mime">MIME Type</Label>
													<Input
														id="msg-mime"
														placeholder="image/jpeg"
														value={messageForm.mimeType}
														onChange={(e) => setMessageForm({ ...messageForm, mimeType: e.target.value })}
													/>
												</div>
											</div>
											<div className="space-y-2">
												<Label htmlFor="msg-caption">Legenda (opcional)</Label>
												<Input id="msg-caption" value={messageForm.caption} onChange={(e) => setMessageForm({ ...messageForm, caption: e.target.value })} />
											</div>
										</>
									)}
								</CardContent>
							</Card>
						</TabsContent>

						<TabsContent value="status" className="space-y-4">
							<Card>
								<CardHeader>
									<CardTitle>Simular Atualização de Status</CardTitle>
									<CardDescription>Simula uma atualização de status de mensagem (enviado, entregue, lido, falhou)</CardDescription>
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="space-y-2">
										<Label htmlFor="status-msg-id">WhatsApp Message ID *</Label>
										<Input
											id="status-msg-id"
											placeholder="wamid.xxx"
											value={statusForm.whatsappMessageId}
											onChange={(e) => setStatusForm({ ...statusForm, whatsappMessageId: e.target.value })}
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="status-type">Status</Label>
										<Select value={statusForm.status} onValueChange={(value) => setStatusForm({ ...statusForm, status: value as typeof statusForm.status })}>
											<SelectTrigger id="status-type">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="sent">Enviado</SelectItem>
												<SelectItem value="delivered">Entregue</SelectItem>
												<SelectItem value="read">Lido</SelectItem>
												<SelectItem value="failed">Falhou</SelectItem>
											</SelectContent>
										</Select>
									</div>
								</CardContent>
							</Card>
						</TabsContent>

						<TabsContent value="echo" className="space-y-4">
							<Card>
								<CardHeader>
									<CardTitle>Simular Echo de Mensagem</CardTitle>
									<CardDescription>Simula uma mensagem enviada do app WhatsApp Business (Coexistence)</CardDescription>
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="grid grid-cols-2 gap-4">
										<div className="space-y-2">
											<Label htmlFor="echo-phone-id">WhatsApp Phone Number ID *</Label>
											<Select value={echoForm.whatsappPhoneNumberId} onValueChange={(value) => setEchoForm({ ...echoForm, whatsappPhoneNumberId: value })}>
												<SelectTrigger id="echo-phone-id">
													<SelectValue placeholder="Selecione um telefone" />
												</SelectTrigger>
												<SelectContent>
													{availablePhoneNumbers.map((phone: { id: string; nome: string; whatsappTelefoneId: string; numero: string }) => (
														<SelectItem key={phone.id} value={phone.whatsappTelefoneId}>
															{phone.nome} ({phone.numero})
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
										<div className="space-y-2">
											<Label htmlFor="echo-from">De (Número do Negócio) *</Label>
											<Input
												id="echo-from"
												placeholder="5511999999999"
												value={echoForm.fromPhoneNumber}
												onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEchoForm({ ...echoForm, fromPhoneNumber: e.target.value })}
											/>
										</div>
									</div>
									<div className="space-y-2">
										<Label htmlFor="echo-to">Para (Número do Cliente) *</Label>
										<Input
											id="echo-to"
											placeholder="5511888888888"
											value={echoForm.toPhoneNumber}
											onChange={(e) => setEchoForm({ ...echoForm, toPhoneNumber: e.target.value })}
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="echo-type">Tipo de Mensagem</Label>
										<Select
											value={echoForm.messageType}
											onValueChange={(value) => setEchoForm({ ...echoForm, messageType: value as typeof echoForm.messageType })}
										>
											<SelectTrigger id="echo-type">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="text">Texto</SelectItem>
												<SelectItem value="image">Imagem</SelectItem>
												<SelectItem value="video">Vídeo</SelectItem>
												<SelectItem value="audio">Áudio</SelectItem>
												<SelectItem value="document">Documento</SelectItem>
											</SelectContent>
										</Select>
									</div>
									{echoForm.messageType === "text" ? (
										<div className="space-y-2">
											<Label htmlFor="echo-text">Conteúdo da Mensagem</Label>
											<Textarea
												id="echo-text"
												value={echoForm.textContent}
												onChange={(e) => setEchoForm({ ...echoForm, textContent: e.target.value })}
												rows={4}
											/>
										</div>
									) : (
										<>
											<div className="grid grid-cols-2 gap-4">
												<div className="space-y-2">
													<Label htmlFor="echo-media-id">Media ID (opcional)</Label>
													<Input id="echo-media-id" value={echoForm.mediaId} onChange={(e) => setEchoForm({ ...echoForm, mediaId: e.target.value })} />
												</div>
												<div className="space-y-2">
													<Label htmlFor="echo-mime">MIME Type</Label>
													<Input
														id="echo-mime"
														placeholder="image/jpeg"
														value={echoForm.mimeType}
														onChange={(e) => setEchoForm({ ...echoForm, mimeType: e.target.value })}
													/>
												</div>
											</div>
											<div className="space-y-2">
												<Label htmlFor="echo-caption">Legenda (opcional)</Label>
												<Input id="echo-caption" value={echoForm.caption} onChange={(e) => setEchoForm({ ...echoForm, caption: e.target.value })} />
											</div>
										</>
									)}
								</CardContent>
							</Card>
						</TabsContent>

						<TabsContent value="template" className="space-y-4">
							<Card>
								<CardHeader>
									<CardTitle>Simular Evento de Template</CardTitle>
									<CardDescription>Simula atualizações de status de template (aprovado, rejeitado, pendente)</CardDescription>
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="space-y-2">
										<Label htmlFor="template-id">Template ID *</Label>
										<Input
											id="template-id"
											placeholder="123456789"
											value={templateForm.messageTemplateId}
											onChange={(e) => setTemplateForm({ ...templateForm, messageTemplateId: e.target.value })}
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="template-name">Nome do Template</Label>
										<Input
											id="template-name"
											value={templateForm.messageTemplateName}
											onChange={(e) => setTemplateForm({ ...templateForm, messageTemplateName: e.target.value })}
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="template-event">Evento</Label>
										<Select
											value={templateForm.event}
											onValueChange={(value) => setTemplateForm({ ...templateForm, event: value as typeof templateForm.event })}
										>
											<SelectTrigger id="template-event">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="APPROVED">Aprovado</SelectItem>
												<SelectItem value="REJECTED">Rejeitado</SelectItem>
												<SelectItem value="PENDING">Pendente</SelectItem>
											</SelectContent>
										</Select>
									</div>
									{templateForm.event === "REJECTED" && (
										<div className="space-y-2">
											<Label htmlFor="template-reason">Motivo da Rejeição</Label>
											<Input id="template-reason" value={templateForm.reason} onChange={(e) => setTemplateForm({ ...templateForm, reason: e.target.value })} />
										</div>
									)}
								</CardContent>
							</Card>
						</TabsContent>
					</Tabs>

					<Card>
						<CardContent className="p-6">
							<div className="flex items-center justify-between">
								<div className="flex-1">
									{lastResponse && (
										<div className={`flex items-center gap-2 mb-4 ${lastResponse.success ? "text-green-600" : "text-red-600"}`}>
											{lastResponse.success ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
											<span className="font-medium">{lastResponse.success ? lastResponse.message : lastResponse.error}</span>
										</div>
									)}
								</div>
								<Button onClick={handleSendWebhook} disabled={isSending} size="lg">
									{isSending ? (
										<>
											<Loader2 className="w-4 h-4 mr-2 animate-spin" />
											Enviando...
										</>
									) : (
										<>
											<Send className="w-4 h-4 mr-2" />
											Enviar Webhook
										</>
									)}
								</Button>
							</div>
						</CardContent>
					</Card>
				</>
			)}
		</div>
	);
}
