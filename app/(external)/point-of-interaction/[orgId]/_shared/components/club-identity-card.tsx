"use client";

import { formatCashbackValue, formatToPhone } from "@/lib/formatting";
import { DEFAULT_LOGO_CHIP_COLOR, useLogoEdgeColor } from "@/lib/organizations/logo-color";
import { POI_PRIMARY_GRADIENT } from "@/lib/point-of-interaction/theme";
import { cn } from "@/lib/utils";
import type { TCashbackProgramTerminologyEnum } from "@/schemas/enums";
import { BadgeCheck, Building2, CalendarDays, ShoppingBag } from "lucide-react";
import Image from "next/image";

// "Membro desde" é sempre mês/ano — a data exata da adesão não acrescenta nada ao cliente
// e ocupa espaço que a carteirinha não tem.
const MEMBER_SINCE_FORMATTER = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });

function formatMemberSince(dataAdesao: Date | string | null | undefined): string | null {
	if (!dataAdesao) return null;
	const date = dataAdesao instanceof Date ? dataAdesao : new Date(dataAdesao);
	if (Number.isNaN(date.getTime())) return null;
	return MEMBER_SINCE_FORMATTER.format(date);
}

type ClubIdentityCardProps = {
	org: {
		nome: string;
		logoUrl: string | null;
	};
	// Título do programa de fidelidade (ex.: "Clube Recompra"); cai no nome da org quando ausente.
	programTitle?: string | null;
	client: {
		nome: string;
		telefone: string;
		metadataTotalCompras?: number | null;
	};
	saldoDisponivel: number;
	terminologia: TCashbackProgramTerminologyEnum;
	dataAdesao?: Date | string | null;
	size?: "kiosk" | "mobile";
	className?: string;
};

/**
 * Carteirinha do clube exibida quando o cliente é identificado no ponto de interação.
 * Sem CPF/CNPJ em nenhuma hipótese — o documento não trafega para o POI.
 */
export function ClubIdentityCard({
	org,
	programTitle,
	client,
	saldoDisponivel,
	terminologia,
	dataAdesao,
	size = "kiosk",
	className,
}: ClubIdentityCardProps) {
	const isKiosk = size === "kiosk";
	// O chip da logo herda a cor da borda da própria logo — sem isso, uma logo quadrada com fundo
	// próprio fica com uma moldura branca em volta, colada sobre a carteirinha.
	const logoChipColor = useLogoEdgeColor(org.logoUrl);
	const memberSince = formatMemberSince(dataAdesao);
	const totalPurchases = client.metadataTotalCompras ?? null;
	const clubName = programTitle?.trim() || org.nome;

	return (
		<div
			className={cn(
				"poi-card-enter relative w-full overflow-hidden rounded-3xl bg-brand text-brand-foreground shadow-2xl",
				isKiosk ? "p-7 md:p-8 short:p-5" : "p-5",
				className,
			)}
			// Profundidade da marca: primária → tom profundo derivado. `bg-brand` fica como cor de base,
			// então onde as variáveis do tema não existirem a carteirinha continua chapada e legível.
			style={{ backgroundImage: POI_PRIMARY_GRADIENT }}
		>
			{/* Marca d'água: a logo da org em baixíssima opacidade, saindo pelo canto inferior direito. */}
			{org.logoUrl ? (
				<Image
					src={org.logoUrl}
					alt=""
					aria-hidden
					width={180}
					height={180}
					className={cn(
						"pointer-events-none absolute -bottom-14 -right-12 rounded-full object-cover opacity-[0.12]",
						isKiosk ? "size-52" : "size-44",
					)}
				/>
			) : null}

			<div className="relative flex flex-col">
				{/* Cabeçalho: logo + clube + selo de membro */}
				<div className="flex items-start justify-between gap-3">
					<div className="flex min-w-0 items-center gap-3">
						<div
							className={cn(
								"relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl ring-1 ring-brand-foreground/20",
								isKiosk ? "size-14" : "size-11",
							)}
							style={{ backgroundColor: logoChipColor ?? DEFAULT_LOGO_CHIP_COLOR }}
						>
							{org.logoUrl ? (
								<Image src={org.logoUrl} alt={org.nome} fill sizes="56px" className="object-contain p-1" />
							) : (
								<Building2 className={cn("text-brand", isKiosk ? "size-7" : "size-5")} />
							)}
						</div>
						<div className="min-w-0">
							<p className="truncate text-[0.62rem] font-bold uppercase tracking-[0.16em] text-brand-foreground/70">{clubName}</p>
							<p className={cn("truncate font-black", isKiosk ? "text-lg md:text-xl" : "text-base")}>{org.nome}</p>
						</div>
					</div>
					<span className="poi-card-pop inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-foreground px-2.5 py-1 text-[0.6rem] font-black uppercase tracking-wide text-brand">
						<BadgeCheck className="size-3" strokeWidth={3} />
						Membro ativo
					</span>
				</div>

				{/* Titular */}
				<div className={cn(isKiosk ? "mt-7 short:mt-4" : "mt-6")}>
					<p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-brand-foreground/55">Titular</p>
					<p className={cn("mt-1 truncate font-black uppercase tracking-tight", isKiosk ? "text-2xl md:text-3xl" : "text-xl")}>{client.nome}</p>
					<p className={cn("mt-0.5 font-mono tracking-wider text-brand-foreground/75", isKiosk ? "text-base" : "text-sm")}>
						{formatToPhone(client.telefone)}
					</p>
				</div>

				{/* Saldo disponível */}
				<div className={cn("rounded-2xl bg-brand-foreground/10 px-4", isKiosk ? "mt-6 short:mt-3 py-4 short:py-3" : "mt-5 py-3.5")}>
					<p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-brand-foreground/60">Saldo disponível</p>
					<p className={cn("font-black tracking-tighter", isKiosk ? "text-4xl md:text-5xl short:text-3xl" : "text-3xl")}>
						{formatCashbackValue(saldoDisponivel, terminologia)}
					</p>
				</div>

				{/* Rodapé: total de compras + membro desde */}
				{totalPurchases !== null || memberSince ? (
					<div
						className={cn(
							"flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-brand-foreground/15",
							isKiosk ? "mt-5 short:mt-3 pt-4 short:pt-3" : "mt-4 pt-3.5",
						)}
					>
						{totalPurchases !== null ? (
							<div className="flex items-center gap-2">
								<ShoppingBag className="size-4 shrink-0 text-brand-foreground/70" />
								<div className="flex flex-col leading-tight">
									<span className="text-[0.58rem] font-bold uppercase tracking-[0.14em] text-brand-foreground/55">Total de compras</span>
									<span className="text-sm font-black">
										{totalPurchases} {totalPurchases === 1 ? "compra" : "compras"}
									</span>
								</div>
							</div>
						) : null}
						{memberSince ? (
							<div className="flex items-center gap-2">
								<CalendarDays className="size-4 shrink-0 text-brand-foreground/70" />
								<div className="flex flex-col leading-tight">
									<span className="text-[0.58rem] font-bold uppercase tracking-[0.14em] text-brand-foreground/55">Membro desde</span>
									<span className="text-sm font-black capitalize">{memberSince}</span>
								</div>
							</div>
						) : null}
					</div>
				) : null}
			</div>
		</div>
	);
}
