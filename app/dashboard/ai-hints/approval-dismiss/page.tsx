import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AlertTriangle, ArrowRight, CheckCircle2, Sparkles, XCircle } from "lucide-react";
import Link from "next/link";

type TResultType = "success" | "dismiss" | "error";

const VARIANT_CONFIG = {
	success: {
		Icon: CheckCircle2,
		iconColor: "text-green-500 dark:text-green-400",
		iconBg: "bg-green-500/10",
		borderColor: "border-green-500/25",
		accentBg: "bg-green-500/8",
		label: "APROVADO",
		labelColor: "text-green-600 dark:text-green-400",
		labelBg: "bg-green-500/10",
		defaultTitle: "Sugestão aprovada com sucesso!",
		defaultMessage: "Obrigado pela confirmação. Sua campanha seguirá de acordo com essa indicação.",
	},
	dismiss: {
		Icon: XCircle,
		iconColor: "text-muted-foreground",
		iconBg: "bg-muted",
		borderColor: "border-border",
		accentBg: "bg-muted/40",
		label: "DESCARTADO",
		labelColor: "text-muted-foreground",
		labelBg: "bg-muted",
		defaultTitle: "Sugestão descartada.",
		defaultMessage: "Tudo bem! Essa indicação foi ignorada e não afetará suas campanhas.",
	},
	error: {
		Icon: AlertTriangle,
		iconColor: "text-red-500 dark:text-red-400",
		iconBg: "bg-red-500/10",
		borderColor: "border-red-500/25",
		accentBg: "bg-red-500/8",
		label: "ERRO",
		labelColor: "text-red-600 dark:text-red-400",
		labelBg: "bg-red-500/10",
		defaultTitle: "Algo deu errado.",
		defaultMessage: "Não foi possível processar sua ação. Por favor, acesse suas campanhas e tente novamente.",
	},
} satisfies Record<TResultType, object>;

type ApprovalDismissPageProps = {
	searchParams: Promise<{ type?: string; message?: string }>;
};

export default async function ApprovalDismissPage({ searchParams }: ApprovalDismissPageProps) {
	const params = await searchParams;
	const rawType = params.type as TResultType | undefined;
	const type: TResultType = rawType && rawType in VARIANT_CONFIG ? rawType : "success";
	const message = params.message ?? "";

	const variant = VARIANT_CONFIG[type];
	const { Icon } = variant;

	return (
		<div className="flex flex-1 min-h-[70vh] items-center justify-center">
			<div
				className={cn(
					"relative flex w-full max-w-md flex-col items-center gap-7 overflow-hidden rounded-2xl border bg-card p-10 shadow-lg",
					variant.borderColor,
				)}
			>
				{/* Subtle background accent */}
				<div className={cn("pointer-events-none absolute inset-0 opacity-60", variant.accentBg)} />

				{/* Icon */}
				<div className={cn("relative flex h-20 w-20 items-center justify-center rounded-full", variant.iconBg)}>
					<Icon className={cn("h-10 w-10", variant.iconColor)} strokeWidth={1.5} />
				</div>

				{/* Status badge */}
				<div className={cn("relative flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[0.65rem] font-bold tracking-widest", variant.labelBg, variant.labelColor)}>
					<Sparkles className="h-3 w-3" />
					{variant.label}
				</div>

				{/* Message */}
				<div className="relative flex flex-col items-center gap-2 text-center">
					<h1 className="text-xl font-bold tracking-tight">
						{message || variant.defaultTitle}
					</h1>
					<p className="text-sm text-muted-foreground leading-relaxed">
						{variant.defaultMessage}
					</p>
				</div>

				{/* CTA */}
				<Link href="/dashboard/commercial/campaigns" className="relative w-full">
					<Button className="flex w-full items-center justify-center gap-2" size="lg">
						Ver Campanhas
						<ArrowRight className="h-4 w-4" />
					</Button>
				</Link>
			</div>
		</div>
	);
}
