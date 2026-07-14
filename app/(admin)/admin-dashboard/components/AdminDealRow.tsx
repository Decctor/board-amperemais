"use client";
import type { TGetDealsOutputDefault } from "@/app/api/admin/deals/route";
import ControlDeal from "@/components/Modals/Deals/ControlDeal";
import { Button } from "@/components/ui/button";
import { formatDateAsLocale, formatToMoney } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import { Building2, Calendar, Handshake, Settings2, UserRound } from "lucide-react";
import { useState } from "react";

type TAdminDeal = TGetDealsOutputDefault["deals"][number];

type TStatusPill = {
	label: string;
	className: string;
};

const DEAL_STATUS_PILLS: Record<TAdminDeal["status"], TStatusPill> = {
	PENDENTE: { label: "AGUARDANDO PAGAMENTO", className: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
	ATIVO: { label: "ATIVO", className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
	INADIMPLENTE: { label: "INADIMPLENTE", className: "bg-red-500/15 text-red-600 dark:text-red-400" },
	CANCELADO: { label: "CANCELADO", className: "bg-muted text-foreground/60" },
};

function StatusPill({ pill }: { pill: TStatusPill }) {
	return (
		<span
			className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[0.65rem] font-semibold tracking-tight", pill.className)}
		>
			{pill.label}
		</span>
	);
}

type AdminDealRowProps = {
	deal: TAdminDeal;
	callbacks?: {
		onMutate?: () => void;
		onSettled?: () => void;
		onSuccess?: () => void;
		onError?: () => void;
	};
};

export default function AdminDealRow({ deal, callbacks }: AdminDealRowProps) {
	const [controlModalOpen, setControlModalOpen] = useState(false);

	const statusPill = DEAL_STATUS_PILLS[deal.status];
	const licencasUtilizadas = deal.organizacoes.length;
	const intervaloLabel = deal.intervalo === "ANUAL" ? "ano" : "mês";

	return (
		<div className="bg-card border-border flex w-full flex-col gap-3 rounded-xl border p-3 shadow-2xs transition-shadow hover:shadow-md lg:flex-row lg:items-center lg:justify-between">
			<div className="flex min-w-0 flex-1 items-center gap-3">
				<div className="relative flex h-11 w-11 min-w-11 min-h-11 items-center justify-center overflow-hidden rounded-lg bg-primary/10">
					<Handshake className="h-5 w-5 text-foreground/40" />
				</div>
				<div className="flex min-w-0 flex-col gap-1">
					<div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
						<h3 className="truncate text-sm font-semibold tracking-tight">{deal.nome}</h3>
						<span className="flex items-center gap-1 truncate text-xs text-foreground/60">
							<UserRound className="h-3 w-3 min-w-3 min-h-3" />
							{deal.obtentor?.nome ?? deal.nomeObtentor} ({deal.emailObtentor})
						</span>
					</div>
					<div className="flex flex-wrap items-center gap-1.5">
						<StatusPill pill={statusPill} />
						<StatusPill pill={{ label: deal.planoBase, className: "border border-border bg-input/30 text-foreground/70" }} />
						<StatusPill
							pill={{
								label: `${formatToMoney(deal.valorUnitarioCentavos / 100)} × ${deal.quantidadeLicencas} /${intervaloLabel}`,
								className: "border border-border bg-input/30 text-foreground/70",
							}}
						/>
						<span className="flex items-center gap-1 text-xs text-foreground/60">
							<Building2 className="h-3.5 w-3.5 min-w-3.5 min-h-3.5" />
							{licencasUtilizadas}/{deal.quantidadeLicencas} licenças
						</span>
						<span className="flex items-center gap-1 text-xs text-foreground/60">
							<Calendar className="h-3.5 w-3.5 min-w-3.5 min-h-3.5" />
							{formatDateAsLocale(deal.dataInsercao)}
						</span>
					</div>
				</div>
			</div>
			<div className="flex items-center justify-end gap-2">
				<Button variant="outline" size="sm" onClick={() => setControlModalOpen(true)}>
					<Settings2 className="h-4 w-4 min-w-4 min-h-4" />
					GERENCIAR
				</Button>
			</div>
			{controlModalOpen ? <ControlDeal dealId={deal.id} closeModal={() => setControlModalOpen(false)} callbacks={callbacks} /> : null}
		</div>
	);
}
