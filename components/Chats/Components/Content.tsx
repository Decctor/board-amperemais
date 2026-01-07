"use client";

import type { TGetChatDetailsOutput } from "@/app/api/chats/[chatId]/route";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatNameAsInitials } from "@/lib/formatting";
import { useChat } from "@/lib/queries/chats";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Bot, Check, MessageCircle, UserRound, Users } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { ServiceConclusionDialog } from "./ServiceConclusionDialog";
import { ServiceTransferDialog } from "./ServiceTransferDialog";
import { useChatHub } from "./context";

export type ChatHubContentProps = {
	children?: ReactNode;
	className?: string;
	emptyState?: ReactNode;
};

export function Content({ children, className, emptyState }: ChatHubContentProps) {
	const { selectedChatId, selectedPhoneNumber, isDesktop, setSelectedChatId } = useChatHub();

	// If no chat selected, show empty state
	if (!selectedChatId || !selectedPhoneNumber) {
		return (
			<div className={cn("flex-1 flex items-center justify-center bg-background/50", className)}>
				{emptyState || (
					<div className="flex flex-col items-center justify-center p-8 text-center">
						<MessageCircle className="w-16 h-16 text-primary/20 mb-4" />
						<h3 className="text-lg font-semibold text-primary/80 mb-2">Selecione uma conversa</h3>
						<p className="text-sm text-primary/60">Escolha um chat na lista para visualizar as mensagens</p>
					</div>
				)}
			</div>
		);
	}

	const queryClient = useQueryClient();

	const { data: chat, isPending, queryKey } = useChat(selectedChatId);

	const handleOnMutate = async () => await queryClient.cancelQueries({ queryKey });
	const handleOnSettled = async () => await queryClient.invalidateQueries({ queryKey });
	if (isPending || !chat) {
		return (
			<div className={cn("flex-1 flex items-center justify-center", className)}>
				<LoadingComponent />
			</div>
		);
	}

	return (
		<div className={cn("flex-1 flex flex-col w-full h-full overflow-hidden", className)}>
			{/* Chat Header */}
			<ContentHeader
				chat={chat}
				onBack={isDesktop ? undefined : () => setSelectedChatId(null)}
				callbacks={{
					onMutate: handleOnMutate,
					onSettled: handleOnSettled,
				}}
			/>

			{/* Messages and Input (passed as children) */}
			{children}
		</div>
	);
}

type ContentHeaderProps = {
	chat: TGetChatDetailsOutput["data"];
	onBack?: () => void;
	className?: string;
	callbacks?: {
		onMutate?: () => void;
		onSettled?: () => void;
	};
};

function ContentHeader({ chat, onBack, className, callbacks }: ContentHeaderProps) {
	return (
		<div className={cn("w-full flex flex-col border-b border-primary/20 bg-card/80 backdrop-blur-sm", className)}>
			{/* Main header row */}
			<div className="flex items-center gap-3 px-4 py-3">
				{/* Back button (mobile) */}
				{onBack && (
					<Button variant="ghost" size="icon" onClick={onBack} className="h-9 w-9 rounded-full hover:bg-primary/10 transition-colors shrink-0">
						<ArrowLeft className="w-5 h-5" />
					</Button>
				)}

				{/* Avatar */}
				<Avatar className="w-10 h-10 min-w-10 min-h-10 ring-2 ring-primary/10">
					<AvatarImage src={undefined} alt={chat.cliente?.nome ?? ""} />
					<AvatarFallback className="bg-linear-to-br from-primary/20 to-primary/10 text-primary font-semibold">
						{formatNameAsInitials(chat.cliente?.nome ?? "?")}
					</AvatarFallback>
				</Avatar>

				{/* Client info */}
				<div className="flex-1 min-w-0">
					<h2 className="font-semibold text-base text-primary truncate">{chat.cliente?.nome || "Cliente desconhecido"}</h2>
					{chat.cliente?.telefone && <p className="text-xs text-primary/60 truncate">{chat.cliente.telefone}</p>}
				</div>

				{/* Status indicator */}
				<div className="shrink-0">
					<div
						className={cn(
							"px-3 py-1 rounded-full text-xs font-medium",
							chat.status === "FECHADA" ? "bg-amber-200 text-amber-700" : "bg-green-200 text-green-700",
						)}
					>
						{chat.status === "FECHADA" ? "Expirada" : "Ativa"}
					</div>
				</div>
			</div>

			{/* Service banner (if open) */}
			{chat.atendimentoAberto && <ServiceBanner service={chat.atendimentoAberto} callbacks={callbacks} />}
		</div>
	);
}

