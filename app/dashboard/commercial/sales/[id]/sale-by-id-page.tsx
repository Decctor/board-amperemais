"use client";

import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import { CancelConfirmedSaleDialog } from "@/components/Modals/Sales/CancelConfirmedSaleDialog";
import { LoadingButton } from "@/components/loading-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getAgeFromBirthdayDate } from "@/lib/dates";
import { getErrorMessage } from "@/lib/errors";
import { formatDateAsLocale, formatDateBirthdayAsLocale, formatNameAsInitials, formatToMoney, formatToPhone } from "@/lib/formatting";
import { useSalesById } from "@/lib/queries/sales";
import { cn } from "@/lib/utils";
import type { TGetSalesOutputById } from "@/app/api/sales/route";
import {
	AlertTriangle,
	ArrowLeft,
	ArrowRight,
	BadgeDollarSign,
	BadgePercent,
	Calendar,
	CircleUser,
	CircleX,
	Clock,
	Code,
	Diamond,
	Grid3X3,
	Mail,
	MapPin,
	Megaphone,
	Package,
	PencilLine,
	Phone,
	Receipt,
	ShoppingCart,
	Tag,
	Ticket,
	Trash,
	TrendingDown,
	TrendingUp,
	Truck,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteSale } from "@/lib/mutations/sales";
import { useRouter } from "next/navigation";

type SaleByIdPageProps = {
	saleId: string;
	orgHasERPAccess: boolean;
	userCanDeleteSales: boolean;
	userCanEditSales: boolean;
	userFiscalPermissions: {
		view: boolean;
		configure: boolean;
		emit: boolean;
		cancel: boolean;
	};
};

// Helper function to format time to conversion
function formatTimeToConversion(minutes: number): string {
	if (minutes < 60) return `${minutes}min`;
	if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
	return `${Math.round(minutes / 1440)}d`;
}

function formatCouponSource(source: TGetSalesOutputById["resgatesCupom"][number]["origemResgate"]) {
	if (source === "POS") return "POS";
	if (source === "LOJA_DIGITAL") return "Loja digital";
	if (source === "PONTO_INTERACAO") return "Ponto de interação";
	return source;
}

function formatCouponValidationMode(snapshot: TGetSalesOutputById["resgatesCupom"][number]["beneficioSnapshot"]) {
	if (!snapshot || typeof snapshot !== "object" || !("validacaoModo" in snapshot)) return null;
	const mode = snapshot.validacaoModo;
	if (mode === "AUTOMATICA") return "Validação automática";
	if (mode === "MANUAL") return "Validação manual";
	return typeof mode === "string" ? mode : null;
}

export default function SaleByIdPage({ saleId, userCanDeleteSales, userCanEditSales }: SaleByIdPageProps) {
	const { data: sale, isLoading, isError, error, isSuccess } = useSalesById({ id: saleId });

	if (isLoading) return <LoadingComponent />;
	if (isError) return <ErrorComponent msg={getErrorMessage(error)} />;
	if (!isSuccess || !sale) return <ErrorComponent msg="Venda não encontrada." />;

	return (
		<div className="w-full h-full flex flex-col gap-4">
			{/* Page Header */}
			<div className="flex items-center justify-between">
				<div className="w-full flex items-center gap-3">
					<Button variant="ghost" size="fit" asChild className="rounded-full hover:bg-brand/10 flex items-center gap-1 px-2 py-2">
						<Link href={"/dashboard/commercial/sales"} className="flex items-center gap-1">
							<ArrowLeft className="w-5 h-5" />
							VOLTAR
						</Link>
					</Button>

					<h1 className="text-lg font-bold tracking-tight">VENDA - {formatDateAsLocale(sale.dataVenda, true)}</h1>
				</div>
				<div className="flex items-center gap-1.5 shrink-0">
					<SaleEditButton sale={sale} userCanEditSales={userCanEditSales} />
					<SaleCancelButton sale={sale} userCanDeleteSales={userCanDeleteSales} />
					<SaleDeleteButton sale={sale} userCanDeleteSales={userCanDeleteSales} />
				</div>
			</div>

			{/* Sale Overview Section */}
			<div className="w-full flex flex-col lg:flex-row gap-4 lg:items-stretch">
				<div className="w-full lg:w-1/2 flex">
					<SaleOverviewSection sale={sale} />
				</div>
				<div className="w-full lg:w-1/2 flex">
					<ClientSection client={sale.cliente} />
				</div>
			</div>
			<div className="w-full flex flex-col lg:flex-row gap-4 lg:items-stretch">
				<div className="w-full lg:w-1/2 flex">
					<CampaignAttributionSection attribution={sale.atribuicaoCampanhaConversao} saleDate={sale.dataVenda} />
				</div>
				<div className="w-full lg:w-1/2 flex">
					<SaleBenefitsSection cashbackTransactions={sale.transacoesCashback} couponRedemptions={sale.resgatesCupom} />
				</div>
			</div>
			{/* Sale Items Section */}
			<SaleItemsSection items={sale.itens} />
		</div>
	);
}

