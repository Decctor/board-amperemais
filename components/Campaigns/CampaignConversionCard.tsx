import type { TGetCampaignConversionsOutputItems } from "@/app/api/campaigns/conversions/route";
import { formatDateAsLocale, formatDecimalPlaces, formatToMoney } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import { Calendar, Clock, RefreshCw, TrendingDown, TrendingUp, UserPlus, UserRound } from "lucide-react";
import Link from "next/link";

export const CONVERSION_TYPE_CONFIG: Record<string, { label: string; bgClass: string; textClass: string }> = {
	AQUISICAO: { label: "Aquisição", bgClass: "bg-green-500", textClass: "text-green-600 dark:text-green-400" },
	REATIVACAO: { label: "Reativação", bgClass: "bg-blue-500", textClass: "text-blue-600 dark:text-blue-400" },
	ACELERACAO: { label: "Aceleração", bgClass: "bg-yellow-500", textClass: "text-yellow-600 dark:text-yellow-400" },
	REGULAR: { label: "Regular", bgClass: "bg-gray-400", textClass: "text-gray-600 dark:text-gray-400" },
	ATRASADA: { label: "Atrasada", bgClass: "bg-red-500", textClass: "text-red-600 dark:text-red-400" },
};

export type TCampaignConversionCardProps = {
	conversion: TGetCampaignConversionsOutputItems[number];
	/** Mostra nome da campanha e link para a página de resultados (visão consolidada por organização). */
	showCampaignLink?: boolean;
};

export function CampaignConversionCard({ conversion, showCampaignLink = false }: TCampaignConversionCardProps) {
	const config = CONVERSION_TYPE_CONFIG[conversion.tipoConversao ?? ""] ?? {
		label: conversion.tipoConversao ?? "Desconhecido",
		bgClass: "bg-gray-400",
		textClass: "text-gray-600",
	};

	const tempoHoras = conversion.tempoParaConversaoMinutos ? Math.round((conversion.tempoParaConversaoMinutos / 60) * 10) / 10 : null;
	const tipo = conversion.tipoConversao;

	const freqImpact = (() => {
		if (tipo === "AQUISICAO") {
			return { text: "Novo cliente conquistado pela campanha", Icon: UserPlus, positive: true };
		}
		if (tipo === "REATIVACAO" && conversion.diasDesdeUltimaCompra != null) {
			return { text: `Reativou após ${conversion.diasDesdeUltimaCompra} dias sem comprar`, Icon: RefreshCw, positive: true };
		}
		if (conversion.deltaFrequencia == null || conversion.deltaFrequencia === 0) return null;
		if (conversion.deltaFrequencia > 0) {
			return { text: `Voltou ${conversion.deltaFrequencia} dias antes do previsto`, Icon: TrendingUp, positive: true };
		}
		return { text: `Voltou ${Math.abs(conversion.deltaFrequencia)} dias depois do previsto`, Icon: Clock, positive: false };
	})();

	const ticketImpact = (() => {
		const abs = conversion.deltaMonetarioAbsoluto;
		if (abs == null || Math.abs(abs) < 0.5) return null;
		const pct = conversion.deltaMonetarioPercentual;
		const pctStr = pct != null ? ` (${pct > 0 ? "+" : ""}${formatDecimalPlaces(pct)}%)` : "";
		if (abs > 0) {
			return { text: `Gastou ${formatToMoney(abs)} a mais que o habitual${pctStr}`, Icon: TrendingUp, positive: true };
		}
		return { text: `Gastou ${formatToMoney(Math.abs(abs))} a menos que o habitual${pctStr}`, Icon: TrendingDown, positive: false };
	})();

	const hasImpact = freqImpact != null || ticketImpact != null;
	const campaign = conversion.campanha;

	return (
		<div className="bg-card border-primary/20 flex w-full flex-col gap-2 rounded-xl border px-3 py-3 shadow-2xs">
			{showCampaignLink && campaign?.id && campaign?.titulo ? (
				<div className="flex items-center gap-2 border-b border-border pb-1.5">
					<span className="text-[0.6rem] font-medium uppercase text-muted-foreground shrink-0">Campanha</span>
					<Link
						href={`/dashboard/commercial/campaigns/id/${campaign.id}`}
						className="text-[0.7rem] font-semibold text-primary hover:underline truncate min-w-0"
					>
						{campaign.titulo}
					</Link>
				</div>
			) : null}

			<div className="w-full flex items-start justify-between gap-2 flex-wrap">
				<div className="flex items-center gap-2 flex-wrap">
					<div className={cn("flex items-center gap-1 rounded-md px-2 py-0.5 text-white text-[0.65rem] font-bold uppercase", config.bgClass)}>
						{config.label}
					</div>
					<div className="flex items-center gap-1.5 bg-secondary rounded-lg px-2 py-1">
						<UserRound className="w-3.5 h-3.5 min-w-3.5 min-h-3.5 text-muted-foreground" />
						<span className="text-[0.65rem] font-medium tracking-tight uppercase">{conversion.cliente?.nome ?? "—"}</span>
					</div>
				</div>
				<div className="flex items-center gap-2 flex-wrap justify-end shrink-0">
					{conversion.dataConversao && (
						<span className="flex items-center gap-1 text-[0.65rem] text-muted-foreground">
							<Calendar className="w-3 h-3 min-w-3 min-h-3" />
							{formatDateAsLocale(conversion.dataConversao)}
						</span>
					)}
					{tempoHoras !== null && (
						<span className="flex items-center gap-1 text-[0.65rem] text-muted-foreground">
							<Clock className="w-3 h-3 min-w-3 min-h-3" />
							{tempoHoras}h após envio
						</span>
					)}
				</div>
			</div>

			<div className="flex items-end gap-4 flex-wrap">
				<div className="flex flex-col gap-0.5">
					<span className="text-[0.6rem] uppercase text-muted-foreground font-medium">Valor da Venda</span>
					<span className="text-sm font-bold">{formatToMoney(conversion.vendaValor ?? 0)}</span>
				</div>
				<div className="w-px h-7 bg-border self-center" />
				<div className="flex flex-col gap-0.5">
					<span className="text-[0.6rem] uppercase text-muted-foreground font-medium">Receita Atribuída</span>
					<span className="text-sm font-bold">{formatToMoney(conversion.atribuicaoReceita ?? 0)}</span>
				</div>
			</div>

			{hasImpact && (
				<div className="flex flex-col gap-1 pt-1.5 border-t border-border">
					{freqImpact && (
						<span
							className={cn(
								"flex items-center gap-1.5 text-[0.7rem] font-semibold",
								freqImpact.positive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400",
							)}
						>
							<freqImpact.Icon className="w-3.5 h-3.5 min-w-3.5 min-h-3.5 shrink-0" />
							{freqImpact.text}
						</span>
					)}
					{ticketImpact && (
						<span
							className={cn(
								"flex items-center gap-1.5 text-[0.7rem] font-semibold",
								ticketImpact.positive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400",
							)}
						>
							<ticketImpact.Icon className="w-3.5 h-3.5 min-w-3.5 min-h-3.5 shrink-0" />
							{ticketImpact.text}
						</span>
					)}
				</div>
			)}
		</div>
	);
}
