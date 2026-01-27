"use client";

import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import SectionWrapper from "@/components/ui/section-wrapper";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { getAgeFromBirthdayDate } from "@/lib/dates";
import { getErrorMessage } from "@/lib/errors";
import { formatDateAsLocale, formatDateBirthdayAsLocale, formatNameAsInitials, formatToMoney, formatToPhone } from "@/lib/formatting";
import { useSalesById } from "@/lib/queries/sales";
import { cn } from "@/lib/utils";
import type { TGetSalesOutputById } from "@/pages/api/sales";
import {
	ArrowLeft,
	ArrowRight,
	BadgeDollarSign,
	BadgePercent,
	Calendar,
	CircleUser,
	Clock,
	Code,
	Diamond,
	FileText,
	Grid3X3,
	Mail,
	MapPin,
	Megaphone,
	Package,
	Phone,
	Receipt,
	Tag,
	TrendingDown,
	TrendingUp,
	Truck,
	Users,
} from "lucide-react";
import Link from "next/link";

type SaleByIdPageProps = {
	user: TAuthUserSession["user"];
	saleId: string;
};

// Helper function to format time to conversion
function formatTimeToConversion(minutes: number): string {
	if (minutes < 60) return `${minutes}min`;
	if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
	return `${Math.round(minutes / 1440)}d`;
}

// Status label mapping
const SITUACAO_LABELS: Record<string, string> = {
	"00": "NORMAL",
	"02": "CANCELADA",
	"04": "DENEGADA",
	"05": "INUTILIZADA",
};

const SITUACAO_COLORS: Record<string, string> = {
	"00": "bg-green-500/10 text-green-600 dark:text-green-400",
	"02": "bg-red-500/10 text-red-600 dark:text-red-400",
	"04": "bg-orange-500/10 text-orange-600 dark:text-orange-400",
	"05": "bg-gray-500/10 text-gray-600 dark:text-gray-400",
};

export default function SaleByIdPage({ user, saleId }: SaleByIdPageProps) {
	const { data: sale, isLoading, isError, error, isSuccess } = useSalesById({ id: saleId });

	if (isLoading) return <LoadingComponent />;
	if (isError) return <ErrorComponent msg={getErrorMessage(error)} />;
	if (!isSuccess || !sale) return <ErrorComponent msg="Venda não encontrada." />;

	return (
		<div className="w-full h-full flex flex-col gap-4">
			{/* Page Header */}
			<div className="w-full flex items-center gap-3">
				<Button variant="ghost" size="fit" asChild className="rounded-full hover:bg-brand/10 flex items-center gap-1 px-2 py-2">
					<Link href={"/dashboard/commercial/sales"} className="flex items-center gap-1">
						<ArrowLeft className="w-5 h-5" />
						VOLTAR
					</Link>
				</Button>

				<h1 className="text-lg font-bold tracking-tight">VENDA - {formatDateAsLocale(sale.dataVenda, true)}</h1>
			</div>

			{/* Sale Overview Section */}
			<SaleOverviewSection sale={sale} />
			<div className="w-full flex flex-col lg:flex-row gap-4 lg:items-stretch">
				<div className="w-full lg:w-1/2 flex">
					<CampaignAttributionSection attribution={sale.atribuicaoCampanhaConversao} saleDate={sale.dataVenda} />
				</div>
				<div className="w-full lg:w-1/2 flex">
					<CashbackTransactionsSection transactions={sale.transacoesCashback} />
				</div>
			</div>
			<div className="w-full flex flex-col lg:flex-row gap-4 lg:items-stretch">
				<div className="w-full lg:w-1/2 flex">
					<ClientSection client={sale.cliente} />
				</div>
				<div className="w-full lg:w-1/2 flex">
					<ParticipantsSection vendedor={sale.vendedor} parceiro={sale.parceiro} />
				</div>
			</div>
			{/* Sale Items Section */}
			<SaleItemsSection items={sale.itens} />
		</div>
	);
}