function SaleOverviewSection({ sale }: { sale: TGetSalesOutputById }) {
	const sellerName = sale.vendedor?.nome ?? "Não atribuído";
	const partnerName = sale.parceiro?.nome ?? "Não atribuído";
	const activeCouponRedemptions = sale.resgatesCupom.filter((redemption) => redemption.status === "UTILIZADO");
	const totalCouponDiscount = activeCouponRedemptions.reduce((sum, redemption) => sum + redemption.valorDesconto, 0);
	return (
		<SectionWrapper title="VISÃO GERAL DA VENDA" icon={<Receipt className="w-4 h-4 min-w-4 min-h-4" />}>
			<div className="w-full flex flex-col gap-2">
				<h1 className="text-xs leading-none tracking-tight">INFORMAÇÕES GERAIS</h1>
				<div className="w-full flex flex-col gap-1.5">
					<div className="w-full flex items-center gap-1.5">
						<Code className="w-4 h-4" />
						<h3 className="text-sm font-semibold tracking-tighter text-foreground/80">IDENTIFICADOR EXTERNO</h3>
						<h3 className="text-sm font-semibold tracking-tight">{sale.idExterno}</h3>
					</div>
					<div className="w-full flex items-center gap-1.5">
						<BadgeDollarSign className="w-4 h-4" />
						<h3 className="text-sm font-semibold tracking-tighter text-foreground/80">VALOR</h3>
						<h3 className="text-sm font-semibold tracking-tight">{formatToMoney(sale.valorTotal)}</h3>
					</div>
					{activeCouponRedemptions.length > 0 ? (
						<div className="w-fit max-w-full flex items-center gap-1.5 rounded-full border border-brand/35 bg-brand/15 px-2.5 py-1 text-xs font-bold text-foreground">
							<Ticket className="w-3.5 h-3.5 text-brand" />
							<span className="truncate">
								{activeCouponRedemptions.length === 1 ? `CUPOM ${activeCouponRedemptions[0].cupomCodigo}` : `${activeCouponRedemptions.length} CUPONS`}
							</span>
							<span className="tabular-nums">-{formatToMoney(totalCouponDiscount)}</span>
						</div>
					) : null}

					<div className="w-full flex items-center gap-1.5">
						<Calendar className="w-4 h-4" />
						<h3 className="text-sm font-semibold tracking-tighter text-foreground/80">DATA DA VENDA</h3>
						<h3 className="text-sm font-semibold tracking-tight">{formatDateAsLocale(sale.dataVenda, true) || "DATA DA VENDA NÃO DEFINIDA"}</h3>
					</div>
					<div className="w-full flex items-center gap-1.5">
						<Calendar className="w-4 h-4" />
						<h3 className="text-sm font-semibold tracking-tighter text-foreground/80">CANAL</h3>
						<h3 className="text-sm font-semibold tracking-tight">{sale.canal || "CANAL NÃO DEFINIDO"}</h3>
					</div>
					<div className="w-full flex items-center gap-1.5">
						<Truck className="w-4 h-4" />
						<h3 className="text-sm font-semibold tracking-tighter text-foreground/80">MODALIDADE</h3>
						<h3 className="text-sm font-semibold tracking-tight">{sale.entregaModalidade || "MODALIDADE NÃO DEFINIDA"}</h3>
					</div>
					<div className="flex items-center gap-1.5">
						<Tag className="w-4 h-4 text-muted-foreground" />
						<h3 className="text-sm font-semibold tracking-tighter text-foreground/80">NATUREZA</h3>
						<h3 className="text-sm font-semibold tracking-tight">{sale.natureza}</h3>
					</div>
				</div>
			</div>
			<div className="w-full flex flex-col gap-2">
				<h1 className="text-xs leading-none tracking-tight">PARTICIPANTES</h1>
				<div className="w-full flex flex-col gap-1.5">
					<div className="w-full flex items-center gap-1.5">
						<Avatar className="w-5 h-5 min-w-5 min-h-5">
							<AvatarImage src={sale.vendedor?.avatarUrl ?? undefined} alt={sellerName} />
							<AvatarFallback className="text-xs uppercase">{formatNameAsInitials(sellerName)}</AvatarFallback>
						</Avatar>
						<h3 className="text-sm font-semibold tracking-tighter text-foreground/80">VENDEDOR</h3>
						<h3 className="text-sm font-semibold tracking-tight">{sellerName}</h3>
					</div>
					<div className="w-full flex items-center gap-1.5">
						<Avatar className="w-5 h-5 min-w-5 min-h-5">
							<AvatarImage src={sale.parceiro?.avatarUrl ?? undefined} alt={partnerName} />
							<AvatarFallback className="text-xs uppercase">{formatNameAsInitials(partnerName)}</AvatarFallback>
						</Avatar>
						<h3 className="text-sm font-semibold tracking-tighter text-foreground/80">PARCEIRO</h3>
						<h3 className="text-sm font-semibold tracking-tight">{partnerName}</h3>
					</div>
				</div>
			</div>
		</SectionWrapper>
	);
}

