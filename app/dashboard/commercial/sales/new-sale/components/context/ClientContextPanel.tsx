import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TCashbackProgramEntity } from "@/services/drizzle/schema";
import { PanelRightClose, UserRound } from "lucide-react";
import ClientContextContent, { type TCrossSellProduct } from "./ClientContextContent";

type ClientContextPanelProps = {
	isOpen: boolean;
	onClose: () => void;
	clientId: string;
	fallbackName: string;
	fallbackPhone: string;
	basketProductIds: string[];
	organizationCashbackProgram: TCashbackProgramEntity | null;
	onSelectProduct: (product: TCrossSellProduct) => void;
};

export default function ClientContextPanel({ isOpen, onClose, ...contentProps }: ClientContextPanelProps) {
	return (
		<div
			className={cn("hidden shrink-0 overflow-hidden transition-[width] duration-200 ease-out lg:block", isOpen ? "w-[320px]" : "w-0")}
			aria-hidden={!isOpen}
		>
			<div className="flex h-full w-[320px] flex-col overflow-hidden rounded-xl border border-brand/20 bg-brand/[0.05] shadow-2xs">
				<div className="flex items-center justify-between border-b border-brand/15 bg-card/70 px-4 py-2.5">
					<span className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground">
						<UserRound className="h-3.5 w-3.5" /> CONTEXTO DO CLIENTE
					</span>
					<Button type="button" size="icon" variant="ghost" className="h-6 w-6" onClick={onClose} aria-label="Fechar contexto do cliente">
						<PanelRightClose className="h-3.5 w-3.5" />
					</Button>
				</div>
				<div className="min-h-0 flex-1">
					<ClientContextContent {...contentProps} />
				</div>
			</div>
		</div>
	);
}
