import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useConvexQuery } from "@/convex/utils";

import { cn } from "@/lib/utils";
import { WHATSAPP_TEMPLATES } from "@/lib/whatsapp/templates";
import { formatPhoneAsWhatsappId } from "@/lib/whatsapp/utils";
import { useMutation, useQuery } from "convex/react";
import {
	AlertCircle,
	AlertTriangle,
	ArrowDown,
	ArrowLeft,
	Check,
	CheckCheck,
	Clock,
	FileText,
	ImageIcon,
	MessageCircleIcon,
	PlayIcon,
	Plus,
	Send,
	TextIcon,
	UserRound,
	X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { BsRobot } from "react-icons/bs";
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom";
import FileUploadComponent from "./FileUploadComponent";
import MediaMessageDisplay from "./MediaMessageDisplay";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import type { TUserSession } from "@/schemas/users";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { formatDateAsLocale, formatNameAsInitials } from "@/lib/formatting";
import LoadingComponent from "../Layouts/LoadingComponent";
import { toast } from "sonner";

type ChatsHubProps = {
	session: TUserSession;
	userHasMessageSendingPermission: boolean;
	whatsappConnection: typeof api.queries.connections.getWhatsappConnection._returnType;
};
function ChatsHub({ session, userHasMessageSendingPermission, whatsappConnection }: ChatsHubProps) {
	console.log(session);
	const isDesktop = useMediaQuery("(min-width: 1024px)");

	const { data: whatsappConnections } = useConvexQuery(api.queries.connections.getWhatsappConnection);
	const getChatByClientAppId = useMutation(api.mutations.chats.getChatByClientAppId);

	const [newChatMenuIsOpen, setNewChatMenuIsOpen] = useState<boolean>(false);
	const [selectedPhoneNumber, setSelectedPhoneNumber] = useState<string | null>(whatsappConnection?.telefones[0]?.whatsappTelefoneId ?? null);
	const [selectedChatId, setSelectedChatId] = useState<Id<"chats"> | null>(null);

	// Para mobile, usamos um estado para controlar se estamos mostrando a lista ou o chat
	const showingChatList = !selectedChatId || isDesktop;

	return (
		<div className="w-full max-h-[calc(100vh-200px)] grow flex flex-col items-center justify-center rounded-lg shadow-lg border border-primary/20 overflow-hidden">
			{/* Layout Desktop - duas colunas lado a lado */}
			{isDesktop ? (
				<div className="w-full h-full flex">
					<div className="flex flex-col gap-3 w-1/3 h-full border-r border-primary/20">
						<div className="w-full flex items-center justify-between border-b border-primary/20 pb-2 px-3 py-3">
							<MessageCircleIcon className="w-5 h-5'" />
							<div className="flex items-center gap-2">
								<Select value={selectedPhoneNumber ?? undefined} onValueChange={(value) => setSelectedPhoneNumber(value)}>
									<SelectTrigger>
										<SelectValue placeholder="Selecione o número.." />
									</SelectTrigger>
									<SelectContent>
										{(whatsappConnections?.telefones ?? [])?.map((phone) => (
											<SelectItem key={phone.numero} value={phone.whatsappTelefoneId}>
												{phone.nome}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<Button onClick={() => setNewChatMenuIsOpen(true)} variant={"ghost"} size={"fit"} className="p-2 rounded-full">
									<Plus className="w-5 h-5" />
								</Button>
							</div>
						</div>
						<div className="grow w-full flex flex-col gap-3 p-3 overflow-y-auto">
							{selectedPhoneNumber ? (
								<ChatHubList
									selectedPhoneNumber={selectedPhoneNumber}
									selectedChatId={selectedChatId}
									handleSelectChat={(chatId) => setSelectedChatId(chatId)}
								/>
							) : (
								<p className="text-primary/60 text-center text-sm italic">Selecione o número de telefone !</p>
							)}
						</div>
					</div>
					<div className="flex flex-col gap-3 w-2/3 h-full">
						{selectedChatId && selectedPhoneNumber ? (
							<ChatHubContent
								chatId={selectedChatId}
								whatsappPhoneNumberId={selectedPhoneNumber}
								session={session}
								onBack={() => setSelectedChatId(null)}
								isDesktop={isDesktop}
								userHasMessageSendingPermission={userHasMessageSendingPermission}
							/>
						) : (
							<div className="h-full w-full flex items-center flex-col justify-center">
								<MessageCircleIcon className="w-12 h-12 text-primary/40 mb-2" />
								<p className="text-primary/60 text-center text-sm italic">Selecione um chat para ver as mensagens</p>
							</div>
						)}
					</div>
				</div>
			) : (
				/* Layout Mobile - uma tela por vez com animações */
				<div className="relative w-full h-full overflow-hidden">
					{/* Lista de Chats - Mobile */}
					<div
						className={cn(
							"absolute inset-0 w-full h-full transition-transform duration-300 ease-in-out",
							showingChatList ? "translate-x-0" : "-translate-x-full",
						)}
					>
						<div className="flex flex-col gap-3 w-full h-full">
							<div className="w-full flex items-center justify-between border-b border-primary/20 pb-2 px-3 py-3">
								<MessageCircleIcon className="w-5 h-5'" />
								<div className="flex items-center gap-2">
									<Select value={selectedPhoneNumber ?? undefined} onValueChange={(value) => setSelectedPhoneNumber(value)}>
										<SelectTrigger>
											<SelectValue placeholder="Selecione o número.." />
										</SelectTrigger>
										<SelectContent>
											{(whatsappConnections?.telefones ?? [])?.map((phone) => (
												<SelectItem key={phone.numero} value={phone.whatsappTelefoneId}>
													{phone.nome}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<Button onClick={() => setNewChatMenuIsOpen(true)} variant={"ghost"} size={"fit"} className="p-2 rounded-full">
										<Plus className="w-5 h-5" />
									</Button>
								</div>
							</div>
							<div className="grow w-full flex flex-col gap-3 p-3 overflow-y-auto">
								{selectedPhoneNumber ? (
									<ChatHubList
										selectedPhoneNumber={selectedPhoneNumber}
										selectedChatId={selectedChatId}
										handleSelectChat={(chatId) => setSelectedChatId(chatId)}
									/>
								) : (
									<p className="text-primary/60 text-center text-sm italic">Selecione o número de telefone !</p>
								)}
							</div>
						</div>
					</div>

					{/* Chat Ativo - Mobile */}
					{selectedChatId && selectedPhoneNumber ? (
						<div
							className={cn(
								"flex flex-col grow absolute inset-0 w-full h-full transition-transform duration-300 ease-in-out",
								showingChatList ? "translate-x-full" : "translate-x-0",
							)}
						>
							<ChatHubContent
								chatId={selectedChatId}
								whatsappPhoneNumberId={selectedPhoneNumber}
								session={session}
								onBack={() => setSelectedChatId(null)}
								isDesktop={isDesktop}
								userHasMessageSendingPermission={userHasMessageSendingPermission}
							/>
						</div>
					) : null}
				</div>
			)}

			{/* {newChatMenuIsOpen ? (
				<ClientsVinculationMenu
					closeModal={() => setNewChatMenuIsOpen(false)}
					handleSelect={async (client) => {
						if (!selectedPhoneNumber) return toast.error("Selecione um número de telefone.");
						const clientId = client._id;
						if (!clientId)
							return toast.error("Oops, aparentemente esse cliente não possui um cadastro, tente vincular um projeto ao cliente para criar um chat.");
						const selectedChat = await getChatByClientAppId({
							cliente: {
								idApp: clientId,
								nome: client.nome,
								telefone: client.telefonePrimario || "",
								email: client.email || "",
								cpfCnpj: client.cpfCnpj || "",
								avatar_url: undefined,
							},
							whatsappPhoneNumberId: selectedPhoneNumber,
						});
						return setSelectedChatId(selectedChat.chatId);
					}}
				/>
			) : null} */}
		</div>
	);
}

export default ChatsHub;

type ChatHubListProps = {
	selectedPhoneNumber: string;
	selectedChatId: Id<"chats"> | null;
	handleSelectChat: (chatId: Id<"chats">) => void;
};
function ChatHubList({ selectedPhoneNumber, selectedChatId, handleSelectChat }: ChatHubListProps) {
	const chats = useQuery(api.queries.chat.getChats, { whatsappPhoneNumberId: selectedPhoneNumber });

	return chats ? (
		chats.map((chat) => (
			<button
				type="button"
				key={chat._id}
				onClick={() => handleSelectChat(chat._id)}
				className={cn("w-full flex gap-3 p-3 hover:bg-primary/10 rounded-lg", selectedChatId === chat._id && "bg-primary/10")}
			>
				<div className="flex items-center justify-center">
					<Avatar className="w-12 h-12 min-w-12 min-h-12">
						<AvatarImage src={undefined} alt={chat.cliente?.nome ?? ""} />
						<AvatarFallback>{formatNameAsInitials(chat.cliente?.nome ?? "")}</AvatarFallback>
					</Avatar>
				</div>
				{/* Informações do Chat */}
				<div className="grow flex flex-col min-w-0">
					<div className="flex items-center justify-between w-full min-w-0">
						<h3 className="font-semibold truncate">{chat.cliente?.nome || "Cliente desconhecido"}</h3>
						{chat.ultimaMensagemData && (
							<span className="text-xs text-primary/60 ml-2 flex-shrink-0">
								{new Date(chat.ultimaMensagemData).toLocaleTimeString("pt-BR", {
									hour: "2-digit",
									minute: "2-digit",
								})}
							</span>
						)}
					</div>
					<div className="flex items-center justify-between w-full min-w-0">
						{chat.ultimaMensagemConteudoTipo === "TEXTO" ? (
							<p className="text-start text-sm text-primary/60 truncate flex-1 min-w-0">{chat.ultimaMensagemConteudoTexto || "Nenhuma mensagem ainda"}</p>
						) : (
							<div className="flex items-center gap-1">
								<ImageIcon className="w-4 h-4" />
								<p className="text-sm text-primary/60 truncate">MÍDIA</p>
							</div>
						)}
						{(chat.mensagensNaoLidas || 0) > 0 && (
							<span className="ml-2 bg-green-500 text-white text-xs font-bold rounded-full px-2 py-1 flex-shrink-0">{chat.mensagensNaoLidas}</span>
						)}
					</div>
				</div>
			</button>
		))
	) : (
		<p className="text-primary/60 text-center text-sm italic">Carregando...</p>
	);
}

function ChatHubContent({
	chatId,
	whatsappPhoneNumberId,
	session,
	onBack,
	isDesktop,
	userHasMessageSendingPermission,
}: {
	chatId: Id<"chats">;
	whatsappPhoneNumberId: string;
	session: TUserSession;
	onBack: () => void;
	isDesktop: boolean;
	userHasMessageSendingPermission: boolean;
}) {
	const chat = useQuery(api.queries.chat.getChat, {
		chatId,
	});

	const chatMessages = useQuery(api.queries.chat.getChatMessages, {
		chatId,
	});

	const [messageText, setMessageText] = useState("");
	const [showTemplateSelector, setShowTemplateSelector] = useState(false);
	const [isSendingTemplate, setIsSendingTemplate] = useState(false);
	const handleSendMessage = useMutation(api.mutations.messages.createMessage);
	const handleSendTemplate = useMutation(api.mutations.messages.createTemplateMessage);
	const markMessagesAsRead = useMutation(api.mutations.messages.markMessagesAsRead);

	// Marcar mensagens como lidas quando visualizar o chat
	useEffect(() => {
		if (chatId && session._id) {
			// Marcar como lidas após um pequeno delay para garantir que o usuário realmente viu
			const timer = setTimeout(() => {
				markMessagesAsRead({
					chatId,
					userId: session._id,
				}).catch((error) => {
					console.error("Erro ao marcar mensagens como lidas:", error);
				});
			}, 500);

			return () => clearTimeout(timer);
		}
	}, [chatId, session._id, markMessagesAsRead]);

	if (!chat || !chatMessages) return <LoadingComponent />;

	const isConversationExpired = chat.status === "EXPIRADA";

	const sendTemplate = async (templateKey: keyof typeof WHATSAPP_TEMPLATES) => {
		if (!chat.cliente?.telefone) {
			toast.error("Telefone do cliente não encontrado");
			return;
		}

		setIsSendingTemplate(true);
		try {
			const template = WHATSAPP_TEMPLATES[templateKey];
			const payload = template.getPayload({
				templateKey,
				toPhoneNumber: formatPhoneAsWhatsappId(chat.cliente.telefone),
				clientName: chat.cliente?.nome ?? "Cliente",
			});

			await handleSendTemplate({
				chatId: chatId,
				userAppId: session._id,
				templateId: template.id,
				templatePayloadData: payload.data,
				templatePayloadContent: payload.content,
			});

			toast.success("Template enviado com sucesso!");
			setShowTemplateSelector(false);
		} catch (error) {
			console.error("Error sending template:", error);
			toast.error("Erro ao enviar template");
		} finally {
			setIsSendingTemplate(false);
		}
	};
	return (
		<>
			{/* Header do Chat */}
			<ChatHubContentHeader chat={chat} isDesktop={isDesktop} onBack={onBack} />
			{/* Área de Mensagens */}
			<ChatHubContentMessages chatMessages={chatMessages} />
			{/* Footer - Input de Mensagem */}
			{userHasMessageSendingPermission ? (
				<div className="flex items-center justify-center w-full p-3">
					<div className="flex flex-col gap-2 px-4 py-2 bg-card border-t border-primary/10 shadow-sm w-[98%] self-center rounded-full">
						{/* Alert quando conversa expirada */}
						{isConversationExpired && (
							<div className="flex items-center gap-2 px-3 py-1 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg w-[90%] self-center">
								<AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-500 flex-shrink-0" />
								<p className="text-xs text-amber-800 dark:text-amber-200">Janela de 24h expirada. Envie um template aprovado para reiniciar a conversa.</p>
							</div>
						)}
						{/* Input e botões */}
						<div className="flex items-end gap-2">
							<FileUploadComponent
								onFileSelect={({ file, fileName, storageId }) => {
									// Determine media type based on file type
									let midiaTipo: "IMAGEM" | "DOCUMENTO" = "DOCUMENTO";
									if (file.type.startsWith("image/")) {
										midiaTipo = "IMAGEM";
									}

									handleSendMessage({
										autor: {
											tipo: "usuario",
											idApp: session._id,
										},
										conteudo: {
											texto: undefined,
											midiaTipo,
											midiaStorageId: storageId as Id<"_storage">,
											midiaMimeType: file.type,
											midiaFileName: fileName,
											midiaFileSize: file.size,
										},
										cliente: {
											idApp: chat.cliente?.idApp,
											nome: chat.cliente?.nome,
											telefone: formatPhoneAsWhatsappId(chat.cliente?.telefone),
											avatar_url: chat.cliente?.avatar_url,
											email: chat.cliente?.email,
											cpfCnpj: chat.cliente?.cpfCnpj,
										},
										whatsappPhoneNumberId: whatsappPhoneNumberId,
									});
									setMessageText("");
								}}
								disabled={isConversationExpired}
							/>
							<textarea
								value={messageText}
								onChange={(e) => setMessageText(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter" && !e.shiftKey && !isConversationExpired) {
										e.preventDefault();
										handleSendMessage({
											autor: {
												tipo: "usuario",
												idApp: session._id,
											},
											conteudo: {
												texto: messageText,
											},
											cliente: {
												idApp: chat.cliente?.idApp,
												nome: chat.cliente?.nome,
												telefone: formatPhoneAsWhatsappId(chat.cliente?.telefone),
												avatar_url: chat.cliente?.avatar_url,
												email: chat.cliente?.email,
												cpfCnpj: chat.cliente?.cpfCnpj,
											},
											whatsappPhoneNumberId: whatsappPhoneNumberId,
										});
										setMessageText("");
									}
								}}
								placeholder={isConversationExpired ? "Envie um template para continuar..." : "Digite uma mensagem..."}
								className={cn("flex-1 px-4 py-2 rounded-lg resize-none text-sm transition-colors focus:outline-none align-top")}
								rows={1}
								style={{ maxHeight: "120px" }}
								disabled={isConversationExpired}
							/>
							<Button
								type="button"
								size="icon"
								onClick={() => {
									handleSendMessage({
										autor: {
											tipo: "usuario",
											idApp: session._id,
										},
										conteudo: {
											texto: messageText,
										},
										cliente: {
											idApp: chat.cliente?.idApp,
											nome: chat.cliente?.nome,
											telefone: formatPhoneAsWhatsappId(chat.cliente.telefone),
											avatar_url: chat.cliente?.avatar_url,
											email: chat.cliente?.email,
											cpfCnpj: chat.cliente?.cpfCnpj,
										},
										whatsappPhoneNumberId: whatsappPhoneNumberId,
									});
									setMessageText("");
								}}
								disabled={!messageText.trim() || isConversationExpired}
								className="bg-blue-500 hover:bg-blue-600"
							>
								<Send className="w-4 h-4" />
							</Button>

							{/* Template Selector Popover */}
							<Popover open={showTemplateSelector} onOpenChange={setShowTemplateSelector}>
								<PopoverTrigger asChild>
									<Button type="button" size="icon" variant="ghost" className={cn({ "bg-green-500 hover:bg-green-600": isConversationExpired })}>
										<FileText className="w-4 h-4" />
									</Button>
								</PopoverTrigger>
								<PopoverContent align="end" side="top" className="w-80 p-0">
									<div className="flex items-center justify-between p-3 border-b border-primary/10">
										<h3 className="font-semibold text-sm">Selecionar Template</h3>
										<Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowTemplateSelector(false)}>
											<X className="w-4 h-4" />
										</Button>
									</div>
									<div className="p-2 max-h-64 overflow-y-auto">
										{Object.entries(WHATSAPP_TEMPLATES).map(([key, template]) => (
											<Button
												key={key}
												variant="ghost"
												className="w-full justify-start h-auto p-3"
												onClick={() => sendTemplate(key as keyof typeof WHATSAPP_TEMPLATES)}
												disabled={isSendingTemplate}
											>
												<div className="flex items-start gap-2 w-full">
													<FileText className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />
													<div className="flex-1 min-w-0 text-left">
														<p className="font-medium text-sm">{template.title}</p>
														<p className="text-xs text-muted-foreground mt-0.5">
															{template.type === "marketing" ? "Marketing" : "Utilitário"} • {template.language}
														</p>
													</div>
												</div>
											</Button>
										))}
									</div>
								</PopoverContent>
							</Popover>
						</div>
					</div>
				</div>
			) : null}
		</>
	);
}

type ChatHubContentHeaderProps = {
	chat: typeof api.queries.chat.getChat._returnType;
	isDesktop: boolean;
	onBack: () => void;
};
function ChatHubContentHeader({ chat, isDesktop, onBack }: ChatHubContentHeaderProps) {
	const handleUpdateService = useMutation(api.mutations.services.updateService);
	return (
		<div className="w-full flex flex-col">
			<div className="p-3 bg-card border-b border-primary/10 flex items-center gap-2">
				<div className="flex items-center gap-3">
					{/* Botão de voltar para mobile */}
					{!isDesktop && (
						<Button variant="ghost" size="sm" onClick={onBack} className="p-2 hover:bg-primary/10 rounded-full">
							<ArrowLeft className="w-5 h-5 text-primary" />
						</Button>
					)}

					{/* Avatar do Cliente */}
					<Avatar className="w-6 h-6 lg:w-10 lg:h-10 min-w-6 min-h-6 lg:min-w-10 lg:min-h-10">
						<AvatarImage src={undefined} alt={chat.cliente?.nome ?? ""} />
						<AvatarFallback className="text-xs lg:text-base">{formatNameAsInitials(chat.cliente?.nome ?? "")}</AvatarFallback>
					</Avatar>

					{/* Informações do Cliente */}
					<div className="flex items-center gap-2">
						<h2 className="text-sm lg:text-base font-semibold text-primary">{chat.cliente?.nome || "Cliente desconhecido"}</h2>
						<div className="text-[0.625rem] lg:text-xs flex items-center gap-2 text-primary/60">
							{chat.cliente?.telefone && <span>{chat.cliente.telefone}</span>}
						</div>
					</div>
				</div>
			</div>
			{chat.atendimentoAberto ? (
				<div className="flex flex-col gap-2 bg-orange-200 text-orange-800 p-2">
					<div className="flex items-center justify-between gap-2">
						<h1 className="text-[0.625rem] lg:text-xs font-semibold">ATENDIMENTO ABERTO</h1>
						<div className="flex items-center gap-2">
							{chat.atendimentoAberto.dataInicio ? (
								<div className="flex items-center gap-1">
									<PlayIcon className="w-3 h-3 min-w-3 min-h-3" strokeWidth={1.5} />
									<p className="text-[0.625rem] lg:text-xs">{formatDateAsLocale(new Date(chat.atendimentoAberto.dataInicio), true)}</p>
								</div>
							) : null}
							<Button
								size="fit"
								onClick={() => handleUpdateService({ serviceId: chat.atendimentoAberto?._id as Id<"services">, service: { status: "CONCLUIDO" } })}
								className="px-2 py-1 bg-orange-500 text-orange-100 hover:bg-orange-600 text-xs"
							>
								FINALIZAR
							</Button>
						</div>
					</div>
					<div className="w-full flex items-center justify-between gap-2">
						<div className="flex items-center gap-1">
							<TextIcon className="w-4 h-4 min-w-4 min-h-4" />
							<p className="text-xs lg:text-sm font-semibold">{chat.atendimentoAberto.descricao}</p>
						</div>
						{chat.atendimentoAberto.responsavel ? (
							chat.atendimentoAberto.responsavel === "ai" ? (
								<div className="text-[0.625rem] lg:text-xs flex items-center gap-2 text-orange-100 px-2 py-1 bg-orange-800 rounded-lg">
									<BsRobot className="w-4 h-4 min-w-4 min-h-4" />
									AI
								</div>
							) : chat.atendimentoAberto.responsavel ? (
								<div className="text-[0.625rem] lg:text-xs flex items-center gap-2 text-orange-100 px-2 py-1 bg-orange-800 rounded-lg">
									<UserRound className="w-4 h-4 min-w-4 min-h-4" />
									{chat.atendimentoAberto.responsavel?.nome}
								</div>
							) : (
								<div className="text-[0.625rem] lg:text-xs flex items-center gap-2 text-orange-100 px-2 py-1 bg-orange-800 rounded-lg">SEM RESPONSÁVEL</div>
							)
						) : (
							<div className="text-[0.625rem] lg:text-xs flex items-center gap-2 text-orange-100 px-2 py-1 bg-orange-800 rounded-lg">SEM RESPONSÁVEL</div>
						)}
					</div>
				</div>
			) : null}
		</div>
	);
}

type ChatHubContentMessagesProps = {
	chatMessages: typeof api.queries.chat.getChatMessages._returnType;
};

function ChatHubContentMessages({ chatMessages }: ChatHubContentMessagesProps) {
	const getMessageStatusIcon = (whatsappStatus?: string | null) => {
		switch (whatsappStatus) {
			case "PENDENTE":
				return <Clock className="w-3 h-3" />;
			case "ENVIADO":
				return <Check className="w-3 h-3" />;
			case "ENTREGUE":
				return <CheckCheck className="w-3 h-3" />;
			case "FALHOU":
				return <AlertCircle className="w-3 h-3 text-red-400" />;
			default:
				return null;
		}
	};

	return (
		<StickToBottom
			className="relative flex grow flex-col flex-1 overflow-y-auto bg-background scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-primary/20"
			initial="smooth"
			resize="smooth"
			role="log"
		>
			<StickToBottom.Content className="p-3">
				{chatMessages && chatMessages.length > 0 ? (
					chatMessages.map((message, index) => {
						const isUser = message.autorTipo === "usuario" || message.autorTipo === "ai";
						const previousMessage = index > 0 ? chatMessages[index - 1] : null;
						const nextMessage = index < chatMessages.length - 1 ? chatMessages[index + 1] : null;
						const messageAuthor = message.autor;
						// Verifica se é do mesmo autor que a mensagem anterior
						const isSameAuthorAsPrevious = previousMessage?.autorTipo === message.autorTipo;

						// Verifica se é do mesmo autor que a próxima mensagem
						const isSameAuthorAsNext = nextMessage?.autorTipo === message.autorTipo;

						// Define se deve mostrar o timestamp (apenas na última mensagem do grupo)
						const shouldShowTimestamp = !isSameAuthorAsNext;

						// Define o espaçamento
						const marginTop = isSameAuthorAsPrevious ? "mt-0.5" : "mt-4";

						// Define bordas arredondadas baseado no agrupamento
						const roundedClasses = cn({
							"rounded-lg": !isSameAuthorAsPrevious && !isSameAuthorAsNext, // Mensagem única
							"rounded-t-lg rounded-b-md": !isSameAuthorAsPrevious && isSameAuthorAsNext, // Primeira do grupo
							"rounded-md": isSameAuthorAsPrevious && isSameAuthorAsNext, // Meio do grupo
							"rounded-t-md rounded-b-lg": isSameAuthorAsPrevious && !isSameAuthorAsNext, // Última do grupo
						});

						return (
							<div key={message._id} className={cn("flex", marginTop, { "justify-end": isUser, "justify-start": !isUser })}>
								<div
									className={cn("max-w-[70%] px-3 py-2", roundedClasses, {
										"bg-blue-500 text-white": isUser,
										"bg-card border border-primary/10 text-primary": !isUser,
									})}
								>
									{/* Conteúdo da mensagem */}
									{message.conteudoMidiaTipo ? (
										<div className="space-y-2">
											<MediaMessageDisplay
												storageId={message.conteudoMidiaStorageId}
												mediaUrl={message.conteudoMidiaUrl}
												mediaType={message.conteudoMidiaTipo}
												fileName={message.conteudoMidiaFileName}
												fileSize={message.conteudoMidiaFileSize}
												mimeType={message.conteudoMidiaMimeType}
												caption={message.conteudoTexto}
											/>
										</div>
									) : (
										<p className="text-sm break-words whitespace-pre-wrap">{message.conteudoTexto}</p>
									)}

									{/* Timestamp e status - apenas na última mensagem do grupo */}
									{shouldShowTimestamp && (
										<div
											className={cn("flex items-center gap-1 mt-1 justify-end", {
												"text-blue-100": isUser,
												"text-primary/60": !isUser,
											})}
										>
											<p className="text-[10px]">
												{new Date(message.dataEnvio).toLocaleTimeString("pt-BR", {
													hour: "2-digit",
													minute: "2-digit",
												})}
											</p>
											{isUser && getMessageStatusIcon(message.whatsappStatus)}
										</div>
									)}
								</div>
							</div>
						);
					})
				) : (
					<div className="flex flex-col items-center justify-center h-full">
						<p className="text-primary/600">Nenhuma mensagem ainda</p>
						<p className="text-primary/400 text-sm mt-1">Envie a primeira mensagem para iniciar a conversa</p>
					</div>
				)}
			</StickToBottom.Content>
			<ChatScrollButton />
		</StickToBottom>
	);
}

function ChatScrollButton() {
	const { isAtBottom, scrollToBottom } = useStickToBottomContext();

	const handleScrollToBottom = useCallback(() => {
		scrollToBottom();
	}, [scrollToBottom]);

	return (
		!isAtBottom && (
			<Button
				className="absolute bottom-4 left-[50%] translate-x-[-50%] rounded-full shadow-lg"
				onClick={handleScrollToBottom}
				size="icon"
				type="button"
				variant="outline"
			>
				<ArrowDown className="size-4" />
			</Button>
		)
	);
}