function ClientSection({ client }: { client: TGetSalesOutputById["cliente"] }) {
	if (!client)
		return (
			<SectionWrapper title="CLIENTE" icon={<CircleUser className="w-4 h-4 min-w-4 min-h-4" />}>
				<div className="w-full flex flex-col items-center justify-center gap-3">
					<span className="text-sm font-medium text-muted-foreground">CLIENTE NÃO ATRIBUÍDO</span>
				</div>
			</SectionWrapper>
		);
	return (
		<SectionWrapper
			title="CLIENTE"
			icon={<CircleUser className="w-4 h-4 min-w-4 min-h-4" />}
			actions={
				<Button variant="ghost" size="xs" asChild>
					<Link href={`/dashboard/commercial/clients?id=${client.id}`}>
						VER PERFIL
						<ArrowRight className="w-3 h-3 ml-1" />
					</Link>
				</Button>
			}
		>
			<div className="w-full flex flex-col gap-3">
				{/* Name */}
				<div className="flex items-center gap-1.5">
					<CircleUser className="w-4 h-4 text-muted-foreground" />
					<h3 className="text-sm font-semibold tracking-tighter text-foreground/80">NOME</h3>
					<h3 className="text-sm font-semibold tracking-tight">{client.nome}</h3>
				</div>

				{/* Phone */}
				{client.telefone && (
					<div className="flex items-center gap-1.5">
						<Phone className="w-4 h-4 text-muted-foreground" />
						<h3 className="text-sm font-semibold tracking-tighter text-foreground/80">TELEFONE</h3>
						<h3 className="text-sm font-semibold tracking-tight">{formatToPhone(client.telefone)}</h3>
					</div>
				)}

				{/* Email */}
				{client.email && (
					<div className="flex items-center gap-1.5">
						<Mail className="w-4 h-4 text-muted-foreground" />
						<h3 className="text-sm font-semibold tracking-tighter text-foreground/80">EMAIL</h3>
						<h3 className="text-sm font-semibold tracking-tight">{client.email}</h3>
					</div>
				)}

				{/* Birth Date */}
				<div className="flex items-center gap-1.5">
					<Calendar className="w-4 h-4 text-muted-foreground" />
					<h3 className="text-sm font-semibold tracking-tighter text-foreground/80">IDADE</h3>
					<h3 className="text-sm font-semibold tracking-tight">
						{client.dataNascimento
							? `${getAgeFromBirthdayDate(client.dataNascimento)} ANOS (NASCIDO EM: ${formatDateBirthdayAsLocale(client.dataNascimento, true)})`
							: "NÃO DEFINIDO"}
					</h3>
				</div>
				<div className="flex items-center gap-1.5">
					<Grid3X3 className="w-4 h-4 text-muted-foreground" />
					<h3 className="text-sm font-semibold tracking-tighter text-foreground/80">SEGMENTAÇÃO RFM</h3>
					<Badge variant="secondary" className="text-xs">
						{client.analiseRFMTitulo}
					</Badge>
					{(client.analiseRFMNotasRecencia || client.analiseRFMNotasFrequencia || client.analiseRFMNotasMonetario) && (
						<div className="flex items-center gap-3 text-xs text-muted-foreground">
							{client.analiseRFMNotasRecencia !== null && (
								<span>
									R: <strong>{client.analiseRFMNotasRecencia}</strong>
								</span>
							)}
							{client.analiseRFMNotasFrequencia !== null && (
								<span>
									F: <strong>{client.analiseRFMNotasFrequencia}</strong>
								</span>
							)}
							{client.analiseRFMNotasMonetario !== null && (
								<span>
									M: <strong>{client.analiseRFMNotasMonetario}</strong>
								</span>
							)}
						</div>
					)}
				</div>

				{/* Location */}
				<div className="flex items-center gap-1.5">
					<MapPin className="w-4 h-4 text-muted-foreground" />
					<h3 className="text-sm font-semibold tracking-tighter text-foreground/80">LOCALIZAÇÃO</h3>
					<h3 className="text-sm font-semibold tracking-tight">
						{[client.localizacaoCidade, client.localizacaoEstado].filter(Boolean).join(", ") || "NÃO DEFINIDO"}
					</h3>
				</div>
				<div className="flex items-center gap-1.5">
					<BadgeDollarSign className="w-4 h-4 text-muted-foreground" />
					<h3 className="text-sm font-semibold tracking-tighter text-foreground/80">VALOR TOTAL COMPRO</h3>
					<h3 className="text-sm font-semibold tracking-tight">{formatToMoney(client.metadataValorTotalCompras || 0)}</h3>
				</div>
				<div className="flex items-center gap-1.5">
					<ShoppingCart className="w-4 h-4 text-muted-foreground" />
					<h3 className="text-sm font-semibold tracking-tighter text-foreground/80">TOTAL DE COMPRAS</h3>
					<h3 className="text-sm font-semibold tracking-tight">{client.metadataTotalCompras || 0}</h3>
				</div>
			</div>
		</SectionWrapper>
	);
}

