"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { TActionCard } from "@/lib/queries/ai-business-assistant";
import { ArrowRight, Megaphone, Star, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";

const CARD_CONFIG: Record<
	TActionCard["tipo"],
	{
		label: string;
		icon: React.ComponentType<{ className?: string }>;
		badgeClass: string;
		btnLabel: string;
	}
> = {
	campaign: {
		label: "Campanha",
		icon: Megaphone,
		badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
		btnLabel: "Criar campanha",
	},
	cashback: {
		label: "Cashback",
		icon: Star,
		badgeClass: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
		btnLabel: "Ver programa",
	},
	insight: {
		label: "Insight",
		icon: TrendingUp,
		badgeClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
		btnLabel: "Ver detalhes",
	},
};

type AIActionCardProps = {
	card: TActionCard;
	onDismiss?: () => void;
};

export function AIActionCard({ card, onDismiss }: AIActionCardProps) {
	const router = useRouter();
	const config = CARD_CONFIG[card.tipo];
	const Icon = config.icon;

	const handleAction = () => {
		if (card.tipo === "insight" && card.dados.url) {
			router.push(card.dados.url);
			onDismiss?.();
		} else if (card.tipo === "campaign") {
			router.push("/dashboard/commercial/campaigns");
			onDismiss?.();
		} else if (card.tipo === "cashback") {
			router.push("/dashboard/commercial/cashback");
			onDismiss?.();
		}
	};

	return (
		<div className="mt-3 rounded-xl border border-border bg-secondary/40 p-3.5 flex flex-col gap-2.5">
			<div className="flex items-center gap-2">
				<div className="flex items-center justify-center h-7 w-7 rounded-full bg-background border border-border">
					<Icon className="h-3.5 w-3.5 text-foreground" />
				</div>
				<Badge className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border-0 ${config.badgeClass}`}>{config.label}</Badge>
			</div>
			<div>
				<p className="text-xs font-semibold text-foreground leading-snug">{card.titulo}</p>
				<p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{card.descricao}</p>
			</div>
			<Button size="sm" variant="outline" className="w-full h-8 text-xs rounded-lg gap-1.5 font-medium" onClick={handleAction}>
				{config.btnLabel}
				<ArrowRight className="h-3.5 w-3.5" />
			</Button>
		</div>
	);
}
