import { Loader2 } from "lucide-react";

export default function ShopLoading() {
	return (
		<div className="min-h-screen flex items-center justify-center bg-background">
			<div className="flex flex-col items-center gap-4">
				<Loader2 className="w-8 h-8 animate-spin text-primary" />
				<p className="text-sm text-muted-foreground">Carregando...</p>
			</div>
		</div>
	);
}