function CampaignAttributionSection({
	saleDate,
	attribution,
}: {
	saleDate: TGetSalesOutputById["dataVenda"];
	attribution: TGetSalesOutputById["atribuicaoCampanhaConversao"];
}) {
	if (!attribution)
		return (
			<SectionWrapper title="ATRIBUIÇÃO DE CAMPANHA" icon={<Megaphone className="w-4 h-4 min-w-4 min-h-4 text-violet-600 dark:text-violet-400" />}>
				<div className="w-full flex flex-col items-center justify-center gap-3">
					<span className="text-sm font-medium text-muted-foreground">CAMPANHA NÃO ATRIBUÍDA</span>
				</div>
			</SectionWrapper>
		);
	return (
		<SectionWrapper title="ATRIBUIÇÃO DE CAMPANHA" icon={<Megaphone className="w-4 h-4 min-w-4 min-h-4 text-violet-600 dark:text-violet-400" />}>
			<div className="w-full flex flex-col gap-4">
				{/* Timeline */}
				<div className="flex items-center gap-3">
					<div className="flex flex-col items-center gap-1">
						<div className="w-2 h-2 rounded-full bg-blue-500" />
						<div className="w-px h-8 bg-linear-to-b from-blue-500 to-green-500" />
						<div className="w-2 h-2 rounded-full bg-green-500" />
					</div>
					<div className="flex flex-col gap-4 flex-1">
						<div className="flex flex-col">
							<span className="text-[0.65rem] text-muted-foreground uppercase">Interação Enviada</span>
							<span className="text-sm font-medium">{formatDateAsLocale(attribution.dataInteracao, true)}</span>
						</div>
						<div className="flex flex-col">
							<span className="text-[0.65rem] text-muted-foreground uppercase">Converteu em</span>
							<span className="text-sm font-medium">{formatDateAsLocale(saleDate, true)}</span>
						</div>
					</div>
				</div>

				{/* Stats Grid */}
				<div className="grid grid-cols-2 gap-2">
					{/* Time to Conversion */}
					<div className="flex flex-col items-center p-3 bg-secondary/50 rounded-lg">
						<span className="text-[0.65rem] text-muted-foreground uppercase">Tempo para Conversão</span>
						<span className="text-sm font-bold">{formatTimeToConversion(attribution.tempoParaConversaoMinutos)}</span>
					</div>

					{/* Conversion Type */}
					{attribution.tipoConversao && (
						<div className="flex flex-col items-center p-3 bg-secondary/50 rounded-lg">
							<span className="text-[0.65rem] text-muted-foreground uppercase">Tipo</span>
							<span className="text-sm font-bold">{attribution.tipoConversao}</span>
						</div>
					)}

					{/* Delta Frequency */}
					{attribution.deltaFrequencia !== null && attribution.deltaFrequencia !== undefined && (
						<div className="flex flex-col items-center p-3 bg-blue-500/10 rounded-lg">
							<span className="text-[0.65rem] text-muted-foreground uppercase">Delta Frequência</span>
							<span className="text-sm font-bold text-blue-600 dark:text-blue-400">
								{attribution.deltaFrequencia > 0 ? "+" : ""}
								{attribution.deltaFrequencia}
							</span>
						</div>
					)}

					{/* Delta Monetary */}
					{attribution.deltaMonetarioAbsoluto !== null && attribution.deltaMonetarioAbsoluto !== undefined && (
						<div className="flex flex-col items-center p-3 bg-green-500/10 rounded-lg">
							<span className="text-[0.65rem] text-muted-foreground uppercase">Delta Monetário</span>
							<span className="text-sm font-bold text-green-600 dark:text-green-400">{formatToMoney(attribution.deltaMonetarioAbsoluto)}</span>
						</div>
					)}
				</div>

				{/* Days Since Last Purchase */}
				{attribution.diasDesdeUltimaCompra !== null && attribution.diasDesdeUltimaCompra !== undefined && (
					<div className="flex items-center gap-1.5 text-sm text-muted-foreground">
						<Clock className="w-4 h-4" />
						<span>{attribution.diasDesdeUltimaCompra} dias desde a última compra</span>
					</div>
				)}
			</div>
		</SectionWrapper>
	);
}

