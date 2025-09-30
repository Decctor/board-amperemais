import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { formatNameAsInitials } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import type { TUserSession } from "@/schemas/users";
import { useQuery as useConvexQuery, useMutation } from "convex/react";
import { MessageCircle, Search, Send, UserCircle2, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BsWhatsapp } from "react-icons/bs";
import { toast } from "sonner";
import SelectWithImages from "../Inputs/SelectWithImages";
import Header from "../Layouts/Header";
import LoadingComponent from "../Layouts/LoadingComponent";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

type ChatsMainProps = {
	user: TUserSession;
};

export default function ChatsMain({ user }: ChatsMainProps) {
	return (
		<div className="flex h-full flex-col">
			<Header session={user} />
			<div className="flex w-full max-w-full grow flex-col overflow-x-hidden bg-background px-6 lg:px-12 py-6 gap-6">
				<ChatsMainWrapper user={user} />
			</div>
		</div>
	);
}

type ChatsMainWrapperProps = {
	user: TUserSession;
};

function ChatsMainWrapper({ user }: ChatsMainWrapperProps) {
	const [selectedChatId, setSelectedChatId] = useState<Id<"chats"> | null>(null);

	return (
		<div className="border flex w-full items-stretch rounded-lg shadow-lg overflow-hidden h-[calc(100vh-150px)]">
			{/* Lista de Chats - Lado Esquerdo */}
			<div className="w-full lg:w-1/3 border-r border-primaryflex flex-col">
				<ChatsMainWrapperList
					user={user}
					selectedChatId={selectedChatId}
					onSelectChat={(selectedChatId) => setSelectedChatId((prev) => (prev === selectedChatId ? null : selectedChatId))}
				/>
			</div>

			{/* Área de Conversa - Lado Direito */}
			<div className="hidden lg:flex w-2/3 flex-col">
				{selectedChatId ? (
					<ChatsMainWrapperActiveChat user={user} activeChatId={selectedChatId} />
				) : (
					<div className="flex flex-col items-center justify-center h-full gap-1.5">
						<MessageCircle className="w-24 h-24 mb-4 text-[#fead41]" />
						<p className="text-2xl font-bold">Selecione um chat para começar</p>
						<p className="tracking-tight">Escolha uma conversa da lista ao lado</p>
					</div>
				)}
			</div>
		</div>
	);
}

type ChatsMainWrapperListProps = {
	user: TUserSession;
	selectedChatId: Id<"chats"> | null;
	onSelectChat: (chatId: Id<"chats">) => void;
};

