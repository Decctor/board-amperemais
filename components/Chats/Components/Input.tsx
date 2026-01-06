"use client";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { uploadChatMedia } from "@/lib/files-storage/chat-media";
import { useCreateMessage, useCreateTemplateMessage, useMarkMessagesAsRead } from "@/lib/mutations/chats";
import { useChat } from "@/lib/queries/chats";
import { cn } from "@/lib/utils";
import { WHATSAPP_TEMPLATES } from "@/lib/whatsapp/templates";
import { formatPhoneAsWhatsappId } from "@/lib/whatsapp/utils";
import { AlertTriangle, FileText, Loader2, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import FileUploadComponent from "../FileUploadComponent";
import { useAudioRecorder } from "../Hooks/useAudioRecorder";
import { useChatHub } from "./context";

export type ChatHubInputProps = {
	className?: string;
	placeholder?: string;
	maxRows?: number;
	onMessageSent?: () => void;
};

export function Input({ className, placeholder = "Digite uma mensagem...", maxRows = 4, onMessageSent }: ChatHubInputProps) {
	const { whatsappConnection, selectedChatId, selectedPhoneNumber, user, userHasMessageSendingPermission } = useChatHub();

	const { data: chat } = useChat(selectedChatId);

	const [messageText, setMessageText] = useState("");
	const [isSending, setIsSending] = useState(false);
	const [showTemplateSelector, setShowTemplateSelector] = useState(false);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	const createMessageMutation = useCreateMessage();
	const createTemplateMutation = useCreateTemplateMessage();
	const markMessagesAsReadMutation = useMarkMessagesAsRead();

	const isConversationExpired = chat?.status === "FECHADA";

	// Audio recording
	const audioRecorder = useAudioRecorder();
	const [isRecordingModalOpen, setIsRecordingModalOpen] = useState(false);

	// Mark messages as read when viewing chat
	useEffect(() => {
		if (selectedChatId && user.id) {
			const timer = setTimeout(() => {
				markMessagesAsReadMutation.mutate({ chatId: selectedChatId });
			}, 500);

			return () => clearTimeout(timer);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedChatId, user.id]);

	// Auto-resize textarea
	useEffect(() => {
		if (textareaRef.current) {
			textareaRef.current.style.height = "auto";
			const scrollHeight = textareaRef.current.scrollHeight;
			const maxHeight = maxRows * 24;
			textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
		}
	}, [messageText, maxRows]);

	const sendTextMessage = async () => {
		if (!messageText.trim() || !chat || !selectedChatId || isSending) return;

		setIsSending(true);
		try {
			await createMessageMutation.mutateAsync({
				chatId: selectedChatId,
				conteudoTexto: messageText,
				conteudoMidiaTipo: "TEXTO",
			});

			setMessageText("");
			onMessageSent?.();
			textareaRef.current?.focus();
		} catch (error) {
			console.error("Error sending message:", error);
			toast.error("Erro ao enviar mensagem");
		} finally {
			setIsSending(false);
		}
	};

	const sendMediaMessage = async (file: File, fileName: string, storageId: string, mediaType?: "IMAGEM" | "DOCUMENTO" | "AUDIO") => {
		if (!chat || !selectedChatId || isSending) return;

		setIsSending(true);
		try {
			let midiaTipo: "IMAGEM" | "DOCUMENTO" | "AUDIO" | "VIDEO" = mediaType || "DOCUMENTO";

			if (!mediaType) {
				if (file.type.startsWith("image/")) {
					midiaTipo = "IMAGEM";
				} else if (file.type.startsWith("audio/")) {
					midiaTipo = "AUDIO";
				} else if (file.type.startsWith("video/")) {
					midiaTipo = "VIDEO";
				}
			}

			// Convert file to base64
			const arrayBuffer = await file.arrayBuffer();
			const base64 = Buffer.from(arrayBuffer).toString("base64");

			await createMessageMutation.mutateAsync({
				chatId: selectedChatId,
				conteudoMidiaTipo: midiaTipo,
				conteudoMidiaBase64: base64,
				conteudoMidiaMimeType: file.type,
				conteudoMidiaArquivoNome: fileName,
			});

			onMessageSent?.();
			const successMessage = midiaTipo === "AUDIO" ? "Áudio enviado com sucesso!" : "Arquivo enviado com sucesso!";
			toast.success(successMessage);
		} catch (error) {
			console.error("Error sending media:", error);
			toast.error("Erro ao enviar arquivo");
		} finally {
			setIsSending(false);
		}
	};

	const sendTemplate = async (templateKey: keyof typeof WHATSAPP_TEMPLATES) => {
		if (!chat?.cliente?.telefone || !selectedChatId || !selectedPhoneNumber || isSending) {
			toast.error("Telefone do cliente não encontrado");
			return;
		}

		setIsSending(true);
		try {
			const template = WHATSAPP_TEMPLATES[templateKey];
			const payload = template.getPayload({
				templateKey,
				toPhoneNumber: formatPhoneAsWhatsappId(chat.cliente.telefone),
				clientName: chat.cliente?.nome ?? "Cliente",
			});

			await createTemplateMutation.mutateAsync({
				chatId: selectedChatId,
				templatePayload: payload.data,
				templateContent: payload.content,
			});

			toast.success("Template enviado com sucesso!");
			setShowTemplateSelector(false);
			onMessageSent?.();
		} catch (error) {
			console.error("Error sending template:", error);
			toast.error("Erro ao enviar template");
		} finally {
			setIsSending(false);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.shiftKey && !isConversationExpired && !isSending) {
			e.preventDefault();
			sendTextMessage();
		}
	};

	// // Audio recording handlers
	// const handleStartRecording = async () => {
	// 	setIsRecordingModalOpen(true);
	// 	await audioRecorder.startRecording();
	// };

	// const handleCancelRecording = () => {
	// 	audioRecorder.cancelRecording();
	// 	setIsRecordingModalOpen(false);
	// };

	// const handleStopRecording = () => {
	// 	audioRecorder.stopRecording();
	// };

	// const handleSendAudio = async () => {
	// 	if (!audioRecorder.audioBlob || !chat || !selectedChatId) {
	// 		toast.error("Nenhum áudio para enviar");
	// 		return;
	// 	}

	// 	setIsSending(true);
	// 	try {
	// 		// Convert blob to file
	// 		const filename = `audio_${Date.now()}.webm`;
	// 		const audioFile = new File([audioRecorder.audioBlob], filename, {
	// 			type: audioRecorder.audioBlob.type,
	// 		});

	// 		// Convert to base64
	// 		const arrayBuffer = await audioFile.arrayBuffer();
	// 		const base64 = Buffer.from(arrayBuffer).toString("base64");

	// 		await createMessageMutation.mutateAsync({
	// 			chatId: selectedChatId,
	// 			conteudoMidiaTipo: "AUDIO",
	// 			conteudoMidiaBase64: base64,
	// 			conteudoMidiaMimeType: audioFile.type,
	// 			conteudoMidiaArquivoNome: filename,
	// 		});

	// 		// Close modal and reset recorder
	// 		setIsRecordingModalOpen(false);
	// 		audioRecorder.resetRecording();
	// 		toast.success("Áudio enviado com sucesso!");
	// 	} catch (error) {
	// 		console.error("Error sending audio:", error);
	// 		toast.error(error instanceof Error ? error.message : "Erro ao enviar áudio");
	// 	} finally {
	// 		setIsSending(false);
	// 	}
	// };

	if (!userHasMessageSendingPermission) {
		return null;
	}

	if (!chat) {
		return null;
	}

	return (
		<div className={cn("w-full px-4 py-3 bg-card/80 backdrop-blur-sm border-t border-primary/10", className)}>
			<div className="flex flex-col gap-2 max-w-5xl mx-auto">
				{/* Expired Conversation Warning */}
				{isConversationExpired ? (
					<div className="flex items-start gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
						<AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
						<div className="flex-1 min-w-0">
							<p className="text-xs font-medium text-amber-800 dark:text-amber-200 mb-0.5">Janela de conversação expirada</p>
							<p className="text-xs text-amber-700 dark:text-amber-300/80">A janela de 24h expirou. Envie um template aprovado para reiniciar a conversa.</p>
						</div>
						{/* Template Selector */}
						<Popover open={showTemplateSelector} onOpenChange={setShowTemplateSelector}>
							<PopoverTrigger asChild>
								<Button
									type="button"
									size="icon"
									variant="ghost"
									disabled={isSending}
									className={cn(
										"h-10 w-10 rounded-full shrink-0 transition-all duration-200",
										"hover:scale-105 active:scale-95",
										isConversationExpired && "bg-linear-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-md",
									)}
									title="Enviar template"
								>
									<FileText className="w-4 h-4" />
								</Button>
							</PopoverTrigger>
							<PopoverContent align="end" side="top" className="w-80 p-0 shadow-xl">
								<TemplateSelectorContent onSelectTemplate={sendTemplate} onClose={() => setShowTemplateSelector(false)} isSending={isSending} />
							</PopoverContent>
						</Popover>
					</div>
				) : (
					<div
						className={cn(
							"flex items-end gap-2 px-3 py-2 rounded-2xl transition-all duration-200",
							"bg-background/50 border-2 border-transparent hover:border-primary/20 focus-within:border-primary/30",
							"shadow-sm hover:shadow-md focus-within:shadow-lg",
							isConversationExpired && "opacity-60",
						)}
					>
						{/* File Upload */}
						<FileUploadComponent
							onFileSelect={({ file, fileName, storageId }) => {
								sendMediaMessage(file, fileName, storageId);
							}}
							disabled={isConversationExpired || isSending}
							chatId={selectedChatId || ""}
							organizacaoId={user.organizacaoId as string}
						/>

						{/* Text Input */}
						<textarea
							ref={textareaRef}
							value={messageText}
							onChange={(e) => setMessageText(e.target.value)}
							onKeyDown={handleKeyDown}
							placeholder={isConversationExpired ? "Envie um template para continuar..." : placeholder}
							disabled={isConversationExpired || isSending}
							className={cn(
								"flex-1 px-3 py-2 rounded-lg resize-none text-sm",
								"bg-transparent focus:outline-none",
								"placeholder:text-primary/40",
								"transition-colors duration-200",
								"disabled:cursor-not-allowed",
							)}
							rows={1}
							style={{
								minHeight: "40px",
								maxHeight: `${maxRows * 24}px`,
							}}
						/>

						{/* Send/Microphone Button */}
						<Button
							type="button"
							size="icon"
							onClick={sendTextMessage}
							disabled={!messageText.trim() || isConversationExpired || isSending}
							className={cn(
								"h-10 w-10 rounded-full shrink-0",
								"bg-linear-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700",
								"shadow-md hover:shadow-lg transition-all duration-200",
								"disabled:opacity-50 disabled:cursor-not-allowed",
								"hover:scale-105 active:scale-95",
							)}
						>
							{isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
						</Button>

						{/* Template Selector */}
						<Popover open={showTemplateSelector} onOpenChange={setShowTemplateSelector}>
							<PopoverTrigger asChild>
								<Button
									type="button"
									size="icon"
									variant="ghost"
									disabled={isSending}
									className={cn("h-10 w-10 rounded-full shrink-0 transition-all duration-200", "hover:scale-105 active:scale-95")}
									title="Enviar template"
								>
									<FileText className="w-4 h-4" />
								</Button>
							</PopoverTrigger>
							<PopoverContent align="end" side="top" className="w-80 p-0 shadow-xl">
								<TemplateSelectorContent onSelectTemplate={sendTemplate} onClose={() => setShowTemplateSelector(false)} isSending={isSending} />
							</PopoverContent>
						</Popover>
					</div>
				)}
			</div>
		</div>
	);
}

type TemplateSelectorContentProps = {
	onSelectTemplate: (templateKey: keyof typeof WHATSAPP_TEMPLATES) => void;
	onClose: () => void;
	isSending: boolean;
};

function TemplateSelectorContent({ onSelectTemplate, onClose, isSending }: TemplateSelectorContentProps) {
	return (
		<>
			{/* Template Header */}
			<div className="flex items-center justify-between p-4 border-b border-primary/10 bg-gradient-to-r from-primary/5 to-transparent">
				<div className="flex items-center gap-2">
					<FileText className="w-4 h-4 text-primary" />
					<h3 className="font-semibold text-sm">Templates WhatsApp</h3>
				</div>
				<Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
					<X className="w-4 h-4" />
				</Button>
			</div>

			{/* Template List */}
			<div className="max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
				<div className="p-2 space-y-1">
					{Object.entries(WHATSAPP_TEMPLATES).map(([key, template]) => (
						<Button
							key={key}
							variant="ghost"
							className={cn("w-full justify-start h-auto p-3 rounded-lg", "hover:bg-primary/5 transition-colors duration-200")}
							onClick={() => onSelectTemplate(key as keyof typeof WHATSAPP_TEMPLATES)}
							disabled={isSending}
						>
							<div className="flex items-start gap-3 w-full">
								<div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
									<FileText className="w-4 h-4 text-green-600 dark:text-green-500" />
								</div>
								<div className="flex-1 min-w-0 text-left">
									<p className="font-medium text-sm mb-0.5">{template.title}</p>
									<div className="flex items-center gap-2">
										<span
											className={cn(
												"text-[10px] px-1.5 py-0.5 rounded font-medium",
												template.type === "marketing"
													? "bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400"
													: "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
											)}
										>
											{template.type === "marketing" ? "Marketing" : "Utilitário"}
										</span>
										<span className="text-xs text-muted-foreground">{template.language}</span>
									</div>
								</div>
							</div>
						</Button>
					))}
				</div>
			</div>
		</>
	);
}
