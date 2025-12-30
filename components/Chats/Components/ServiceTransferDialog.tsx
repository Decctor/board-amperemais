"use client";

import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatNameAsInitials } from "@/lib/formatting";
import { useTransferService } from "@/lib/mutations/chats";
import { useUsers } from "@/lib/queries/users";
import { cn } from "@/lib/utils";
import { Bot, UserRound, Users } from "lucide-react";
import { useState } from "react";
import type React from "react";
import { toast } from "sonner";

type ServiceTransferDialogProps = {
	closeMenu: () => void;
	serviceId: string;
	currentResponsible: "ai" | { nome: string; avatar_url: string | null; idApp: string } | null;
	currentUserIdApp: string;
};

export function ServiceTransferDialog({ closeMenu, serviceId, currentResponsible, currentUserIdApp }: ServiceTransferDialogProps) {
	const [transferType, setTransferType] = useState<"to-me" | "to-other" | "to-ai" | null>(null);
	const [selectedUserIdApp, setSelectedUserIdApp] = useState<string | null>(null);

	const { data: users } = useUsers({});
	const transferServiceMutation = useTransferService();

	// Determine available transfer options based on current responsible
	const isCurrentUserResponsible =
		currentResponsible && currentResponsible !== "ai" && "idApp" in currentResponsible && currentResponsible.idApp === currentUserIdApp;

	const getAvailableTransferTypes = (): Array<{ value: "to-me" | "to-other" | "to-ai"; label: string; icon: React.ReactNode }> => {
		const options: Array<{ value: "to-me" | "to-other" | "to-ai"; label: string; icon: React.ReactNode }> = [];

		// If AI is responsible, can transfer to me or other user
		if (currentResponsible === "ai") {
			options.push({ value: "to-me", label: "Transferir para mim", icon: <UserRound className="w-4 h-4" /> });
			options.push({ value: "to-other", label: "Transferir para outro usuário", icon: <Users className="w-4 h-4" /> });
		}
		// If user is responsible (and not current user), can transfer to me, AI, or other user
		else if (currentResponsible && !isCurrentUserResponsible) {
			options.push({ value: "to-me", label: "Transferir para mim", icon: <UserRound className="w-4 h-4" /> });
			options.push({ value: "to-ai", label: "Transferir para IA", icon: <Bot className="w-4 h-4" /> });
			options.push({ value: "to-other", label: "Transferir para outro usuário", icon: <Users className="w-4 h-4" /> });
		}
		// If current user is responsible, can transfer to AI or other user
		else if (isCurrentUserResponsible) {
			options.push({ value: "to-ai", label: "Transferir para IA", icon: <Bot className="w-4 h-4" /> });
			options.push({ value: "to-other", label: "Transferir para outro usuário", icon: <Users className="w-4 h-4" /> });
		}
		// If no responsible, can transfer to me or other user
		else {
			options.push({ value: "to-me", label: "Transferir para mim", icon: <UserRound className="w-4 h-4" /> });
			options.push({ value: "to-other", label: "Transferir para outro usuário", icon: <Users className="w-4 h-4" /> });
		}

		return options;
	};

	const availableOptions = getAvailableTransferTypes();

	const handleTransfer = async () => {
		if (!transferType) {
			toast.error("Selecione uma opção de transferência");
			return;
		}

		if (transferType === "to-other" && !selectedUserIdApp) {
			toast.error("Selecione um usuário para transferir");
			return;
		}

		try {
			let userId: string | undefined = undefined;

			if (transferType === "to-me") {
				// Use current user ID directly
				userId = currentUserIdApp;
			} else if (transferType === "to-other" && selectedUserIdApp) {
				// Use selected user ID directly
				userId = selectedUserIdApp;
			}
			// If transferType === "to-ai", userId remains undefined

			await transferServiceMutation.mutateAsync({
				serviceId,
				userId,
			});

			toast.success("Responsabilidade transferida com sucesso");
			closeMenu();
			setSelectedUserIdApp(null);
			setTransferType(null);
		} catch (error) {
			// Error is already handled by the mutation hook
			console.error("Error transferring service:", error);
		}
	};

	return (
		<ResponsiveMenu
			menuTitle="TRANSFERIR RESPONSABILIDADE"
			menuDescription="Confirme a transferência da responsabilidade do atendimento."
			menuActionButtonText="TRANSFERIR"
			menuCancelButtonText="CANCELAR"
			actionFunction={handleTransfer}
			actionIsLoading={transferServiceMutation.isPending}
			stateIsLoading={false}
			stateError={null}
			closeMenu={() => closeMenu()}
		>
			<div className="py-4 space-y-6">
				{/* Current responsible */}
				<div className="flex items-center gap-3">
					<span className="text-sm text-muted-foreground min-w-[80px]">De:</span>
					<div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg flex-1">
						{currentResponsible === "ai" ? (
							<>
								<Bot className="w-4 h-4" />
								<span className="text-sm font-medium">IA</span>
							</>
						) : currentResponsible ? (
							<>
								<Avatar className="w-6 h-6">
									<AvatarImage src={currentResponsible.avatar_url || undefined} />
									<AvatarFallback className="text-xs">{formatNameAsInitials(currentResponsible.nome)}</AvatarFallback>
								</Avatar>
								<span className="text-sm font-medium">{currentResponsible.nome}</span>
							</>
						) : (
							<>
								<UserRound className="w-4 h-4" />
								<span className="text-sm font-medium">Sem responsável</span>
							</>
						)}
					</div>
				</div>

				{/* Transfer type selection */}
				<div className="space-y-3">
					<span className="text-sm font-medium text-muted-foreground">Selecione para onde transferir:</span>
					<div className="flex flex-col gap-2">
						{availableOptions.map((option) => (
							<Button
								key={option.value}
								variant={transferType === option.value ? "default" : "outline"}
								className={cn("w-full justify-start gap-2 h-auto py-3", transferType === option.value && "bg-primary text-primary-foreground")}
								onClick={() => {
									setTransferType(option.value);
									if (option.value !== "to-other") {
										setSelectedUserIdApp(null);
									}
								}}
							>
								{option.icon}
								<span>{option.label}</span>
							</Button>
						))}
					</div>
				</div>

				{/* Target responsible display */}
				{transferType && (
					<>
						{/* Arrow */}
						<div className="flex justify-center">
							<div className="w-8 h-8 flex items-center justify-center text-muted-foreground">
								<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Arrow">
									<title>Arrow</title>
									<path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
								</svg>
							</div>
						</div>

						{/* Target responsible */}
						<div className="flex items-center gap-3">
							<span className="text-sm text-muted-foreground min-w-[80px]">Para:</span>
							{transferType === "to-other" ? (
								<Select value={selectedUserIdApp || ""} onValueChange={setSelectedUserIdApp}>
									<SelectTrigger className="flex-1">
										<SelectValue placeholder="Selecione um usuário" />
									</SelectTrigger>
									<SelectContent>
										{users?.map((user) => (
											<SelectItem key={user.id} value={user.id}>
												<div className="flex items-center gap-2">
													<Avatar className="w-5 h-5">
														<AvatarImage src={user.avatarUrl || undefined} />
														<AvatarFallback className="text-xs">{formatNameAsInitials(user.nome)}</AvatarFallback>
													</Avatar>
													<span>{user.nome}</span>
												</div>
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							) : (
								<div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg flex-1">
									{transferType === "to-ai" ? (
										<>
											<Bot className="w-4 h-4" />
											<span className="text-sm font-medium">IA</span>
										</>
									) : (
										<>
											<UserRound className="w-4 h-4" />
											<span className="text-sm font-medium">Você</span>
										</>
									)}
								</div>
							)}
						</div>
					</>
				)}
			</div>
		</ResponsiveMenu>
	);
}
