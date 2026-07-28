"use client";

import type { TGetSalesFulfillmentOutputById } from "@/app/api/sales/fulfillment/route";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/errors";
import { formatDateAsLocale, formatToMoney, formatToPhone } from "@/lib/formatting";
import { useSalesFulfillmentById } from "@/lib/queries/sales-fulfillment";
import { cn } from "@/lib/utils";
import {
	BadgeCheck,
	Banknote,
	ChevronDown,
	CircleCheck,
	CircleDollarSign,
	CircleMinus,
	CircleX,
	CircleUser,
	ClipboardList,
	Clock3,
	FileCheck2,
	FileClock,
	FileMinus,
	FileText,
	FileX2,
	MapPin,
	MessageSquareText,
	Package,
	PackageCheck,
	PackageOpen,
	PencilLine,
	Phone,
	PhoneCall,
	ReceiptText,
	RefreshCw,
	Store,
	TriangleAlert,
	Truck,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { FaWhatsapp } from "react-icons/fa6";
import { CancelConfirmedSaleDialog } from "./CancelConfirmedSaleDialog";

type SaleFulfillmentDetailsMenuProps = {
	saleId: string;
	closeMenu: () => void;
	// Permissões do membro (RSC): habilitam os pontos de entrada de edição e cancelamento.
	canEditSales?: boolean;
	canDeleteSales?: boolean;
};

const ATTENDANCE_META: Record<string, { label: string; icon: ReactNode }> = {
	NAO_INICIADO: { label: "Aguardando início", icon: <Clock3 className="size-3.5" /> },
	EM_PREPARO: { label: "Pedido em preparo", icon: <PackageOpen className="size-3.5" /> },
	PRONTO: { label: "Pedido pronto", icon: <PackageCheck className="size-3.5" /> },
	EM_ENTREGA: { label: "Saiu para entrega", icon: <Truck className="size-3.5" /> },
	ENTREGUE: { label: "Pedido entregue", icon: <CircleCheck className="size-3.5" /> },
	PARCIALMENTE_ENTREGUE: { label: "Entrega parcial", icon: <PackageCheck className="size-3.5" /> },
	CANCELADO: { label: "Atendimento cancelado", icon: <CircleX className="size-3.5" /> },
};

const FINANCIAL_META: Record<string, { label: string; icon: ReactNode }> = {
	NAO_GERADO: { label: "Pagamento não gerado", icon: <CircleMinus className="size-3.5" /> },
	PENDENTE: { label: "Pagamento pendente", icon: <Clock3 className="size-3.5" /> },
	PARCIALMENTE_RECEBIDA: { label: "Pagamento parcial", icon: <CircleDollarSign className="size-3.5" /> },
	RECEBIDA: { label: "Pagamento recebido", icon: <BadgeCheck className="size-3.5" /> },
	EM_ATRASO: { label: "Pagamento em atraso", icon: <TriangleAlert className="size-3.5" /> },
};

const FISCAL_META: Record<string, { label: string; icon: ReactNode }> = {
	NAO_EMITIDO: { label: "Nota fiscal não emitida", icon: <FileMinus className="size-3.5" /> },
	PENDENTE: { label: "Emissão fiscal pendente", icon: <FileClock className="size-3.5" /> },
	EM_PROCESSAMENTO: { label: "Nota em processamento", icon: <RefreshCw className="size-3.5" /> },
	AUTORIZADO: { label: "Nota fiscal autorizada", icon: <FileCheck2 className="size-3.5" /> },
	REJEITADO: { label: "Nota fiscal rejeitada", icon: <FileX2 className="size-3.5" /> },
	CANCELADO: { label: "Nota fiscal cancelada", icon: <FileX2 className="size-3.5" /> },
	INUTILIZADO: { label: "Numeração fiscal inutilizada", icon: <FileMinus className="size-3.5" /> },
	ERRO: { label: "Erro na emissão fiscal", icon: <TriangleAlert className="size-3.5" /> },
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
	DINHEIRO: "Dinheiro",
	PIX: "Pix",
	CARTAO_CREDITO: "Cartão de crédito",
	CARTAO_DEBITO: "Cartão de débito",
	BOLETO: "Boleto",
	TRANSFERENCIA: "Transferência",
	CASHBACK: "Cashback",
	VALE: "Vale",
	A_DEFINIR: "A definir",
	FIADO_NOTA: "Fiado / nota",
	OUTRO: "Outro",
};

const DELIVERY_META: Record<string, { label: string; icon: ReactNode }> = {
	PRESENCIAL: { label: "Presencial", icon: <Store className="size-4" /> },
	RETIRADA: { label: "Retirada", icon: <Package className="size-4" /> },
	ENTREGA: { label: "Entrega", icon: <Truck className="size-4" /> },
	COMANDA: { label: "Comanda", icon: <ClipboardList className="size-4" /> },
};

export function SaleFulfillmentDetailsMenu({ saleId, closeMenu, canEditSales, canDeleteSales }: SaleFulfillmentDetailsMenuProps) {
	const query = useSalesFulfillmentById({ saleId });

	return (
		<ResponsiveMenu
			menuTitle={query.data?.idExterno ? `Pedido #${query.data.idExterno}` : "Detalhes do pedido"}
			menuDescription="Visão operacional para conferência do atendimento."
			stateIsLoading={false}
			stateError={null}
			closeMenu={closeMenu}
			dialogVariant="md"
			drawerVariant="xl"
			mode="read-only"
			dialogContentClassName="w-[50%] min-w-[50%] max-w-[50%] lg:max-w-[50%]"
			// drawerContentClassName="max-h-[94dvh] gap-0 overflow-hidden p-0 before:inset-0 before:rounded-t-3xl [&_[data-slot=drawer-footer]]:border-t [&_[data-slot=drawer-footer]]:border-border [&_[data-slot=drawer-footer]]:bg-card"
			// headerClassName="shrink-0 border-b border-border bg-card px-5 py-4 pr-14 sm:px-6"
			// contentClassName="gap-4 bg-muted/35 p-4 sm:p-5 lg:px-6 lg:py-5"
			titleClassName="text-lg font-extrabold tracking-tight"
			descriptionClassName="text-sm"
		>
			{query.isLoading ? <SaleDetailsSkeleton /> : null}
			{query.isError ? <SaleDetailsError error={query.error} isFetching={query.isFetching} retry={() => query.refetch()} /> : null}
			{query.data ? (
				<SaleFulfillmentDetailsContent key={query.data.id} sale={query.data} canEditSales={canEditSales} canDeleteSales={canDeleteSales} />
			) : null}
		</ResponsiveMenu>
	);
}

function SaleDetailsSkeleton() {
	return (
		<div className="flex flex-col gap-4" aria-label="Carregando detalhes do pedido">
			<Skeleton className="h-40 rounded-2xl bg-brand-secondary/15" />
			<div className="rounded-2xl border border-border bg-card p-4 shadow-2xs">
				<div className="mb-4 flex items-center gap-2">
					<Skeleton className="size-9 rounded-xl" />
					<Skeleton className="h-4 w-28" />
				</div>
				<div className="space-y-3">
					{Array.from({ length: 3 }, (_, index) => (
						<div key={index.toString()} className="flex items-center gap-3">
							<Skeleton className="size-16 shrink-0 rounded-xl" />
							<div className="flex-1 space-y-2">
								<Skeleton className="h-4 w-2/3" />
								<Skeleton className="h-3 w-1/3" />
							</div>
							<Skeleton className="h-5 w-20" />
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

function SaleDetailsError({ error, isFetching, retry }: { error: unknown; isFetching: boolean; retry: () => void }) {
	return (
		<div className="flex min-h-72 flex-col items-center justify-center gap-4 rounded-2xl border border-border bg-card px-6 text-center shadow-2xs">
			<div className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
				<RefreshCw className={cn("size-5", isFetching && "animate-spin")} />
			</div>
			<div className="space-y-1">
				<p className="text-base font-extrabold">Não foi possível carregar o pedido</p>
				<p className="max-w-sm text-sm text-muted-foreground">{getErrorMessage(error)}</p>
			</div>
			<Button variant="outline" size="lg" onClick={retry} disabled={isFetching}>
				<RefreshCw className={cn("size-4", isFetching && "animate-spin")} />
				TENTAR NOVAMENTE
			</Button>
		</div>
	);
}

function SaleFulfillmentDetailsContent({
	sale,
	canEditSales,
	canDeleteSales,
}: {
	sale: TGetSalesFulfillmentOutputById;
	canEditSales?: boolean;
	canDeleteSales?: boolean;
}) {
	const [itemsExpanded, setItemsExpanded] = useState(false);
	const visibleItems = itemsExpanded ? sale.itens : sale.itens.slice(0, 3);
	const hiddenItemsCount = Math.max(0, sale.itens.length - 3);
	const delivery = sale.entregaModalidade ? DELIVERY_META[sale.entregaModalidade] : null;

	return (
		<div className="flex flex-col gap-4">
			<OrderSummary sale={sale} />

			<OperationalSection title="Itens do pedido" count={sale.itens.length} icon={<Package className="size-4" />}>
				{sale.itens.length > 0 ? (
					<div className="flex flex-col">
						{visibleItems.map((item, index) => (
							<SaleItemRow key={item.id} item={item} reveal={itemsExpanded && index >= 3} />
						))}
					</div>
				) : (
					<EmptyDetail icon={<Package className="size-5" />} text="Nenhum item encontrado para esta venda." />
				)}

				{hiddenItemsCount > 0 ? (
					<Button
						variant="secondary"
						size="lg"
						className="mt-3 w-full rounded-xl border border-border/70 font-bold"
						onClick={() => setItemsExpanded((expanded) => !expanded)}
						aria-expanded={itemsExpanded}
					>
						<ChevronDown className={cn("size-4 transition-transform duration-200 ease-out motion-reduce:transition-none", itemsExpanded && "rotate-180")} />
						{itemsExpanded ? "MOSTRAR MENOS" : `VER MAIS ${hiddenItemsCount} ${hiddenItemsCount === 1 ? "ITEM" : "ITENS"}`}
					</Button>
				) : null}
			</OperationalSection>

			<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
				<OperationalSection title="Entrega" icon={delivery?.icon ?? <MapPin className="size-4" />}>
					<div className="flex flex-col gap-3">
						<div>
							<p className="text-base font-extrabold">{delivery?.label ?? "Modalidade não informada"}</p>
							{sale.comandaNumero ? <p className="mt-0.5 text-sm text-muted-foreground">Comanda {sale.comandaNumero}</p> : null}
						</div>
						{sale.entregaLocalizacao ? <DeliveryAddress location={sale.entregaLocalizacao} /> : null}
						{sale.entregaModalidade === "ENTREGA" && !sale.entregaLocalizacao ? (
							<EmptyDetail icon={<MapPin className="size-5" />} text="Endereço de entrega não informado." compact />
						) : null}
					</div>
				</OperationalSection>

				<OperationalSection title="Pagamento" icon={<Banknote className="size-4" />}>
					{sale.pagamentos.length > 0 ? (
						<div className="divide-y divide-border/60">
							{sale.pagamentos.map((payment) => {
								const paymentState = getPaymentState(payment);
								return (
									<div key={payment.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
										<div className="min-w-0">
											<p className="truncate text-sm font-extrabold">{PAYMENT_METHOD_LABELS[payment.metodo] ?? payment.metodo}</p>
											<p className={cn("mt-0.5 flex items-center gap-1.5 text-xs font-semibold", paymentState.className)}>
												<span className="size-1.5 rounded-full bg-current" />
												{paymentState.label}
											</p>
										</div>
										<p className="shrink-0 text-base font-black tabular-nums">{formatToMoney(payment.valor)}</p>
									</div>
								);
							})}
						</div>
					) : (
						<EmptyDetail icon={<Banknote className="size-5" />} text="Nenhum recebimento gerado para esta venda." compact />
					)}
				</OperationalSection>
			</div>

			<OperationalSection title="Fiscal" icon={<ReceiptText className="size-4" />}>
				{sale.documentosFiscais.length > 0 ? (
					<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
						{sale.documentosFiscais.map((document) => (
							<div key={document.id} className="flex items-center justify-between gap-3 rounded-xl bg-secondary/65 px-3 py-3">
								<div className="flex min-w-0 items-center gap-2.5">
									<FileText className="size-4 shrink-0 text-brand-secondary" />
									<div className="min-w-0">
										<p className="truncate text-sm font-extrabold">
											{document.tipo} {document.numero ? `nº ${document.numero}` : "sem numeração"}
										</p>
										{document.serie ? <p className="text-xs text-muted-foreground">Série {document.serie}</p> : null}
									</div>
								</div>
								<span className="shrink-0 rounded-full bg-card px-2 py-1 text-[11px] font-bold text-muted-foreground shadow-2xs">
									{document.statusInterno}
								</span>
							</div>
						))}
					</div>
				) : (
					<EmptyDetail icon={<ReceiptText className="size-5" />} text="Nenhum documento fiscal emitido." compact />
				)}
			</OperationalSection>

			{sale.observacoes || sale.pagamentoObservacoes ? (
				<section className="rounded-2xl border border-brand/35 bg-brand/10 px-4 py-4">
					<div className="mb-3 flex items-center gap-2 text-foreground">
						<div className="flex size-8 items-center justify-center rounded-xl bg-brand text-brand-foreground shadow-sm">
							<MessageSquareText className="size-4" />
						</div>
						<h2 className="text-xs font-extrabold uppercase tracking-wide">Observações</h2>
					</div>
					<div className="space-y-2">
						{sale.observacoes ? <DetailLine label="Pedido" value={sale.observacoes} /> : null}
						{sale.pagamentoObservacoes ? <DetailLine label="Pagamento" value={sale.pagamentoObservacoes} /> : null}
					</div>
				</section>
			) : null}

			<SaleActionsFooter sale={sale} canEditSales={canEditSales} canDeleteSales={canDeleteSales} />
		</div>
	);
}

// Ações da venda no rodapé do painel operacional: edição (quando a política permite, com a razão
// do bloqueio em microcopy quando não) e cancelamento com estorno. As razões vêm do backend
// (bloco `editabilidade`) — nunca duplicadas aqui.
function SaleActionsFooter({
	sale,
	canEditSales,
	canDeleteSales,
}: {
	sale: TGetSalesFulfillmentOutputById;
	canEditSales?: boolean;
	canDeleteSales?: boolean;
}) {
	const [cancelDialogIsOpen, setCancelDialogIsOpen] = useState(false);
	const editability = sale.editabilidade;
	const showEdit = !!canEditSales && (editability.nivel === "TOTAL" || editability.rascunho || editability.motivos.length > 0);
	const showCancel = !!canDeleteSales && editability.cancelamentoDisponivel;
	if (!showEdit && !showCancel) return null;

	const editHref = editability.rascunho ? `/dashboard/commercial/sales/checkout/${sale.id}` : `/dashboard/commercial/sales/edit/${sale.id}`;
	const editIsEnabled = editability.nivel === "TOTAL" || editability.rascunho;

	return (
		<section className="rounded-2xl border border-border bg-card px-4 py-4 shadow-2xs">
			<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex flex-col gap-1">
					{showEdit && !editIsEnabled ? <p className="text-xs text-muted-foreground">{editability.motivos[0]}</p> : null}
				</div>
				<div className="flex items-center gap-2">
					{showCancel ? (
						<Button variant="ghost-destructive" onClick={() => setCancelDialogIsOpen(true)}>
							<CircleX className="size-4" />
							CANCELAR VENDA
						</Button>
					) : null}
					{showEdit ? (
						editIsEnabled ? (
							<Button asChild>
								<Link href={editHref}>
									<PencilLine className="size-4" />
									{editability.rascunho ? "ABRIR CHECKOUT" : "EDITAR VENDA"}
								</Link>
							</Button>
						) : (
							<Button disabled>
								<PencilLine className="size-4" />
								EDITAR VENDA
							</Button>
						)
					) : null}
				</div>
			</div>
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
		</section>
	);
}

function OrderSummary({ sale }: { sale: TGetSalesFulfillmentOutputById }) {
	const phoneLinks = sale.cliente?.telefone ? getCustomerPhoneLinks(sale.cliente.telefone) : null;
	const attendance = getAttendanceMeta(sale.statusAtendimento, sale.entregaModalidade);
	const financial = FINANCIAL_META[sale.financeiro];
	const fiscal = FISCAL_META[sale.fiscal];

	return (
		<section className="overflow-hidden rounded-2xl bg-brand-secondary text-brand-secondary-foreground shadow-lg shadow-brand-secondary/20">
			<div className="flex flex-col justify-between gap-5 px-4 py-4 sm:flex-row sm:items-end sm:px-5 sm:py-5">
				<div className="min-w-0">
					<div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-bold">
						<span className="rounded-full bg-brand-secondary-foreground/12 px-2.5 py-1">ATENDIMENTO</span>
						{sale.integracaoCanal || sale.canal ? (
							<span className="rounded-full bg-brand px-2.5 py-1 text-brand-foreground shadow-sm">{sale.integracaoCanal ?? sale.canal}</span>
						) : null}
						{sale.dataVenda ? <span className="font-medium text-brand-secondary-foreground/75">{formatDateAsLocale(sale.dataVenda, true)}</span> : null}
					</div>
					<div className="flex items-center gap-3">
						<div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-secondary-foreground/12">
							<CircleUser className="size-5" />
						</div>
						<div className="min-w-0">
							<h2 className="truncate text-lg font-extrabold tracking-tight sm:text-xl">{sale.cliente?.nome ?? "Ao consumidor"}</h2>
							{sale.cliente?.telefone ? (
								<p className="mt-0.5 flex items-center gap-1.5 text-sm text-brand-secondary-foreground/75">
									<Phone className="size-3.5" />
									{formatToPhone(sale.cliente.telefone)}
								</p>
							) : null}
						</div>
					</div>
					{phoneLinks ? (
						<div className="mt-3 flex flex-wrap gap-2 sm:ml-14">
							<a
								href={phoneLinks.tel}
								className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-brand-secondary-foreground/15 bg-brand-secondary-foreground/10 px-3.5 text-xs font-extrabold transition-colors hover:bg-brand-secondary-foreground/18 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-secondary-foreground/80 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-secondary"
								aria-label={`Ligar para ${sale.cliente?.nome ?? "o cliente"}`}
							>
								<PhoneCall className="size-4" />
								LIGAR
							</a>
							<a
								href={phoneLinks.whatsapp}
								target="_blank"
								rel="noreferrer"
								className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand px-3.5 text-xs font-extrabold text-brand-foreground shadow-sm transition-[filter,transform] hover:brightness-105 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-foreground/80 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-secondary"
								aria-label={`Conversar com ${sale.cliente?.nome ?? "o cliente"} no WhatsApp`}
							>
								<FaWhatsapp className="size-4" />
								WHATSAPP
							</a>
						</div>
					) : null}
				</div>

				<div className="shrink-0 sm:text-right">
					<p className="text-xs font-bold uppercase tracking-wide text-brand-secondary-foreground/70">Total do pedido</p>
					<p className="mt-0.5 text-3xl font-black tracking-tight tabular-nums">{formatToMoney(sale.valorTotal)}</p>
					<div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs sm:justify-end">
						{sale.descontosTotal && sale.descontosTotal > 0 ? <span className="text-brand">-{formatToMoney(sale.descontosTotal)} em descontos</span> : null}
						{sale.acrescimosTotal && sale.acrescimosTotal > 0 ? (
							<span className="text-brand-secondary-foreground/75">+{formatToMoney(sale.acrescimosTotal)} em acréscimos</span>
						) : null}
					</div>
				</div>
			</div>

			<div className="flex flex-wrap gap-2 border-t border-brand-secondary-foreground/10 bg-brand-secondary-foreground/6 px-4 py-3 sm:px-5">
				<SummaryStatus icon={attendance.icon}>{attendance.label}</SummaryStatus>
				<SummaryStatus icon={financial?.icon} tone={sale.financeiro === "EM_ATRASO" ? "danger" : sale.financeiro === "RECEBIDA" ? "success" : "default"}>
					{financial?.label ?? sale.financeiro}
				</SummaryStatus>
				<SummaryStatus
					icon={fiscal?.icon}
					tone={["REJEITADO", "ERRO"].includes(sale.fiscal) ? "danger" : sale.fiscal === "AUTORIZADO" ? "success" : "default"}
				>
					{fiscal?.label ?? sale.fiscal}
				</SummaryStatus>
			</div>
		</section>
	);
}

function SummaryStatus({ children, icon, tone = "default" }: { children: ReactNode; icon?: ReactNode; tone?: "default" | "success" | "danger" }) {
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold",
				tone === "default" && "border-brand-secondary-foreground/15 bg-brand-secondary-foreground/10",
				tone === "success" && "border-green-200/30 bg-green-100 text-green-700",
				tone === "danger" && "border-red-200/30 bg-red-100 text-red-700",
			)}
		>
			{icon ?? <span className="size-1.5 rounded-full bg-current opacity-70" />}
			{children}
		</span>
	);
}

function getAttendanceMeta(status: string, deliveryMode: string | null) {
	if (status === "PRONTO") {
		if (deliveryMode === "RETIRADA") return { label: "Pronto para retirada", icon: <PackageCheck className="size-3.5" /> };
		if (deliveryMode === "ENTREGA") return { label: "Pronto para despacho", icon: <PackageCheck className="size-3.5" /> };
	}

	return ATTENDANCE_META[status] ?? { label: status, icon: <Clock3 className="size-3.5" /> };
}

function getCustomerPhoneLinks(phone: string) {
	const digits = phone.replace(/\D/g, "");
	if (digits.length < 10) return null;

	const internationalNumber = digits.length <= 11 ? `55${digits}` : digits;

	return {
		tel: `tel:+${internationalNumber}`,
		whatsapp: `https://wa.me/${internationalNumber}`,
	};
}

function OperationalSection({ title, icon, count, children }: { title: string; icon: ReactNode; count?: number; children: ReactNode }) {
	return (
		<section className="rounded-2xl border border-border bg-card p-4 shadow-2xs sm:p-5">
			<div className="mb-4 flex min-h-9 items-center gap-2.5">
				<div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-secondary/10 text-brand-secondary">{icon}</div>
				<h2 className="text-xs font-extrabold uppercase tracking-wide">{title}</h2>
				{count !== undefined ? (
					<span className="inline-flex size-6 items-center justify-center rounded-full bg-brand-secondary text-xs font-extrabold tabular-nums text-brand-secondary-foreground shadow-sm">
						{count}
					</span>
				) : null}
			</div>
			{children}
		</section>
	);
}

function SaleItemRow({ item, reveal }: { item: TGetSalesFulfillmentOutputById["itens"][number]; reveal: boolean }) {
	const imageUrl = item.produtoVariante?.imagemCapaUrl ?? item.produto?.imagemCapaUrl ?? null;
	const hasDiscount = item.valorTotalDesconto > 0;

	return (
		<div
			className={cn(
				"group/item flex gap-3 border-b border-border/60 py-3 first:pt-0 last:border-b-0 last:pb-0 sm:gap-4",
				reveal && "animate-in fade-in-0 slide-in-from-top-1 duration-200 motion-reduce:animate-none",
			)}
		>
			<div className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-border/60 bg-secondary sm:size-20">
				{imageUrl ? (
					<Image src={imageUrl} alt={item.produto?.nome ?? "Produto do pedido"} fill sizes="80px" className="object-cover" />
				) : (
					<div className="flex h-full w-full items-center justify-center bg-brand-secondary/8 text-brand-secondary/45">
						<Package className="size-7" />
					</div>
				)}
			</div>

			<div className="min-w-0 flex-1">
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0">
						<div className="flex items-start gap-2">
							<span className="inline-flex min-w-7 shrink-0 items-center justify-center rounded-lg bg-brand-secondary/10 px-1.5 py-1 text-xs font-extrabold tabular-nums text-brand-secondary">
								{item.quantidade}x
							</span>
							<div className="min-w-0">
								<h3 className="line-clamp-2 text-sm font-extrabold leading-snug tracking-tight sm:text-base">{item.produto?.nome ?? "Produto"}</h3>
								<div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-xs font-medium text-muted-foreground">
									{item.produtoVariante?.nome ? <span className="text-foreground/75">{item.produtoVariante.nome}</span> : null}
									{item.produto?.codigo ? <span>Cód. {item.produto.codigo}</span> : null}
									{item.produto?.unidade ? <span>{item.produto.unidade}</span> : null}
								</div>
							</div>
						</div>
					</div>

					<div className="shrink-0 text-right">
						<p className="text-base font-black tabular-nums sm:text-lg">{formatToMoney(item.valorVendaTotalLiquido)}</p>
						{hasDiscount ? <p className="text-xs tabular-nums text-muted-foreground line-through">{formatToMoney(item.valorVendaTotalBruto)}</p> : null}
					</div>
				</div>

				{item.adicionais.length > 0 ? (
					<div className="mt-2.5 rounded-xl bg-secondary/65 px-3 py-2">
						<p className="mb-1.5 text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground">Adicionais</p>
						<ul className="space-y-1.5">
							{item.adicionais.map((additional) => (
								<li key={additional.id} className="flex items-center justify-between gap-3 text-xs sm:text-sm">
									<span className="min-w-0 truncate text-muted-foreground">
										{additional.quantidade > 1 ? `${additional.quantidade}x ` : null}
										{additional.opcao?.nome ?? "Adicional"}
									</span>
									{additional.valorTotal !== 0 ? (
										<span className="shrink-0 font-bold tabular-nums">+{formatToMoney(additional.valorTotal)}</span>
									) : (
										<span className="shrink-0 text-muted-foreground">Incluso</span>
									)}
								</li>
							))}
						</ul>
					</div>
				) : null}
			</div>
		</div>
	);
}

function getPaymentState(payment: TGetSalesFulfillmentOutputById["pagamentos"][number]) {
	if (payment.dataEfetivacao) {
		return { label: `Recebido em ${formatDateAsLocale(payment.dataEfetivacao, true)}`, className: "text-green-700 dark:text-green-400" };
	}
	if (payment.provedorStatus === "CANCELADO" || payment.provedorStatus === "ESTORNADO") {
		return { label: "Cancelado ou estornado", className: "text-destructive" };
	}
	return { label: "Pendente", className: "text-muted-foreground" };
}

function EmptyDetail({ icon, text, compact = false }: { icon: ReactNode; text: string; compact?: boolean }) {
	return (
		<div
			className={cn("flex items-center gap-3 rounded-xl bg-secondary/55 px-3 py-3 text-muted-foreground", !compact && "justify-center py-6 text-center")}
		>
			<span className="shrink-0 text-brand-secondary/60">{icon}</span>
			<p className="text-sm font-medium">{text}</p>
		</div>
	);
}

function DetailLine({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-start gap-2 text-sm">
			<span className="shrink-0 font-extrabold">{label}:</span>
			<span className="min-w-0 whitespace-pre-wrap font-medium text-foreground/80">{value}</span>
		</div>
	);
}

function DeliveryAddress({ location }: { location: NonNullable<TGetSalesFulfillmentOutputById["entregaLocalizacao"]> }) {
	const firstLine = [location.localizacaoLogradouro, location.localizacaoNumero].filter(Boolean).join(", ");
	const secondLine = [location.localizacaoBairro, location.localizacaoCidade, location.localizacaoEstado].filter(Boolean).join(" · ");

	return (
		<div className="flex items-start gap-3 rounded-xl bg-secondary/55 px-3 py-3 text-sm">
			<div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-card text-brand-secondary shadow-2xs">
				<MapPin className="size-4" />
			</div>
			<div className="min-w-0">
				{location.titulo ? <p className="font-extrabold">{location.titulo}</p> : null}
				{firstLine ? <p className="mt-0.5 font-medium">{firstLine}</p> : null}
				{location.localizacaoComplemento ? <p className="text-muted-foreground">{location.localizacaoComplemento}</p> : null}
				{secondLine ? <p className="mt-1 text-xs text-muted-foreground">{secondLine}</p> : null}
				{location.localizacaoCep ? <p className="text-xs tabular-nums text-muted-foreground">CEP {location.localizacaoCep}</p> : null}
			</div>
		</div>
	);
}