type ServiceBannerProps = {
	service: NonNullable<TGetChatDetailsOutput["data"]["atendimentoAberto"]>;
	callbacks?: {
		onMutate?: () => void;
		onSettled?: () => void;
	};
};

function ServiceBanner({ service, callbacks }: ServiceBannerProps) {
	const { user } = useChatHub();
	const [transferDialogIsOpen, setTransferDialogIsOpen] = useState(false);
	const [conclusionDialogIsOpen, setConclusionDialogIsOpen] = useState(false);

	const responsavelTipo = service.responsavelTipo;
	const responsavelUsuario = service.responsavelUsuario;

	return (
		<>
			<div className="bg-linear-to-b from-primary/90 to-primary  text-primary-foreground px-4 py-2.5">
				<div className="flex items-center justify-between gap-3 flex-wrap">
					{/* Service info */}
					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-2 mb-1">
							<span className="text-xs font-bold tracking-wide">ATENDIMENTO EM ANDAMENTO</span>
							{service.dataInicio && (
								<span className="text-xs opacity-90">
									desde{" "}
									{new Date(service.dataInicio).toLocaleString("pt-BR", {
										day: "2-digit",
										month: "2-digit",
										hour: "2-digit",
										minute: "2-digit",
									})}
								</span>
							)}
						</div>
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<p className="text-sm font-medium truncate">{service.descricao}</p>
								</TooltipTrigger>
								<TooltipContent className="max-w-[300px] ">
									<p className="text-xs font-medium wrap-break-word whitespace-pre-wrap text-justify">{service.descricao}</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					</div>

					{/* Responsible and Transfer Button */}
					<div className="flex items-center gap-2">
						{responsavelTipo === "AI" ? (
							<div className="flex items-center gap-1.5 px-2.5 py-1 bg-primary-foreground/20 rounded-full text-xs font-medium backdrop-blur-sm">
								<Bot className="w-4 h-4" />
								<span>IA</span>
							</div>
						) : responsavelUsuario ? (
							<div className="flex items-center gap-1.5 px-2.5 py-1 bg-primary-foreground/20 rounded-full text-xs font-medium backdrop-blur-sm">
								<UserRound className="w-4 h-4" />
								<span className="truncate max-w-[120px]">{responsavelUsuario.nome}</span>
							</div>
						) : (
							<div className="px-2.5 py-1 bg-primary-foreground/20  rounded-full text-xs font-medium backdrop-blur-sm">Sem responsável</div>
						)}

						{/* Transfer Button */}
						<Button
							variant="ghost"
							size="icon"
							onClick={() => setTransferDialogIsOpen(true)}
							className="h-7 w-7 rounded-full hover:bg-primary-foreground/30 text-primary-foreground shrink-0"
						>
							<Users className="w-4 h-4" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							onClick={() => setConclusionDialogIsOpen(true)}
							className="h-7 w-7 rounded-full hover:bg-primary-foreground/30 text-primary-foreground shrink-0"
						>
							<Check className="w-4 h-4" />
						</Button>
					</div>
				</div>
			</div>

			{/* Transfer Dialog */}
			{user && transferDialogIsOpen && (
				<ServiceTransferDialog
					closeMenu={() => setTransferDialogIsOpen(false)}
					serviceId={service.id}
					currentResponsible={
						responsavelTipo === "AI"
							? "ai"
							: responsavelUsuario
								? {
										nome: responsavelUsuario.nome ?? "",
										avatar_url: responsavelUsuario.avatarUrl ?? null,
										idApp: responsavelUsuario.id,
									}
								: null
					}
					currentUserIdApp={user.id}
					callbacks={callbacks}
				/>
			)}

			{/* Conclusion Dialog */}
			{user && conclusionDialogIsOpen && (
				<ServiceConclusionDialog
					closeMenu={() => setConclusionDialogIsOpen(false)}
					serviceId={service.id}
					currentDescription={service.descricao}
					callbacks={callbacks}
				/>
			)}
		</>
	);
}