function SaleBenefitsSection({
	cashbackTransactions,
	couponRedemptions,
}: {
	cashbackTransactions: TGetSalesOutputById["transacoesCashback"];
	couponRedemptions: TGetSalesOutputById["resgatesCupom"];
}) {
	const activeCouponRedemptions = couponRedemptions.filter((redemption) => redemption.status === "UTILIZADO");
	const totalCouponDiscount = activeCouponRedemptions.reduce((sum, redemption) => sum + redemption.valorDesconto, 0);
	const activeCouponCodes = activeCouponRedemptions.map((redemption) => redemption.cupomCodigo).join(", ");
	const hasBenefits = couponRedemptions.length > 0 || cashbackTransactions.length > 0;

	return (
		<SectionWrapper title="BENEFÍCIOS DA VENDA" icon={<BadgePercent className="w-4 h-4 min-w-4 min-h-4 text-brand" />}>
			{!hasBenefits ? (
				<div className="w-full flex flex-col items-center justify-center gap-1 rounded-lg bg-secondary/30 px-3 py-6 text-center">
					<span className="text-sm font-semibold text-muted-foreground">NENHUM BENEFÍCIO APLICADO NESTA VENDA</span>
					<span className="text-xs text-muted-foreground">Cupons e movimentações de cashback aparecerão aqui quando existirem.</span>
				</div>
			) : (
				<div className="w-full grid grid-cols-1 xl:grid-cols-2 gap-3">
					<div className="flex min-w-0 flex-col gap-2 rounded-lg bg-secondary/30 p-3">
						<div className="flex items-center justify-between gap-3">
							<div className="flex items-center gap-1.5">
								<Ticket className="w-4 h-4 text-brand" />
								<span className="text-xs font-bold uppercase tracking-tight">Cupons</span>
							</div>
							{activeCouponRedemptions.length > 0 ? <span className="text-xs font-bold tabular-nums">-{formatToMoney(totalCouponDiscount)}</span> : null}
						</div>
						{couponRedemptions.length === 0 ? (
							<p className="text-xs text-muted-foreground">Nenhum cupom usado nesta venda.</p>
						) : (
							<div className="flex flex-col gap-2">
								{couponRedemptions.map((redemption) => (
									<CouponRedemptionBenefitCard key={redemption.id} redemption={redemption} />
								))}
							</div>
						)}
					</div>
					<div className="flex min-w-0 flex-col gap-2 rounded-lg bg-secondary/30 p-3">
						<div className="flex items-center justify-between gap-3">
							<div className="flex items-center gap-1.5">
								<BadgePercent className="w-4 h-4 text-primary" />
								<span className="text-xs font-bold uppercase tracking-tight">Cashback</span>
							</div>
							{cashbackTransactions.length > 0 ? (
								<span className="text-xs font-semibold text-muted-foreground">
									{cashbackTransactions.length === 1 ? "1 movimentação" : `${cashbackTransactions.length} movimentações`}
								</span>
							) : null}
						</div>
						{cashbackTransactions.length === 0 ? (
							<p className="text-xs text-muted-foreground">Nenhuma movimentação de cashback encontrada.</p>
						) : (
							<div className="flex flex-col gap-2">
								{cashbackTransactions.map((transaction, index) => (
									<CashbackTransactionBenefitCard key={index.toString()} transaction={transaction} />
								))}
							</div>
						)}
					</div>
				</div>
			)}
		</SectionWrapper>
	);
}

