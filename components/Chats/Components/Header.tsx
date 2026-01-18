"use client";

import type { TGetWhatsappConnectionOutput } from "@/app/api/whatsapp-connections/route";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, MessageCircle, Plus, Search, Wifi, WifiOff, X } from "lucide-react";
import { type ReactNode, useMemo } from "react";
import { useChatHub } from "./context";

export type ChatHubHeaderProps = {
	whatsappConnection: TGetWhatsappConnectionOutput["data"];
	children?: ReactNode;
	className?: string;
	showPhoneSelector?: boolean;
	showSearch?: boolean;
	searchQuery?: string;
	onSearchChange?: (query: string) => void;
	onNewChat?: () => void;
};

export function Header({
	children,
	className,
	whatsappConnection,
	showPhoneSelector = true,
	showSearch = false,
	searchQuery = "",
	onSearchChange,
	onNewChat,
}: ChatHubHeaderProps) {
	const { selectedPhoneNumber, setSelectedPhoneNumber, user } = useChatHub();
	const phoneNumbers = whatsappConnection?.telefones ?? [];

	const selectedPhoneNumberData = useMemo(
		() => phoneNumbers.find((phone) => phone.whatsappTelefoneId === selectedPhoneNumber),
		[phoneNumbers, selectedPhoneNumber],
	);

	return (
		<div className={cn("w-full flex flex-col gap-3 px-4 py-3", "border-b border-primary/20 bg-card/50 backdrop-blur-sm", className)}>
			<div className="w-full flex items-center justify-between gap-3">
				{/* Left section - Icon/Title */}
				{showPhoneSelector && phoneNumbers.length > 0 ? (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" className="flex items-center gap-2">
								<MessageCircle className="w-4 h-4 min-w-4 min-h-4" />
								<h1>{selectedPhoneNumberData?.nome ?? "SELECIONE UM NÚMERO"}</h1>
								<ChevronDown className="w-4 h-4 min-w-4 min-h-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent className="w-64">
							<DropdownMenuLabel>NÚMEROS</DropdownMenuLabel>
							<DropdownMenuSeparator />
							<DropdownMenuGroup>
								{phoneNumbers.map((phone) => (
									<button key={phone.whatsappTelefoneId} type="button" className="w-full" onClick={() => setSelectedPhoneNumber(phone.whatsappTelefoneId)}>
										<DropdownMenuItem className="flex items-center justify-between">
											<div className="flex items-center gap-1">
												<h1>{phone.nome}</h1>
											</div>
											{selectedPhoneNumber === phone.whatsappTelefoneId ? <Check size={15} /> : null}
										</DropdownMenuItem>
									</button>
								))}
							</DropdownMenuGroup>
						</DropdownMenuContent>
					</DropdownMenu>
				) : null}
				{/* Right section - Actions */}
				<div className="flex items-center gap-2">
					{children}

					{/* New Chat Button */}
					{onNewChat && (
						<Button
							onClick={onNewChat}
							variant="ghost"
							size="icon"
							className="h-9 w-9 rounded-full hover:bg-primary/10 transition-colors"
							title="Nova conversa"
						>
							<Plus className="w-5 h-5" />
						</Button>
					)}
				</div>
			</div>

			{/* Search Input */}
			{showSearch && onSearchChange && (
				<div className="relative w-full">
					<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-primary/40 pointer-events-none" />
					<Input
						type="text"
						placeholder="Buscar conversas..."
						value={searchQuery}
						onChange={(e) => onSearchChange(e.target.value)}
						className="pl-10 pr-10 h-9"
					/>
					{searchQuery && (
						<button
							onClick={() => onSearchChange("")}
							className="absolute right-3 top-1/2 transform -translate-y-1/2 text-primary/40 hover:text-primary transition-colors"
							type="button"
							aria-label="Limpar busca"
						>
							<X className="w-4 h-4" />
						</button>
					)}
				</div>
			)}
		</div>
	);
}