function SaleOverviewSection({ sale }: { sale: TGetSalesOutputById }) {
	return (
		<SectionWrapper title="VISÃO GERAL DA VENDA" icon={<Receipt className="w-4 h-4 min-w-4 min-h-4" />}>
			<div className="w-full flex flex-col gap-2">
				<h1 className="text-xs leading-none tracking-tight">INFORMAÇÕES GERAIS</h1>
				<div className="w-full flex flex-col gap-1.5">
					<div className="w-full flex items-center gap-1.5">
						<Code className="w-4 h-4" />
						<h3 className="text-sm font-semibold tracking-tighter text-primary/80">IDENTIFICADOR EXTERNO</h3>
						<h3 className="text-sm font-semibold tracking-tight">{sale.idExterno}</h3>
					</div>
					<div className="w-full flex items-center gap-1.5">
						<BadgeDollarSign className="w-4 h-4" />
						<h3 className="text-sm font-semibold tracking-tighter text-primary/80">VALOR</h3>
						<h3 className="text-sm font-semibold tracking-tight">{formatToMoney(sale.valorTotal)}</h3>
					</div>

					<div className="w-full flex items-center gap-1.5">
						<Calendar className="w-4 h-4" />
						<h3 className="text-sm font-semibold tracking-tighter text-primary/80">DATA DA VENDA</h3>
						<h3 className="text-sm font-semibold tracking-tight">{formatDateAsLocale(sale.dataVenda, true) || "DATA DA VENDA NÃO DEFINIDA"}</h3>
					</div>
					<div className="w-full flex items-center gap-1.5">
						<Calendar className="w-4 h-4" />
						<h3 className="text-sm font-semibold tracking-tighter text-primary/80">CANAL</h3>
						<h3 className="text-sm font-semibold tracking-tight">{sale.canal || "CANAL NÃO DEFINIDO"}</h3>
					</div>
					<div className="w-full flex items-center gap-1.5">
						<Truck className="w-4 h-4" />
						<h3 className="text-sm font-semibold tracking-tighter text-primary/80">MODALIDADE</h3>
						<h3 className="text-sm font-semibold tracking-tight">{sale.entregaModalidade || "MODALIDADE NÃO DEFINIDA"}</h3>
					</div>
					<div className="flex items-center gap-1.5">
						<Tag className="w-4 h-4 text-muted-foreground" />
						<h3 className="text-sm font-semibold tracking-tighter text-primary/80">NATUREZA</h3>
						<h3 className="text-sm font-semibold tracking-tight">{sale.natureza}</h3>
					</div>
				</div>
			</div>
			<div className="w-full flex flex-col gap-2">
				<h1 className="text-xs leading-none tracking-tight">INFORMAÇÕES DO DOCUMENTO</h1>
				<div className="w-full flex flex-col gap-1.5">
					<div className="flex items-center gap-1.5">
						<FileText className="w-4 h-4 text-muted-foreground" />
						<h3 className="text-sm font-semibold tracking-tighter text-primary/80">DOCUMENTO</h3>
						<h3 className="text-sm font-semibold tracking-tight">{sale.documento}</h3>
					</div>
					<div className="flex items-center gap-1.5">
						<FileText className="w-4 h-4 text-muted-foreground" />
						<h3 className="text-sm font-semibold tracking-tighter text-primary/80">MODELO</h3>
						<h3 className="text-sm font-semibold tracking-tight">{sale.modelo || "N/A"}</h3>
					</div>
					<div className="flex items-center gap-1.5">
						<FileText className="w-4 h-4 text-muted-foreground" />
						<h3 className="text-sm font-semibold tracking-tighter text-primary/80">SÉRIE</h3>
						<h3 className="text-sm font-semibold tracking-tight">{sale.serie || "N/A"}</h3>
					</div>
					<div className="flex items-start gap-1.5">
						<FileText className="w-4 h-4 text-muted-foreground mt-0.5" />
						<h3 className="text-sm font-semibold tracking-tighter text-primary/80">CHAVE</h3>
						<h3 className="text-sm font-semibold tracking-tight break-all">{sale.chave || "N/A"}</h3>
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
					<h3 className="text-sm font-semibold tracking-tighter text-primary/80">NOME</h3>
					<h3 className="text-sm font-semibold tracking-tight">{client.nome}</h3>
				</div>

				{/* Phone */}
				{client.telefone && (
					<div className="flex items-center gap-1.5">
						<Phone className="w-4 h-4 text-muted-foreground" />
						<h3 className="text-sm font-semibold tracking-tighter text-primary/80">TELEFONE</h3>
						<h3 className="text-sm font-semibold tracking-tight">{formatToPhone(client.telefone)}</h3>
					</div>
				)}

				{/* Email */}
				{client.email && (
					<div className="flex items-center gap-1.5">
						<Mail className="w-4 h-4 text-muted-foreground" />
						<h3 className="text-sm font-semibold tracking-tighter text-primary/80">EMAIL</h3>
						<h3 className="text-sm font-semibold tracking-tight">{client.email}</h3>
					</div>
				)}

				{/* Birth Date */}
				<div className="flex items-center gap-1.5">
					<Calendar className="w-4 h-4 text-muted-foreground" />
					<h3 className="text-sm font-semibold tracking-tighter text-primary/80">IDADE</h3>
					<h3 className="text-sm font-semibold tracking-tight">
						{client.dataNascimento
							? `${getAgeFromBirthdayDate(client.dataNascimento)} ANOS (NASCIDO EM: ${formatDateBirthdayAsLocale(client.dataNascimento, true)})`
							: "NÃO DEFINIDO"}
					</h3>
				</div>
				<div className="flex items-center gap-1.5">
					<Grid3X3 className="w-4 h-4 text-muted-foreground" />
					<h3 className="text-sm font-semibold tracking-tighter text-primary/80">SEGMENTAÇÃO RFM</h3>
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
					<h3 className="text-sm font-semibold tracking-tighter text-primary/80">LOCALIZAÇÃO</h3>
					<h3 className="text-sm font-semibold tracking-tight">
						{[client.localizacaoCidade, client.localizacaoEstado].filter(Boolean).join(", ") || "NÃO DEFINIDO"}
					</h3>
				</div>
			</div>
		</SectionWrapper>
	);
}