function CouponRedemptionBenefitCard({ redemption }: { redemption: TGetSalesOutputById["resgatesCupom"][number] }) {
	const validationMode = formatCouponValidationMode(redemption.beneficioSnapshot);
	const isCanceled = redemption.status === "CANCELADO";

	return (
		<div className={cn("rounded-lg border border-border bg-card px-3 py-2", isCanceled && "opacity-70")}>
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0 flex flex-col gap-0.5">
					<div className="flex min-w-0 items-center gap-1.5">
						<span className="truncate text-xs font-bold uppercase">{redemption.cupomCodigo}</span>
						<Badge
							variant="outline"
							className={cn("h-5 rounded-full px-2 text-[0.6rem]", isCanceled ? "text-muted-foreground" : "border-brand/35 bg-brand/15")}
						>
							{isCanceled ? "CANCELADO" : "UTILIZADO"}
						</Badge>
					</div>
					<span className="line-clamp-1 text-xs text-muted-foreground">{redemption.cupomTitulo}</span>
				</div>
				<span className={cn("shrink-0 text-sm font-bold tabular-nums", isCanceled ? "text-muted-foreground line-through" : "text-foreground")}>
					-{formatToMoney(redemption.valorDesconto)}
				</span>
			</div>
			<div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border/40 pt-2 text-[0.65rem] text-muted-foreground">
				<span className="flex items-center gap-1">
					<Calendar className="w-3 h-3" />
					{formatDateAsLocale(redemption.dataInsercao)}
				</span>
				<span>{formatCouponSource(redemption.origemResgate)}</span>
				{validationMode ? <span>{validationMode}</span> : null}
			</div>
		</div>
	);
}

