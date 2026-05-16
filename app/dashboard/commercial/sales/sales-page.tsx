"use client";
import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import GeneralPaginationComponent from "@/components/Utils/Pagination";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { InteractiveFilter, type InteractiveFilterOption } from "@/components/ui/interactive-filter";
import { Input } from "@/components/ui/input";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { getErrorMessage } from "@/lib/errors";
import { formatDateAsLocale, formatNameAsInitials, formatToMoney } from "@/lib/formatting";
import { formatInteractiveDateRangeSummary, formatInteractiveOptionSummary } from "@/lib/interactive-filter-formatting";
import { useSales } from "@/lib/queries/sales";
import { useSaleQueryFilterOptions } from "@/lib/queries/stats/utils";
import { cn } from "@/lib/utils";
import type { TGetSalesInput, TGetSalesOutputDefault } from "@/app/api/sales/route";
import {
	ArrowRight,
	BadgeDollarSign,
	BadgePercent,
	Calendar,
	CircleUser,
	Clock,
	FileSpreadsheet,
	Info,
	ListFilter,
	Megaphone,
	Package,
	Plus,
	Tag,
	TrendingDown,
	TrendingUp,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

type SalesPageProps = {
	user: TAuthUserSession["user"];
	organization: NonNullable<TAuthUserSession["membership"]>["organizacao"];
};

export default function SalesPage({ user: _user, organization }: SalesPageProps) {
	const orgHasERPAccess = organization.configuracao.recursos.erp.acesso;
	const {
		data: salesResult,
		isLoading,
		isError,
		isSuccess,
		error,
		params,
		updateParams,
	} = useSales({
		initialParams: {
			page: 1,
			search: "",
			periodAfter: null,
			periodBefore: null,
			sellersIds: [],
			partnersIds: [],
			saleNatures: [],
		},
	});

	const sales = salesResult?.sales;
	const salesShowing = sales ? sales.length : 0;
	const salesMatched = salesResult?.salesMatched || 0;
	const totalPages = salesResult?.totalPages;

	return (
		<div className="w-full h-full flex flex-col gap-3">
			<div className="w-full flex items-center gap-2 flex-col-reverse lg:flex-row">
				<Input
					value={params.search ?? ""}
					placeholder="Pesquisar venda (nome do cliente)..."
					onChange={(e) => updateParams({ search: e.target.value })}
					className="grow rounded-xl"
				/>
				<Button variant={"ghost"} className="flex items-center gap-2" size="sm" asChild>
					<Link href="/dashboard/commercial/sales/bulk-insert">
						<FileSpreadsheet className="w-4 h-4 min-w-4 min-h-4" />
						IMPORTAR VENDAS
					</Link>
				</Button>
				{orgHasERPAccess ? (
					<Button className="flex items-center gap-2" size="sm" asChild>
						<Link href="/dashboard/commercial/sales/new-sale">
							<Plus className="w-4 h-4 min-w-4 min-h-4" />
							NOVA VENDA
						</Link>
					</Button>
				) : null}
			</div>
			<SalesInlineFilters filters={params} updateFilters={updateParams} />

			<GeneralPaginationComponent
				activePage={params.page}
				queryLoading={isLoading}
				selectPage={(page) => updateParams({ page })}
				totalPages={totalPages || 0}
				itemsMatchedText={salesMatched > 0 ? `${salesMatched} vendas encontradas.` : `${salesMatched} venda encontrada.`}
				itemsShowingText={salesShowing > 0 ? `Mostrando ${salesShowing} vendas.` : `Mostrando ${salesShowing} venda.`}
			/>

			{isLoading ? <LoadingComponent /> : null}
			{isError ? <ErrorComponent msg={getErrorMessage(error)} /> : null}
			{isSuccess && sales ? (
				sales.length > 0 ? (
					sales.map((sale) => <SaleCard key={sale.id} sale={sale} />)
				) : (
					<p className="w-full tracking-tight text-center">Nenhuma venda encontrada.</p>
				)
			) : null}
		</div>
	);
}

function SaleCard({ sale }: { sale: TGetSalesOutputDefault["sales"][number] }) {
	return (
		<div className="bg-card border-border flex w-full flex-col gap-3 rounded-xl border px-4 py-4 shadow-2xs hover:border-border hover:shadow-sm transition-all cursor-pointer">
			<div className="flex flex-col md:flex-row justify-between gap-3">
				{/* Client Info & Sale Basics */}
				<div className="flex flex-col gap-1.5 grow">
					<div className="flex items-center gap-2">
						<CircleUser className="w-4 h-4 text-foreground/70" />
						<h1 className="text-sm font-bold tracking-tight uppercase">{sale.cliente?.nome ?? "AO CONSUMIDOR"}</h1>
					</div>
					<div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
						<div className="flex items-center gap-1 bg-secondary px-2 py-0.5 rounded-md">
							<Calendar className="w-3 h-3" />
							<span>{formatDateAsLocale(sale.dataVenda, true)}</span>
						</div>
						<div className="flex items-center gap-1 bg-secondary px-2 py-0.5 rounded-md">
							<Tag className="w-3 h-3" />
							<span>{sale.natureza}</span>
						</div>
					</div>
				</div>

				{/* Financials & Items Summary */}
				<div className="flex flex-col gap-2 md:items-end">
					<div className="flex items-center gap-1.5">
						{sale.atribuicaoCampanhaConversao ? (
							<HoverCard>
								<HoverCardTrigger>
									<div className="flex items-center gap-1.5 bg-violet-500/10 text-violet-600 dark:text-violet-400 px-2 py-1 rounded-md cursor-pointer hover:bg-violet-500/20 transition-colors">
										<Megaphone className="w-3.5 h-3.5" />
										<span className="text-xs font-medium tracking-tight">CONVERSÃO</span>
									</div>
								</HoverCardTrigger>
								<HoverCardContent className="w-72 p-0 overflow-hidden">
									{/* Header */}
									<div className="bg-violet-500/10 px-4 py-3 border-b border-violet-500/10">
										<div className="flex items-center gap-2">
											<div className="p-1.5 bg-violet-500/20 rounded-md">
												<Megaphone className="w-4 h-4 text-violet-600 dark:text-violet-400" />
											</div>
											<div className="flex flex-col">
												<span className="text-[0.6rem] text-muted-foreground uppercase tracking-wide">Campanha</span>
												<span className="text-sm font-semibold leading-tight">{sale.atribuicaoCampanhaConversao.campanha?.titulo}</span>
											</div>
										</div>
									</div>
									{/* Content */}
									<div className="p-4 space-y-3">
										{/* Timeline */}
										<div className="flex items-center gap-3">
											<div className="flex flex-col items-center gap-1">
												<div className="w-2 h-2 rounded-full bg-blue-500" />
												<div className="w-px h-6 bg-gradient-to-b from-blue-500 to-green-500" />
												<div className="w-2 h-2 rounded-full bg-green-500" />
											</div>
											<div className="flex flex-col gap-3 flex-1">
												<div className="flex flex-col">
													<span className="text-[0.6rem] text-muted-foreground uppercase">Interação Enviada</span>
													<span className="text-xs font-medium">{formatDateAsLocale(sale.atribuicaoCampanhaConversao.dataInteracao, true)}</span>
												</div>
												<div className="flex flex-col">
													<span className="text-[0.6rem] text-muted-foreground uppercase">Converteu em</span>
													<span className="text-xs font-medium">{formatDateAsLocale(sale.atribuicaoCampanhaConversao.dataConversao, true)}</span>
												</div>
											</div>
										</div>
										{/* Stats */}
										<div className="flex items-center gap-2 pt-2 border-t border-border/50">
											<div className="flex-1 flex flex-col items-center p-2 bg-secondary/50 rounded-lg">
												<span className="text-[0.6rem] text-muted-foreground uppercase">Tempo</span>
												<span className="text-xs font-bold">
													{sale.atribuicaoCampanhaConversao.tempoParaConversaoMinutos < 60
														? `${sale.atribuicaoCampanhaConversao.tempoParaConversaoMinutos}min`
														: sale.atribuicaoCampanhaConversao.tempoParaConversaoMinutos < 1440
															? `${Math.round(sale.atribuicaoCampanhaConversao.tempoParaConversaoMinutos / 60)}h`
															: `${Math.round(sale.atribuicaoCampanhaConversao.tempoParaConversaoMinutos / 1440)}d`}
												</span>
											</div>
											<div className="flex-1 flex flex-col items-center p-2 bg-green-500/10 rounded-lg">
												<span className="text-[0.6rem] text-muted-foreground uppercase">Receita</span>
												<span className="text-xs font-bold text-green-600 dark:text-green-400">
													{formatToMoney(sale.atribuicaoCampanhaConversao.atribuicaoReceita)}
												</span>
											</div>
										</div>
									</div>
								</HoverCardContent>
							</HoverCard>
						) : null}
						{sale.transacoesCashback.length > 0 ? (
							<HoverCard>
								<HoverCardTrigger>
									<div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded-md cursor-pointer hover:bg-emerald-500/20 transition-colors">
										<BadgePercent className="w-3.5 h-3.5" />
										<span className="text-xs font-medium tracking-tight">CASHBACK</span>
									</div>
								</HoverCardTrigger>
								<HoverCardContent className="w-80 p-0 overflow-hidden">
									{/* Header */}
									<div className="bg-emerald-500/10 px-4 py-3 border-b border-emerald-500/10">
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-2">
												<div className="p-1.5 bg-emerald-500/20 rounded-md">
													<BadgePercent className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
												</div>
												<div className="flex flex-col">
													<span className="text-[0.6rem] text-muted-foreground uppercase tracking-wide">Transações</span>
													<span className="text-sm font-semibold leading-tight">
														{sale.transacoesCashback.length} {sale.transacoesCashback.length === 1 ? "movimento" : "movimentos"}
													</span>
												</div>
											</div>
										</div>
									</div>
									{/* Transactions */}
									<div className="p-3 space-y-2 max-h-64 overflow-y-auto">
										{sale.transacoesCashback.map((transaction) => (
											<div key={transaction.id} className="bg-secondary/30 rounded-lg p-3 space-y-2">
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
								</HoverCardContent>
							</HoverCard>
						) : null}
						<div className="flex items-center gap-1.5 bg-primary/10 text-foreground px-2.5 py-1 rounded-md w-fit">
							<BadgeDollarSign className="w-4 h-4" />
							<span className="font-bold text-sm">{formatToMoney(sale.valorTotal)}</span>
						</div>
					</div>

					<div className="flex items-center gap-1.5 text-xs text-muted-foreground w-fit">
						<Package className="w-3 h-3" />
						<span>
							{sale.itens.length} {sale.itens.length === 1 ? "item" : "itens"}
						</span>
					</div>
				</div>
			</div>

			{/* Participants (Seller & Partner) */}
			{(sale.vendedor || sale.parceiro) && (
				<div className="flex items-center gap-4 pt-3 border-t border-border/50">
					{sale.vendedor && (
						<div className="flex items-center gap-2">
							<Avatar className="w-6 h-6">
								<AvatarImage src={sale.vendedor.avatarUrl ?? undefined} alt={sale.vendedor.nome} />
								<AvatarFallback className="text-[0.6rem]">{formatNameAsInitials(sale.vendedor.nome)}</AvatarFallback>
							</Avatar>
							<div className="flex flex-col">
								<span className="text-[0.6rem] text-muted-foreground font-medium uppercase leading-none">Vendedor</span>
								<span className="text-xs font-bold leading-none mt-0.5">{sale.vendedor.nome}</span>
							</div>
						</div>
					)}
					{sale.parceiro && (
						<div className="flex items-center gap-2">
							<Avatar className="w-6 h-6">
								<AvatarImage src={sale.parceiro.avatarUrl ?? undefined} alt={sale.parceiro.nome} />
								<AvatarFallback className="text-[0.6rem]">{formatNameAsInitials(sale.parceiro.nome)}</AvatarFallback>
							</Avatar>
							<div className="flex flex-col">
								<span className="text-[0.6rem] text-muted-foreground font-medium uppercase leading-none">Parceiro</span>
								<span className="text-xs font-bold leading-none mt-0.5">{sale.parceiro.nome}</span>
							</div>
						</div>
					)}
				</div>
			)}
			<div className="w-full flex items-center justify-end">
				<Button variant="link" className="flex items-center gap-1.5" size="sm" asChild>
					<Link href={`/dashboard/commercial/sales/${sale.id}`}>
						<Info className="w-3 min-w-3 h-3 min-h-3" />
						DETALHES
					</Link>
				</Button>
			</div>
		</div>
	);
}

type SalesInlineFiltersProps = {
	filters: TGetSalesInput;
	updateFilters: (filters: Partial<TGetSalesInput>) => void;
};

function SalesInlineFilters({ filters, updateFilters }: SalesInlineFiltersProps) {
	const { data: filterOptions } = useSaleQueryFilterOptions();
	const saleNatureOptions = (filterOptions?.saleNatures ?? []) as InteractiveFilterOption<string>[];
	const sellerOptions = (filterOptions?.sellers ?? []) as InteractiveFilterOption<string>[];
	const partnerOptions = (filterOptions?.partners ?? []) as InteractiveFilterOption<string>[];
	const hasSaleNatures = (filters.saleNatures ?? []).length > 0;
	const hasSellers = (filters.sellersIds ?? []).length > 0;
	const hasPartners = (filters.partnersIds ?? []).length > 0;

	return (
		<div className="flex w-full flex-wrap items-center gap-2">
			<InteractiveFilter.Root className="w-fit">
				<InteractiveFilter.Trigger>
					<InteractiveFilter.Icon>
						<Calendar className="h-4 w-4" />
						<InteractiveFilter.Label>PERÍODO</InteractiveFilter.Label>
					</InteractiveFilter.Icon>
					<InteractiveFilter.Value>{formatInteractiveDateRangeSummary(filters.periodAfter, filters.periodBefore)}</InteractiveFilter.Value>
					<InteractiveFilter.Clear onClear={() => updateFilters({ periodAfter: null, periodBefore: null, page: 1 })} />
				</InteractiveFilter.Trigger>
				<InteractiveFilter.Content className="w-auto p-0">
					<InteractiveFilter.DateRangeContent
						value={{
							from: filters.periodAfter ? new Date(filters.periodAfter) : undefined,
							to: filters.periodBefore ? new Date(filters.periodBefore) : undefined,
						}}
						onChange={(period) => updateFilters({ periodAfter: period.from ?? null, periodBefore: period.to ?? null, page: 1 })}
					/>
				</InteractiveFilter.Content>
			</InteractiveFilter.Root>

			{hasSaleNatures ? (
				<SalesMultiFilter
					icon={<Tag className="h-4 w-4" />}
					label="NATUREZAS"
					options={saleNatureOptions}
					value={filters.saleNatures ?? []}
					onChange={(saleNatures) => updateFilters({ saleNatures, page: 1 })}
					onClear={() => updateFilters({ saleNatures: [], page: 1 })}
					clearLabel="NENHUMA"
				/>
			) : null}
			{hasSellers ? (
				<SalesMultiFilter
					icon={<CircleUser className="h-4 w-4" />}
					label="VENDEDORES"
					options={sellerOptions}
					value={filters.sellersIds ?? []}
					onChange={(sellersIds) => updateFilters({ sellersIds, page: 1 })}
					onClear={() => updateFilters({ sellersIds: [], page: 1 })}
				/>
			) : null}
			{hasPartners ? (
				<SalesMultiFilter
					icon={<CircleUser className="h-4 w-4" />}
					label="PARCEIROS"
					options={partnerOptions}
					value={filters.partnersIds ?? []}
					onChange={(partnersIds) => updateFilters({ partnersIds, page: 1 })}
					onClear={() => updateFilters({ partnersIds: [], page: 1 })}
				/>
			) : null}

			<InteractiveFilter.AddFilterRoot className="w-fit">
				<InteractiveFilter.AddFilterTrigger>
					<ListFilter className="h-4 w-4" />
					<InteractiveFilter.Label>ADICIONAR FILTRO</InteractiveFilter.Label>
				</InteractiveFilter.AddFilterTrigger>
				<InteractiveFilter.AddFilterContent>
					<InteractiveFilter.AddFilterSection heading="Filtros">
						{!hasSaleNatures ? (
							<InteractiveFilter.AddFilterItem id="saleNatures" label="NATUREZAS" icon={<Tag className="h-4 w-4" />}>
								<InteractiveFilter.MultiContent
									options={saleNatureOptions}
									value={filters.saleNatures ?? []}
									onChange={(saleNatures) => updateFilters({ saleNatures, page: 1 })}
									onClear={() => updateFilters({ saleNatures: [], page: 1 })}
									clearLabel="NENHUMA"
								/>
							</InteractiveFilter.AddFilterItem>
						) : null}
						{!hasSellers ? (
							<InteractiveFilter.AddFilterItem id="sellers" label="VENDEDORES" icon={<CircleUser className="h-4 w-4" />}>
								<InteractiveFilter.MultiContent
									options={sellerOptions}
									value={filters.sellersIds ?? []}
									onChange={(sellersIds) => updateFilters({ sellersIds, page: 1 })}
									onClear={() => updateFilters({ sellersIds: [], page: 1 })}
									clearLabel="TODOS"
								/>
							</InteractiveFilter.AddFilterItem>
						) : null}
						{!hasPartners ? (
							<InteractiveFilter.AddFilterItem id="partners" label="PARCEIROS" icon={<CircleUser className="h-4 w-4" />}>
								<InteractiveFilter.MultiContent
									options={partnerOptions}
									value={filters.partnersIds ?? []}
									onChange={(partnersIds) => updateFilters({ partnersIds, page: 1 })}
									onClear={() => updateFilters({ partnersIds: [], page: 1 })}
									clearLabel="TODOS"
								/>
							</InteractiveFilter.AddFilterItem>
						) : null}
					</InteractiveFilter.AddFilterSection>
				</InteractiveFilter.AddFilterContent>
			</InteractiveFilter.AddFilterRoot>
		</div>
	);
}

function SalesMultiFilter({
	icon,
	label,
	options,
	value,
	onChange,
	onClear,
	clearLabel = "TODOS",
}: {
	icon: ReactNode;
	label: string;
	options: InteractiveFilterOption<string>[];
	value: string[];
	onChange: (value: string[]) => void;
	onClear: () => void;
	clearLabel?: string;
}) {
	return (
		<InteractiveFilter.Root className="w-fit">
			<InteractiveFilter.Trigger>
				<InteractiveFilter.Icon>
					{icon}
					<InteractiveFilter.Label>{label}</InteractiveFilter.Label>
				</InteractiveFilter.Icon>
				<InteractiveFilter.Value>{formatInteractiveOptionSummary(options, value)}</InteractiveFilter.Value>
				<InteractiveFilter.Clear onClear={onClear} />
			</InteractiveFilter.Trigger>
			<InteractiveFilter.Content className="w-72 p-0">
				<InteractiveFilter.MultiContent options={options} value={value} onChange={onChange} onClear={onClear} clearLabel={clearLabel} />
			</InteractiveFilter.Content>
		</InteractiveFilter.Root>
	);
}
