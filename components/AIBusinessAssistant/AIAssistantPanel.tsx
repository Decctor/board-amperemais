"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useAIBusinessAssistant, parseActionCard, stripActionCard } from "@/lib/queries/ai-business-assistant";
import { cn } from "@/lib/utils";
import { Bot, Loader2, Send, Sparkles, User } from "lucide-react";
import { useEffect, useRef, type FormEvent, type KeyboardEvent } from "react";
import { AIActionCard } from "./AIActionCard";

const SUGGESTED_PROMPTS = [
	"Quais clientes estão em risco de abandono?",
	"Qual é a tendência de vendas dos últimos 30 dias?",
	"Quem são meus 10 melhores clientes?",
	"Como está a performance das minhas campanhas?",
	"Analise meu programa de cashback",
	"O que devo fazer para aumentar o ticket médio?",
];

type AIAssistantPanelProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export function AIAssistantPanel({ open, onOpenChange }: AIAssistantPanelProps) {
	const { messages, input, handleInputChange, handleSubmit, isLoading, setInput } = useAIBusinessAssistant();
	const scrollRef = useRef<HTMLDivElement>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	// Auto-scroll to bottom when new messages arrive
	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	}, [messages]);

	const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			if (input.trim() && !isLoading) {
				handleSubmit(e as unknown as FormEvent<HTMLFormElement>);
			}
		}
	};

	const handlePromptClick = (prompt: string) => {
		setInput(prompt);
		textareaRef.current?.focus();
	};

	const hasMessages = messages.length > 0;

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="w-[420px] sm:w-[480px] p-0 flex flex-col gap-0 font-sans">
				{/* Header */}
				<SheetHeader className="px-5 py-4 border-b border-border/60 flex-shrink-0">
					<SheetTitle className="flex items-center gap-2.5 text-base font-bold">
						<div className="flex items-center justify-center h-8 w-8 rounded-full bg-brand text-brand-foreground">
							<Sparkles className="h-4 w-4" />
						</div>
						ASSISTENTE DE NEGÓCIOS
					</SheetTitle>
					<p className="text-xs text-muted-foreground font-normal">IA com acesso aos seus dados em tempo real</p>
				</SheetHeader>

				{/* Messages area */}
				<div className="flex-1 min-h-0 overflow-hidden">
					{!hasMessages ? (
						/* Empty state with suggested prompts */
						<div className="h-full flex flex-col justify-end px-4 pb-4">
							<div className="flex flex-col items-center text-center py-8 mb-4">
								<div className="flex items-center justify-center h-14 w-14 rounded-full bg-secondary mb-3">
									<Bot className="h-7 w-7 text-muted-foreground" />
								</div>
								<p className="text-sm font-semibold text-foreground">Como posso ajudar?</p>
								<p className="text-xs text-muted-foreground mt-1 max-w-[260px]">
									Faça perguntas sobre seus clientes, vendas, campanhas ou cashback.
								</p>
							</div>
							<div className="grid grid-cols-1 gap-2">
								{SUGGESTED_PROMPTS.map((prompt) => (
									<button
										key={prompt}
										type="button"
										onClick={() => handlePromptClick(prompt)}
										className="text-left text-xs px-3 py-2.5 rounded-lg border border-border bg-secondary/50 hover:bg-secondary text-foreground transition-colors leading-relaxed"
									>
										{prompt}
									</button>
								))}
							</div>
						</div>
					) : (
						<ScrollArea className="h-full px-4 py-3" ref={scrollRef as React.Ref<HTMLDivElement>}>
							<div className="flex flex-col gap-4 pb-2">
								{messages.map((message) => {
									const isUser = message.role === "user";
									const rawContent = typeof message.content === "string" ? message.content : "";
									const actionCard = !isUser ? parseActionCard(rawContent) : null;
									const displayContent = actionCard ? stripActionCard(rawContent) : rawContent;

									return (
										<div key={message.id} className={cn("flex gap-2.5", isUser && "flex-row-reverse")}>
											{/* Avatar */}
											<div
												className={cn(
													"flex-shrink-0 flex items-center justify-center h-7 w-7 rounded-full mt-0.5",
													isUser ? "bg-brand text-brand-foreground" : "bg-secondary text-secondary-foreground border border-border",
												)}
											>
												{isUser ? <User className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
											</div>

											{/* Bubble */}
											<div className={cn("flex flex-col max-w-[85%]", isUser && "items-end")}>
												<div
													className={cn(
														"rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
														isUser
															? "bg-brand text-brand-foreground rounded-tr-sm"
															: "bg-secondary text-foreground rounded-tl-sm",
													)}
												>
													{displayContent}
												</div>
												{actionCard && <AIActionCard card={actionCard} onDismiss={() => onOpenChange(false)} />}
											</div>
										</div>
									);
								})}
								{isLoading && (
									<div className="flex gap-2.5">
										<div className="flex-shrink-0 flex items-center justify-center h-7 w-7 rounded-full bg-secondary border border-border mt-0.5">
											<Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
										</div>
										<div className="bg-secondary rounded-2xl rounded-tl-sm px-3.5 py-2.5">
											<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
										</div>
									</div>
								)}
							</div>
						</ScrollArea>
					)}
				</div>

				{/* Input area */}
				<div className="flex-shrink-0 px-4 pb-5 pt-3 border-t border-border/60">
					<form onSubmit={handleSubmit} className="flex gap-2 items-end">
						<Textarea
							ref={textareaRef}
							value={input}
							onChange={handleInputChange}
							onKeyDown={handleKeyDown}
							placeholder="Pergunte sobre seus dados..."
							rows={1}
							className="resize-none min-h-[40px] max-h-[120px] text-sm rounded-xl flex-1 py-2.5 px-3"
						/>
						<Button
							type="submit"
							size="icon"
							disabled={!input.trim() || isLoading}
							className="h-10 w-10 rounded-xl flex-shrink-0 bg-brand hover:bg-brand/90 text-brand-foreground"
						>
							{isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
						</Button>
					</form>
					<p className="text-[10px] text-muted-foreground text-center mt-2">Dados consultados em tempo real · Respostas geradas por IA</p>
				</div>
			</SheetContent>
		</Sheet>
	);
}
