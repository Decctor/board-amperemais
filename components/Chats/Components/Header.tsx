"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/convex/_generated/api";
import { useConvexQuery } from "@/convex/utils";
import { cn } from "@/lib/utils";
import { MessageCircle, Plus, Search, X } from "lucide-react";
import type { ReactNode } from "react";
import { useChatHub } from "./context";

export type ChatHubHeaderProps = {
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
	showPhoneSelector = true,
	showSearch = false,
	searchQuery = "",
	onSearchChange,
	onNewChat
}: ChatHubHeaderProps) {
	const { selectedPhoneNumber, setSelectedPhoneNumber } = useChatHub();
	const { data: whatsappConnections } = useConvexQuery(api.queries.connections.getWhatsappConnection);

	const phoneNumbers = whatsappConnections?.telefones ?? [];

	return (
		<div
			className={cn("w-full flex flex-col gap-3 px-4 py-3", "border-b border-primary/20 bg-card/50 backdrop-blur-sm", className)}
		>
			<div className="w-full flex items-center justify-between gap-3">
				{/* Left section - Icon/Title */}
				<div className="flex items-center gap-2">
					<MessageCircle className="w-5 h-5 text-primary" />
					<h2 className="font-semibold text-base hidden sm:block">Conversas</h2>
				</div>

				{/* Right section - Actions */}
				<div className="flex items-center gap-2">
					{children}

					{/* Phone Number Selector */}
					{showPhoneSelector && phoneNumbers.length > 0 && (
						<Select value={selectedPhoneNumber ?? undefined} onValueChange={(value) => setSelectedPhoneNumber(value)}>
							<SelectTrigger className="w-[180px] h-10">
								<SelectValue placeholder="Selecione o número" className="text-xs" />
							</SelectTrigger>
							<SelectContent>
								{phoneNumbers.map((phone) => (
									<SelectItem key={phone.numero} value={phone.whatsappTelefoneId}>
										<div className="flex flex-col items-start">
											<span className="text-xs font-medium">{phone.nome}</span>
											{/* <span className="text-[0.65rem] text-muted-foreground">{phone.numero}</span> */}
										</div>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					)}

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