function ChatsMainWrapperList({ user, selectedChatId, onSelectChat }: ChatsMainWrapperListProps) {
	const [searchTerm, setSearchTerm] = useState("");
	const chats = useConvexQuery(api.queries.chats.getUserChats, { userAppId: user._id });

	const filteredChats = chats?.filter((chat) => {
		const clientName = chat.cliente?.nome?.toLowerCase() || "";
		const lastMessage = chat.ultimaMensagemConteudo?.toLowerCase() || "";
		return clientName.includes(searchTerm.toLowerCase()) || lastMessage.includes(searchTerm.toLowerCase());
	});

	if (!chats) {
		return (
			<div className="w-full h-full flex items-center justify-center">
				<LoadingComponent />
			</div>
		);
	}

	return (
		<div className="flex flex-col h-full gap-3">
			{/* Header da Lista */}
			<div className="border-b border-primary/30 flex flex-col gap-1.5 p-3">
				<div className="flex items-center gap-1.5">
					<MessageCircle className="w-5 h-5 min-w-5 min-h-5" />
					<h2 className="text-lg font-semibold">ATENDIMENTOS</h2>
				</div>
				<div className="flex items-center gap-1.5 border border-primary/10 rounded-lg p-2">
					<Search className="w-4 h-4 min-w-4 min-h-4" />
					<input
						type="text"
						placeholder="Pesquise por suas conversas..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="grow focus:outline-none text-sm placeholder:italic"
					/>
				</div>
			</div>
			{/* Lista de Chats */}
			<div className="flex flex-col gap-1.5 flex-1 overflow-y-auto px-2">
				{filteredChats && filteredChats.length > 0 ? (
					filteredChats.map((chat) => (
						<button
							type="button"
							key={chat._id}
							onClick={() => onSelectChat(chat._id)}
							className={cn("w-full flex gap-3 p-3 hover:bg-primary/10 rounded-lg", selectedChatId === chat._id && "bg-primary/10")}
						>
							<div className="flex items-center justify-center">
								<Avatar className="w-12 h-12 min-w-12 min-h-12">
									<AvatarImage src={undefined} alt={chat.cliente?.nome ?? ""} />
									<AvatarFallback>{formatNameAsInitials(chat.cliente?.nome ?? "")}</AvatarFallback>
								</Avatar>
							</div>
							{/* Informações do Chat */}
							<div className="grow flex flex-col">
								<div className="flex items-center justify-between">
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
								<div className="flex items-center justify-between">
									<p className="text-sm text-primary/60 truncate">{chat.ultimaMensagemConteudo || "Nenhuma mensagem ainda"}</p>
									{(chat.nMensagensNaoLidasUsuario || 0) > 0 && (
										<span className="ml-2 bg-green-500 text-white text-xs font-bold rounded-full px-2 py-1 flex-shrink-0">
											{chat.nMensagensNaoLidasUsuario}
										</span>
									)}
								</div>
								<div className="mt-2 w-full flex items-center justify-between">
									{/* Agente atribuído */}
									{chat.agente ? (
										<div className="flex items-center gap-1">
											<Avatar className="w-6 h-6 min-w-6 min-h-6">
												<AvatarImage src={chat.agente.avatar ?? undefined} alt={chat.agente.nome} />
												<AvatarFallback>{formatNameAsInitials(chat.agente.nome)}</AvatarFallback>
											</Avatar>
											<span className="text-xs text-primary/60">{chat.agente.nome}</span>
										</div>
									) : (
										<div />
									)}
									{chat.canal === "WHATSAPP" ? (
										<div className="flex items-center bg-green-100 text-green-700 px-2 py-1 rounded-lg text-xs gap-1.5">
											<BsWhatsapp className="w-4 h-4" />
											WhatsApp
										</div>
									) : null}
								</div>
							</div>
						</button>
					))
				) : (
					<div className="flex flex-col items-center justify-center h-full p-8 text-center">
						<Users className="w-16 h-16 text-primary/60 mb-3" />
						<p className="text-primary/60 font-medium">Nenhuma conversa encontrada</p>
						<p className="text-primary/60 text-sm mt-1">{searchTerm ? "Tente outro termo de busca" : "Aguardando novas conversas"}</p>
					</div>
				)}
			</div>
		</div>
	);
}

type ChatsMainWrapperActiveChatProps = {
	user: TUserSession;
	activeChatId: Id<"chats">;
};