function CashbackTransactionBenefitCard({ transaction }: { transaction: TGetSalesOutputById["transacoesCashback"][number] }) {
	const isAccumulation = transaction.tipo === "ACÚMULO";

	return (
		<div className="rounded-lg border border-border bg-card px-3 py-2">
			<div className="flex items-center justify-between gap-3">
				<div
					className={cn(
						"flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase",
						isAccumulation ? "bg-primary/10 text-primary" : "bg-brand/15 text-foreground",
					)}
				>
					{isAccumulation ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3 text-brand" />}
					{transaction.tipo}
				</div>
				<span className={cn("text-sm font-bold tabular-nums", isAccumulation ? "text-primary" : "text-foreground")}>
					{isAccumulation ? "+" : "-"}
					{formatToMoney(Math.abs(transaction.valor))}
				</span>
			</div>
			<div className="mt-2 flex items-center gap-2 text-[0.65rem] text-muted-foreground">
				<span>{formatToMoney(transaction.saldoValorAnterior)}</span>
				<ArrowRight className="w-3 h-3" />
				<span className="font-medium text-foreground">{formatToMoney(transaction.saldoValorPosterior)}</span>
			</div>
			<div className="mt-2 flex items-center justify-between gap-3 border-t border-border/40 pt-2 text-[0.6rem] text-muted-foreground">
				<div className="flex items-center gap-1">
					<Calendar className="w-3 h-3" />
					{formatDateAsLocale(transaction.dataInsercao)}
				</div>
				{transaction.expiracaoData ? (
					<div className="flex items-center gap-1 text-foreground">
						<Clock className="w-3 h-3 text-brand" />
						Expira: {formatDateAsLocale(transaction.expiracaoData)}
					</div>
				) : null}
			</div>
		</div>
	);
}

function SaleItemsSection({ items }: { items: TGetSalesOutputById["itens"] }) {
	return (
		<SectionWrapper title={`ITENS (${items.length})`} icon={<Package className="w-4 h-4 min-w-4 min-h-4" />}>
			<div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
				{items.map((item) => (
					<SaleItemCard key={item.id} item={item} />
				))}
			</div>
		</SectionWrapper>
	);
}

function SaleItemCard({ item }: { item: TGetSalesOutputById["itens"][number] }) {
	const imageUrl = item.produtoVariante?.imagemCapaUrl || item.produto?.imagemCapaUrl;

	return (
		<div className="bg-secondary/30 rounded-lg overflow-hidden flex flex-col">
			{/* Image */}
			<div className="w-full h-32 bg-secondary/50 flex items-center justify-center">
				{imageUrl ? (
					<img src={imageUrl} alt={item.produto?.nome || "Produto"} className="w-full h-full object-cover" />
				) : (
					<Package className="w-12 h-12 text-muted-foreground/50" />
				)}
			</div>

			{/* Content */}
			<div className="p-3 flex flex-col gap-2">
				{/* Product Info */}
				<div className="flex flex-col gap-0.5">
					<h3 className="text-sm font-bold tracking-tight line-clamp-2">{item.produto?.nome || "Produto"}</h3>
					<div className="flex items-center flex-wrap gap-1.5">
						{item.produto.unidade ? (
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger asChild>
										<div className="flex items-center gap-1.5 px-1 py-0.5">
											<Package className="w-4 h-4 text-muted-foreground" />
											<h3 className="text-xs tracking-tighter">{item.produto.unidade}</h3>
										</div>
									</TooltipTrigger>
									<TooltipContent>
										<p>Unidade de medida</p>
									</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						) : null}
						{item.produto?.codigo ? (
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger asChild>
										<div className="flex items-center gap-1.5 px-1 py-0.5">
											<Code className="w-4 h-4 text-muted-foreground" />
											<h3 className="text-xs tracking-tighter">{item.produto.codigo}</h3>
										</div>
									</TooltipTrigger>
									<TooltipContent>
										<p>Código do produto</p>
									</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						) : null}
						{item.produto?.grupo ? (
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger asChild>
										<div className="flex items-center gap-1.5 px-1 py-0.5">
											<Diamond className="w-4 h-4 text-muted-foreground" />
											<h3 className="text-xs tracking-tighter">{item.produto.grupo}</h3>
										</div>
									</TooltipTrigger>
									<TooltipContent>
										<p>Grupo do produto</p>
									</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						) : null}
						{item.produtoVariante?.nome ? (
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger asChild>
										<div className="flex items-center gap-1.5 px-1 py-0.5">
											<Package className="w-4 h-4 text-muted-foreground" />
											<h3 className="text-xs tracking-tighter">{item.produtoVariante.nome}</h3>
										</div>
									</TooltipTrigger>
									<TooltipContent>
										<p>Variante do produto</p>
									</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						) : null}
					</div>
				</div>

				{/* Pricing */}
				<div className="flex flex-col gap-1 pt-2 border-t border-border/30">
					<div className="flex items-center justify-between text-xs">
						<span className="text-muted-foreground">QUANTIDADE:</span>
						<span className="font-medium">{item.quantidade}</span>
					</div>
					<div className="flex items-center justify-between text-xs">
						<span className="text-muted-foreground">UNITÁRIO:</span>
						<span className="font-medium">{formatToMoney(item.valorVendaUnitario)}</span>
					</div>
					{item.valorTotalDesconto > 0 && (
						<div className="flex items-center justify-between text-xs">
							<span className="text-muted-foreground">DESCONTO:</span>
							<span className="font-medium text-red-500">-{formatToMoney(item.valorTotalDesconto)}</span>
						</div>
					)}
					<div className="flex items-center justify-between text-sm font-bold pt-1">
						<span>TOTAL:</span>
						<span className="text-foreground">{formatToMoney(item.valorVendaTotalLiquido)}</span>
					</div>
				</div>

				{/* Adicionais */}
				{item.adicionais && item.adicionais.length > 0 && (
					<div className="flex flex-col gap-1 pt-2 border-t border-border/30">
						<span className="text-[0.65rem] font-semibold text-muted-foreground uppercase">ADICIONAIS</span>
						{item.adicionais.map((adicional) => (
							<div key={adicional.id} className="flex items-center justify-between text-xs">
								<span className="text-muted-foreground">
									{adicional.opcao?.nome || "Adicional"} x{adicional.quantidade}
								</span>
								<span className="font-medium">{formatToMoney(adicional.valorTotal)}</span>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}

// Edição da venda: habilitada pela política derivada do servidor (`editabilidade`); quando
// bloqueada, a razão aparece em tooltip — nunca um botão morto sem explicação.
function SaleEditButton({ sale, userCanEditSales }: { sale: TGetSalesOutputById; userCanEditSales: boolean }) {
	const editability = sale.editabilidade;
	if (!userCanEditSales || !editability) return null;
	if (sale.processamentoOrigem !== "INTERNO") return null;

	const editIsEnabled = editability.nivel === "TOTAL" || editability.rascunho;
	const editHref = editability.rascunho ? `/dashboard/commercial/sales/checkout/${sale.id}` : `/dashboard/commercial/sales/edit/${sale.id}`;

	if (editIsEnabled) {
		return (
			<Button variant="ghost" size="fit" asChild className="rounded-full flex items-center gap-1 px-2 py-2">
				<Link href={editHref}>
					<PencilLine className="w-5 h-5" />
					{editability.rascunho ? "ABRIR CHECKOUT" : "EDITAR VENDA"}
				</Link>
			</Button>
		);
	}

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<span>
						<Button variant="ghost" size="fit" disabled className="rounded-full flex items-center gap-1 px-2 py-2">
							<PencilLine className="w-5 h-5" />
							EDITAR VENDA
						</Button>
					</span>
				</TooltipTrigger>
				<TooltipContent>{editability.motivos[0] ?? "Edição indisponível para o estado atual da venda."}</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

// Cancelamento com estorno: o caminho correto para vendas confirmadas (a copy do delete finalmente
// aponta para um fluxo que existe).
function SaleCancelButton({ sale, userCanDeleteSales }: { sale: TGetSalesOutputById; userCanDeleteSales: boolean }) {
	const [cancelDialogIsOpen, setCancelDialogIsOpen] = useState(false);
	const editability = sale.editabilidade;
	if (!userCanDeleteSales || !editability?.cancelamentoDisponivel) return null;

	return (
		<>
			<Button
				variant="ghost-destructive"
				size="fit"
				onClick={() => setCancelDialogIsOpen(true)}
				className="rounded-full flex items-center gap-1 px-2 py-2"
			>
				<CircleX className="w-5 h-5" />
				CANCELAR VENDA
			</Button>
			{cancelDialogIsOpen ? (
				<CancelConfirmedSaleDialog
					saleId={sale.id}
					idExterno={sale.idExterno}
					valorTotal={sale.valorTotal}
					clienteNome={sale.cliente?.nome}
					exigeCancelamentoFiscal={editability.cancelamentoExigeFiscal}
					closeModal={() => setCancelDialogIsOpen(false)}
				/>
			) : null}
		</>
	);
}

function SaleDeleteButton({ sale, userCanDeleteSales }: { sale: TGetSalesOutputById; userCanDeleteSales: boolean }) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const [deleteConfirmMenuIsOpen, setDeleteConfirmMenuIsOpen] = useState(false);
	const saleIsInternal = sale.processamentoOrigem === "INTERNO";
	const saleIsConfirmed = sale.statusVenda === "CONFIRMADA";
	const hasFiscalDocuments = sale.documentosFiscais.length > 0;
	const canOpenDeleteFlow = saleIsInternal && userCanDeleteSales;
	const canSubmitDelete = canOpenDeleteFlow && !saleIsConfirmed && !hasFiscalDocuments;

	const { mutate: handleDeleteSale, isPending } = useMutation({
		mutationKey: ["delete-sale", sale.id],
		mutationFn: deleteSale,
		onSuccess: async (data) => {
			setDeleteConfirmMenuIsOpen(false);
			await queryClient.invalidateQueries({ queryKey: ["sales"] });
			await queryClient.invalidateQueries({ queryKey: ["sales-by-id", sale.id] });
			toast.success(data.message);
			router.push("/dashboard/commercial/sales");
		},
		onError: (error) => {
			toast.error(getErrorMessage(error));
		},
	});

	if (!saleIsInternal) return null;
	return (
		<>
			<Button
				variant="ghost-destructive"
				size="fit"
				disabled={!userCanDeleteSales}
				onClick={() => setDeleteConfirmMenuIsOpen(true)}
				className="rounded-full flex items-center gap-1 px-2 py-2"
			>
				<Trash className="w-5 h-5" />
				EXCLUIR VENDA
			</Button>
			<Dialog open={deleteConfirmMenuIsOpen} onOpenChange={(open) => (!isPending ? setDeleteConfirmMenuIsOpen(open) : null)}>
				<DialogContent className="max-w-lg">
					<DialogHeader>
						<div className="flex items-center gap-2 text-destructive">
							<AlertTriangle className="h-5 w-5" />
							<DialogTitle>Excluir venda?</DialogTitle>
						</div>
						<DialogDescription>
							Essa ação exclui a venda permanentemente, reverte os efeitos de cashback vinculados e remove conversões de campanha associadas à venda.
						</DialogDescription>
					</DialogHeader>

					<div className="flex flex-col gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
						<div className="flex items-center justify-between gap-3 text-sm">
							<span className="text-muted-foreground">Identificador</span>
							<span className="font-bold">{sale.idExterno}</span>
						</div>
						<div className="flex items-center justify-between gap-3 text-sm">
							<span className="text-muted-foreground">Valor</span>
							<span className="font-bold">{formatToMoney(sale.valorTotal)}</span>
						</div>
						<div className="flex items-center justify-between gap-3 text-sm">
							<span className="text-muted-foreground">Cliente</span>
							<span className="font-bold">{sale.cliente?.nome ?? "AO CONSUMIDOR"}</span>
						</div>
					</div>

					<div className="flex flex-col gap-2 text-sm text-muted-foreground">
						<p>Antes de excluir, o sistema validará se não há efeitos fiscais, contábeis, de estoque ou atendimento que impedem a exclusão.</p>
						{saleIsConfirmed ? <p className="font-medium text-destructive">Vendas confirmadas devem ser canceladas pelo fluxo de cancelamento.</p> : null}
						{hasFiscalDocuments ? (
							<p className="font-medium text-destructive">Esta venda possui documento fiscal vinculado e não pode ser excluída.</p>
						) : null}
						{!userCanDeleteSales ? <p className="font-medium text-destructive">Você não possui permissão para excluir vendas.</p> : null}
					</div>

					<DialogFooter>
						<Button variant="outline" disabled={isPending} onClick={() => setDeleteConfirmMenuIsOpen(false)}>
							CANCELAR
						</Button>
						<LoadingButton variant="destructive" loading={isPending} disabled={!canSubmitDelete} onClick={() => handleDeleteSale({ id: sale.id })}>
							EXCLUIR DEFINITIVAMENTE
						</LoadingButton>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
