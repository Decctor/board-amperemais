"use client";

import type { TGetChatDetailsOutput } from "@/app/api/chats/[chatId]/route";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getErrorMessage } from "@/lib/errors";
import { formatNameAsInitials } from "@/lib/formatting";
import { transferService } from "@/lib/mutations/chats";
import { useChat } from "@/lib/queries/chats";
import { useUsers } from "@/lib/queries/users";
import { cn } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Bot, Check, Loader2, MessageCircle, UserRound, Users } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { ServiceConclusionDialog } from "./ServiceConclusionDialog";
import { useChatHub } from "./context";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
						<MessageCircle className="w-16 h-16 text-foreground/20 mb-4" />
						<h3 className="text-lg font-semibold text-foreground/80 mb-2">Selecione uma conversa</h3>
						<p className="text-sm text-foreground/60">Escolha um chat na lista para visualizar as mensagens</p>
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
		<div className={cn("w-full flex flex-col border-b border-border bg-card/80 backdrop-blur-sm", className)}>
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
					<AvatarFallback className="bg-linear-to-br from-primary/20 to-primary/10 text-foreground font-semibold">
						{formatNameAsInitials(chat.cliente?.nome ?? "?")}
					</AvatarFallback>
				</Avatar>

				{/* Client info */}
				<div className="flex-1 min-w-0">
					<h2 className="font-semibold text-base text-foreground truncate">{chat.cliente?.nome || "Cliente desconhecido"}</h2>
					{chat.cliente?.telefone && <p className="text-xs text-foreground/60 truncate">{chat.cliente.telefone}</p>}
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
	const [conclusionDialogIsOpen, setConclusionDialogIsOpen] = useState(false);

	const responsavelTipo = service.responsavelTipo;
	const responsavelUsuario = service.responsavelUsuario;

	const currentResponsibleForTransfer =
		responsavelTipo === "AI"
			? ("ai" as const)
			: responsavelUsuario
				? {
						nome: responsavelUsuario.nome ?? "",
						avatar_url: responsavelUsuario.avatarUrl ?? null,
						idApp: responsavelUsuario.id,
					}
				: null;

	return (
		<>
			<div className="bg-linear-to-b from-primary/90 to-primary  text-foreground-foreground px-4 py-2.5">
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

					<div className="flex items-center gap-2">
						<ServiceBannerResponsible
							serviceId={service.id}
							currentResponsible={currentResponsibleForTransfer}
							currentUserIdApp={user.id}
							callbacks={callbacks}
						/>

						<Button
							variant="ghost"
							size="icon"
							onClick={() => setConclusionDialogIsOpen(true)}
							className="h-7 w-7 rounded-full hover:bg-primary-foreground/30 text-foreground-foreground shrink-0"
						>
							<Check className="w-4 h-4" />
						</Button>
					</div>
				</div>
			</div>

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

type ServiceBannerResponsibleProps = {
	serviceId: string;
	currentResponsible: "ai" | { nome: string; avatar_url: string | null; idApp: string } | null;
	currentUserIdApp: string;
	callbacks?: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: () => void;
		onSettled?: () => void;
	};
};

function ServiceBannerResponsible({ serviceId, currentResponsible, currentUserIdApp, callbacks }: ServiceBannerResponsibleProps) {
	const { data: users } = useUsers({});

	const isCurrentUserResponsible =
		typeof currentResponsible === "object" && currentResponsible !== null && currentResponsible.idApp === currentUserIdApp;

	const otherUserOptions =
		users?.filter((u) => {
			if (u.id === currentUserIdApp) return false;
			if (currentResponsible === "ai" || currentResponsible === null) return true;
			return u.id !== currentResponsible.idApp;
		}) ?? [];

	const showTransferToMe =
		currentResponsible === "ai" || currentResponsible === null || (typeof currentResponsible === "object" && !isCurrentUserResponsible);
	const showTransferToAi = currentResponsible !== null && currentResponsible !== "ai";
	const showOtherUsersSubmenu = otherUserOptions.length > 0;

	const { mutate, isPending } = useMutation({
		mutationFn: transferService,
		mutationKey: ["transfer-service", serviceId],
		onMutate: () => {
			callbacks?.onMutate?.();
		},
		onSuccess: (data) => {
			callbacks?.onSuccess?.();
			toast.success(data.message);
		},
		onError: (error) => {
			callbacks?.onError?.();
			toast.error(getErrorMessage(error));
		},
		onSettled: () => {
			callbacks?.onSettled?.();
		},
	});

	const triggerIcon =
		currentResponsible === "ai" ? (
			<Bot className="w-4 h-4 shrink-0" />
		) : currentResponsible ? (
			<UserRound className="w-4 h-4 shrink-0" />
		) : (
			<UserRound className="w-4 h-4 shrink-0" />
		);

	const triggerText = currentResponsible === "ai" ? "IA" : currentResponsible ? currentResponsible.nome : "Sem responsável";

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="sm" disabled={isPending} className="flex items-center gap-1.5 shrink-0 px-2.5 rounded-full max-w-[200px]">
					{isPending ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : triggerIcon}
					<span className="truncate">{triggerText}</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-56">
				<DropdownMenuLabel className="text-xs font-semibold">TRANSFERIR PARA</DropdownMenuLabel>
				<DropdownMenuSeparator />
				{showTransferToMe && (
					<DropdownMenuItem disabled={isPending} onClick={() => mutate({ serviceId, userId: currentUserIdApp })}>
						<UserRound className="w-4 h-4" />
						<span>VOCÊ</span>
					</DropdownMenuItem>
				)}
				{showTransferToAi && (
					<DropdownMenuItem disabled={isPending} onClick={() => mutate({ serviceId, userId: undefined })}>
						<Bot className="w-4 h-4" />
						<span>IA</span>
					</DropdownMenuItem>
				)}
				{showOtherUsersSubmenu && (showTransferToMe || showTransferToAi) && <DropdownMenuSeparator />}
				{showOtherUsersSubmenu && (
					<DropdownMenuSub>
						<DropdownMenuSubTrigger disabled={isPending} className="gap-2">
							<Users className="w-4 h-4" />
							<span>OUTRO USUÁRIO</span>
						</DropdownMenuSubTrigger>
						<DropdownMenuSubContent className="max-h-64 overflow-y-auto">
							{otherUserOptions.map((u) => (
								<DropdownMenuItem key={u.id} disabled={isPending} onClick={() => mutate({ serviceId, userId: u.id })}>
									<Avatar className="h-6 w-6">
										<AvatarImage src={u.avatarUrl ?? undefined} alt="" />
										<AvatarFallback className="text-[10px]">{formatNameAsInitials(u.nome)}</AvatarFallback>
									</Avatar>
									<span className="truncate">{u.nome}</span>
								</DropdownMenuItem>
							))}
						</DropdownMenuSubContent>
					</DropdownMenuSub>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