function ChatsMainWrapperActiveChat({ user, activeChatId }: ChatsMainWrapperActiveChatProps) {
	const [messageText, setMessageText] = useState("");
	const messagesEndRef = useRef<HTMLDivElement>(null);

	// Queries
	const chat = useConvexQuery(api.queries.chats.getAllChats)?.find((c) => c._id === activeChatId);
	const messages = useConvexQuery(api.queries.chats.getChatMessagesByChatId, { chatId: activeChatId });
	const allUsers = useConvexQuery(api.queries.chats.getAllUsers);
	const convexUser = useConvexQuery(api.queries.chats.getUserByIdApp, { idApp: user._id });

	// Mutations
	const sendMessage = useMutation(api.mutations.chatMessages.sendMessage);
	const assignAgent = useMutation(api.mutations.chats.assignChatToAgent);
	const markAsRead = useMutation(api.mutations.chatMessages.markMessagesAsRead);

	// Auto-scroll para última mensagem
	const messagesLength = messages?.length || 0;
	useEffect(() => {
		if (messagesLength > 0) {
			messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
		}
	}, [messagesLength]);

	// Marcar mensagens como lidas quando visualizar o chat
	useEffect(() => {
		if (convexUser && activeChatId) {
			// Marcar como lidas após um pequeno delay para garantir que o usuário realmente viu
			const timer = setTimeout(() => {
				markAsRead({ chatId: activeChatId, usuarioId: convexUser._id }).catch((error) => {
					console.error("Erro ao marcar mensagens como lidas:", error);
				});
			}, 500);

			return () => clearTimeout(timer);
		}
	}, [convexUser, activeChatId, markAsRead]);

	const handleSendMessage = async () => {
		if (!messageText.trim() || !convexUser) return;

		try {
			await sendMessage({
				chatId: activeChatId,
				autorTipo: "USUARIO",
				autorUsuarioId: convexUser._id,
				tipo: "TEXTO",
				conteudoTexto: messageText.trim(),
			});
			setMessageText("");
		} catch (error) {
			toast.error("Erro ao enviar mensagem");
			console.error(error);
		}
	};

	const handleAssignAgent = async (agenteId: Id<"users">) => {
		try {
			await assignAgent({ chatId: activeChatId, agenteId });
			toast.success("Agente atribuído com sucesso!");
		} catch (error) {
			toast.error("Erro ao atribuir agente");
			console.error(error);
		}
	};

	if (!chat) {
		return (
			<div className="flex items-center justify-center h-full">
				<LoadingComponent />
			</div>
		);
	}

	return (
		<div className="flex flex-col h-full gap-3">
			{/* Header do Chat */}
			<div className="p-4 bg-card border-b border-primary/10 flex items-center justify-between shadow-sm">
				<div className="flex items-center gap-3">
					{/* Avatar do Cliente */}
					<Avatar className="w-12 h-12 min-w-12 min-h-12">
						<AvatarImage src={undefined} alt={chat.cliente?.nome ?? ""} />
						<AvatarFallback>{formatNameAsInitials(chat.cliente?.nome ?? "")}</AvatarFallback>
					</Avatar>

					{/* Informações do Cliente */}
					<div>
						<h2 className="font-semibold text-gray-900">{chat.cliente?.nome || "Cliente desconhecido"}</h2>
						<div className="flex items-center gap-2 text-xs text-primary/600">
							<span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">{chat.canal}</span>
							{chat.cliente?.telefone && <span>{chat.cliente.telefone}</span>}
						</div>
					</div>
				</div>
				{/* Seleção de Agente */}
				<div className="flex gap-1.5 items-center">
					{allUsers
						? allUsers.map((u) => (
								<button key={u._id} type="button">
									<Avatar
										onClick={() => handleAssignAgent(u._id)}
										className={cn("w-8 h-8 min-w-8 min-h-8", chat.agenteId === u._id ? "opacity-100" : "opacity-50")}
									>
										<AvatarImage src={u.avatar ?? undefined} alt={u.nome} />
										<AvatarFallback>{formatNameAsInitials(u.nome)}</AvatarFallback>
									</Avatar>
								</button>
							))
						: null}
				</div>
			</div>
			{/* Área de Mensagens */}
			<div className="flex flex-col flex-1 overflow-y-auto p-4 bg-background">
				{messages && messages.length > 0 ? (
					messages.map((message, index) => {
						const isUser = message.autorTipo === "USUARIO";
						const previousMessage = index > 0 ? messages[index - 1] : null;
						const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;

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
									<p className="text-sm break-words whitespace-pre-wrap">{message.conteudoTexto}</p>

									{/* Timestamp - apenas na última mensagem do grupo */}
									{shouldShowTimestamp && (
										<p
											className={cn("text-[10px] mt-1 text-right", {
												"text-blue-100": isUser,
												"text-primary/60": !isUser,
											})}
										>
											{new Date(message.envioData).toLocaleTimeString("pt-BR", {
												hour: "2-digit",
												minute: "2-digit",
											})}
										</p>
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
				<div ref={messagesEndRef} />
			</div>

			{/* Footer - Input de Mensagem */}
			<div className="flex items-end gap-2 p-4 bg-card border-t border-primary/10 shadow-sm">
				<textarea
					value={messageText}
					onChange={(e) => setMessageText(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter" && !e.shiftKey) {
							e.preventDefault();
							handleSendMessage();
						}
					}}
					placeholder="Digite uma mensagem..."
					className="flex-1 px-4 py-3 border border-primary/10 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
					rows={1}
					style={{ maxHeight: "120px" }}
				/>
				<button
					type="button"
					onClick={handleSendMessage}
					disabled={!messageText.trim()}
					className="p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-primary/30 disabled:cursor-not-allowed transition-colors"
					aria-label="Enviar mensagem"
				>
					<Send className="w-5 h-5" />
				</button>
			</div>
		</div>
	);
}