function ParticipantsSection({
	vendedor,
	parceiro,
}: {
	vendedor: TGetSalesOutputById["vendedor"];
	parceiro: TGetSalesOutputById["parceiro"];
}) {
	return (
		<SectionWrapper title="PARTICIPANTES" icon={<Users className="w-4 h-4 min-w-4 min-h-4" />}>
			<div className="w-full flex flex-col gap-4">
				{vendedor ? (
					<div className="flex items-center gap-3">
						<Avatar className="w-10 h-10">
							<AvatarImage src={vendedor.avatarUrl ?? undefined} alt={vendedor.nome} />
							<AvatarFallback>{formatNameAsInitials(vendedor.nome)}</AvatarFallback>
						</Avatar>
						<div className="flex flex-col">
							<span className="text-[0.65rem] text-muted-foreground font-medium uppercase leading-none">Vendedor</span>
							<span className="text-sm font-bold leading-tight mt-0.5">{vendedor.nome}</span>
						</div>
					</div>
				) : (
					<div className="flex items-center gap-3">
						<Avatar className="w-10 h-10">
							<AvatarImage src={undefined} alt={"Vendedor não atribuído"} />
							<AvatarFallback>N/A</AvatarFallback>
						</Avatar>
						<div className="flex flex-col">
							<span className="text-[0.65rem] text-muted-foreground font-medium uppercase leading-none">Vendedor</span>
							<span className="text-sm font-bold leading-tight mt-0.5">VENDEDOR NÃO ATRIBUÍDO</span>
						</div>
					</div>
				)}
				{parceiro ? (
					<div className="flex items-center gap-3">
						<Avatar className="w-10 h-10">
							<AvatarImage src={parceiro.avatarUrl ?? undefined} alt={parceiro.nome} />
							<AvatarFallback>{formatNameAsInitials(parceiro.nome)}</AvatarFallback>
						</Avatar>
						<div className="flex flex-col">
							<span className="text-[0.65rem] text-muted-foreground font-medium uppercase leading-none">Parceiro</span>
							<span className="text-sm font-bold leading-tight mt-0.5">{parceiro.nome}</span>
						</div>
					</div>
				) : (
					<div className="flex items-center gap-3">
						<Avatar className="w-10 h-10">
							<AvatarImage src={undefined} alt={"Parceiro não atribuído"} />
							<AvatarFallback>N/A</AvatarFallback>
						</Avatar>
						<div className="flex flex-col">
							<span className="text-[0.65rem] text-muted-foreground font-medium uppercase leading-none">Parceiro</span>
							<span className="text-sm font-bold leading-tight mt-0.5">PARCEIRO NÃO ATRIBUÍDO</span>
						</div>
					</div>
				)}
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
						<div className="w-px h-8 bg-gradient-to-b from-blue-500 to-green-500" />
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

function CashbackTransactionsSection({
	transactions,
}: {
	transactions: TGetSalesOutputById["transacoesCashback"];
}) {
	if (transactions.length === 0)
		return (
			<SectionWrapper title="TRANSAÇÕES DE CASHBACK" icon={<BadgePercent className="w-4 h-4 min-w-4 min-h-4 text-emerald-600 dark:text-emerald-400" />}>
				<div className="w-full flex flex-col items-center justify-center gap-3">
					<span className="text-sm font-medium text-muted-foreground">NENHUMA TRANSAÇÃO DE CASHBACK ENCONTRADA</span>
				</div>
			</SectionWrapper>
		);
	return (
		<SectionWrapper title="TRANSAÇÕES DE CASHBACK" icon={<BadgePercent className="w-4 h-4 min-w-4 min-h-4 text-emerald-600 dark:text-emerald-400" />}>
			<div className="w-full flex flex-col gap-3">
				{transactions.map((transaction, index) => (
					<div key={index.toString()} className="bg-secondary/30 rounded-lg p-3 space-y-2">
						{/* Type and Value */}
						<div className="flex items-center justify-between">
							<div
								className={cn(
									"flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[0.65rem] font-semibold uppercase",
									transaction.tipo === "ACÚMULO"
										? "bg-green-500/15 text-green-600 dark:text-green-400"
										: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
								)}
							>
								{transaction.tipo === "ACÚMULO" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
								{transaction.tipo}
							</div>
							<span
								className={cn(
									"text-sm font-bold",
									transaction.tipo === "ACÚMULO" ? "text-green-600 dark:text-green-400" : "text-orange-600 dark:text-orange-400",
								)}
							>
								{transaction.tipo === "ACÚMULO" ? "+" : "-"}
								{formatToMoney(transaction.valor)}
							</span>
						</div>

						{/* Balance Flow */}
						<div className="flex items-center gap-2 text-[0.65rem] text-muted-foreground">
							<span>{formatToMoney(transaction.saldoValorAnterior)}</span>
							<ArrowRight className="w-3 h-3" />
							<span className="font-medium text-foreground">{formatToMoney(transaction.saldoValorPosterior)}</span>
						</div>

						{/* Date and Expiration */}
						<div className="flex items-center justify-between text-[0.6rem] text-muted-foreground pt-1 border-t border-border/30">
							<div className="flex items-center gap-1">
								<Calendar className="w-3 h-3" />
								{formatDateAsLocale(transaction.dataInsercao)}
							</div>
							{transaction.expiracaoData && (
								<div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
									<Clock className="w-3 h-3" />
									Expira: {formatDateAsLocale(transaction.expiracaoData)}
								</div>
							)}
						</div>
					</div>
				))}
			</div>
		</SectionWrapper>
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
					<img src={imageUrl} alt={item.produto?.descricao || "Produto"} className="w-full h-full object-cover" />
				) : (
					<Package className="w-12 h-12 text-muted-foreground/50" />
				)}
			</div>

			{/* Content */}
			<div className="p-3 flex flex-col gap-2">
				{/* Product Info */}
				<div className="flex flex-col gap-0.5">
					<h3 className="text-sm font-bold tracking-tight line-clamp-2">{item.produto?.descricao || "Produto"}</h3>
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
						<span className="text-primary">{formatToMoney(item.valorVendaTotalLiquido)}</span>
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
