import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { TCashbackProgramEntity } from "@/services/drizzle/schema";
import ClientContextContent, { type TCrossSellProduct } from "./ClientContextContent";

type ClientContextSheetProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	clientId: string;
	fallbackName: string;
	fallbackPhone: string;
	basketProductIds: string[];
	organizationCashbackProgram: TCashbackProgramEntity | null;
	onSelectProduct: (product: TCrossSellProduct) => void;
};

export default function ClientContextSheet({ open, onOpenChange, ...contentProps }: ClientContextSheetProps) {
	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="bottom"
				className="h-[88dvh] gap-0 overflow-hidden rounded-t-2xl border-t border-brand/20 bg-background p-0 pb-[env(safe-area-inset-bottom)] data-[side=bottom]:h-[88dvh]"
			>
				<SheetHeader className="sr-only">
					<SheetTitle>CONTEXTO DO CLIENTE</SheetTitle>
					<SheetDescription>Dados, sugestões e histórico do cliente vinculado.</SheetDescription>
				</SheetHeader>
				<div className="min-h-0 flex-1">
					<ClientContextContent {...contentProps} />
				</div>
			</SheetContent>
		</Sheet>
	);
}
