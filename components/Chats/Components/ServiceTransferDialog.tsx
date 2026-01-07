"use client";

import SelectInput from "@/components/Inputs/SelectInput";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getErrorMessage } from "@/lib/errors";
import { formatNameAsInitials } from "@/lib/formatting";
import { transferService, useTransferService } from "@/lib/mutations/chats";
import { useUsers } from "@/lib/queries/users";
import { cn } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { Bot, UserRound, Users } from "lucide-react";
import { useState } from "react";
import type React from "react";
import { toast } from "sonner";

type ServiceTransferDialogProps = {
	closeMenu: () => void;
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

export function ServiceTransferDialog({ closeMenu, serviceId, currentResponsible, currentUserIdApp, callbacks }: ServiceTransferDialogProps) {
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
			options.push({ value: "to-me", label: "PARA MIM", icon: <UserRound className="w-4 h-4" /> });
			options.push({ value: "to-other", label: "PARA OUTRO USUÁRIO", icon: <Users className="w-4 h-4" /> });
		}
		// If user is responsible (and not current user), can transfer to me, AI, or other user
		else if (currentResponsible && !isCurrentUserResponsible) {
			options.push({ value: "to-me", label: "PARA MIM", icon: <UserRound className="w-4 h-4" /> });
			options.push({ value: "to-ai", label: "PARA IA", icon: <Bot className="w-4 h-4" /> });
			options.push({ value: "to-other", label: "PARA OUTRO USUÁRIO", icon: <Users className="w-4 h-4" /> });
		}
		// If current user is responsible, can transfer to AI or other user
		else if (isCurrentUserResponsible) {
			options.push({ value: "to-ai", label: "PARA IA", icon: <Bot className="w-4 h-4" /> });
			options.push({ value: "to-other", label: "PARA OUTRO USUÁRIO", icon: <Users className="w-4 h-4" /> });
		}
		// If no responsible, can transfer to me or other user
		else {
			options.push({ value: "to-me", label: "PARA MIM", icon: <UserRound className="w-4 h-4" /> });
			options.push({ value: "to-other", label: "PARA OUTRO USUÁRIO", icon: <Users className="w-4 h-4" /> });
		}

		return options;
	};

	const availableOptions = getAvailableTransferTypes();

	const { mutate: handleTransferChatService, isPending } = useMutation({
		mutationFn: transferService,
		mutationKey: ["transfer-service", serviceId],
		onMutate: () => {
			if (callbacks?.onMutate) callbacks.onMutate();
		},
		onSuccess: (data) => {
			if (callbacks?.onSuccess) callbacks.onSuccess();
			toast.success(data.message);
			return closeMenu();
		},
		onError: (error) => {
			if (callbacks?.onError) callbacks.onError();
			return toast.error(getErrorMessage(error));
		},
		onSettled: () => {
			if (callbacks?.onSettled) callbacks.onSettled();
		},
	});
	async function handleStartTransfer() {
		if (!transferType) throw new Error("Selecione uma opção de transferência");
		if (transferType === "to-other" && !selectedUserIdApp) throw new Error("Selecione um usuário para transferir");

		let userId: string | undefined = undefined;

		if (transferType === "to-me") {
			// Use current user ID directly
			userId = currentUserIdApp;
		} else if (transferType === "to-other" && selectedUserIdApp) {
			// Use selected user ID directly
			userId = selectedUserIdApp;
		}
		// If transferType === "to-ai", userId remains undefined

		handleTransferChatService({ serviceId, userId });
	}

	return (
		<ResponsiveMenu
			menuTitle="TRANSFERIR RESPONSABILIDADE"
			menuDescription="Confirme a transferência da responsabilidade do atendimento."
			menuActionButtonText="TRANSFERIR"
			menuCancelButtonText="CANCELAR"
			actionFunction={handleStartTransfer}
			actionIsLoading={isPending}
			stateIsLoading={false}
			stateError={null}
			closeMenu={() => closeMenu()}
		>
			<div className="py-4 space-y-6">
				{/* Current responsible */}
				<div className="flex items-center gap-3">
					<span className="text-sm text-muted-foreground min-w-[80px]">DE:</span>
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
					<span className="text-sm font-medium text-muted-foreground">SELECIONE PARA ONDE TRANSFERIR:</span>
					<div className="w-full flex flex-col gap-2 items-center lg:flex-row flex-wrap">
						{availableOptions.map((option) => (
							<Button
								key={option.value}
								size="fit"
								variant={transferType === option.value ? "default" : "ghost"}
								className={cn("flex items-center gap-2 px-2 py-1", transferType === option.value && "bg-primary text-primary-foreground")}
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
						<div className="flex items-center gap-3 w-full">
							<span className="text-sm text-muted-foreground min-w-[80px]">PARA:</span>
							{transferType === "to-other" ? (
								<div className="grow">
									<SelectInput
										label="SELECIONE UM USUÁRIO"
										showLabel={false}
										resetOptionLabel="SELECIONE UM USUÁRIO"
										value={selectedUserIdApp || ""}
										options={users?.map((user) => ({ id: user.id, label: user.nome, value: user.id })) || []}
										handleChange={setSelectedUserIdApp}
										onReset={() => setSelectedUserIdApp(null)}
										width="100%"
									/>
								</div>
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
