"use client";

import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { useState } from "react";
import { AIAssistantPanel } from "./AIAssistantPanel";

export function AIAssistantTrigger() {
	const [open, setOpen] = useState(false);

	return (
		<>
			<Button
				size="icon"
				onClick={() => setOpen(true)}
				className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-2xl bg-brand hover:bg-brand/90 text-brand-foreground border-2 border-white/20 transition-all duration-200 hover:scale-105"
				aria-label="Abrir Assistente de Negócios"
			>
				<Sparkles className="h-6 w-6" />
			</Button>
			<AIAssistantPanel open={open} onOpenChange={setOpen} />
		</>
	);
}
