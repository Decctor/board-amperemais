import UnauthorizedPage from "@/components/Utils/UnauthorizedPage";
import { Button } from "@/components/ui/button";
import { getCurrentSession } from "@/lib/authentication/session";
import { formatDateAsLocale, formatDecimalPlaces } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import { db } from "@/services/drizzle";
import { productStockLots } from "@/services/drizzle/schema";
import { and, eq } from "drizzle-orm";
import { ArrowLeft, CalendarClock, Factory, PackageSearch, Printer, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

const STOCK_LOT_STATUS_CONFIG = {
	ATIVO: { label: "Ativo", className: "bg-green-100 text-green-700" },
	ESGOTADO: { label: "Esgotado", className: "bg-muted text-muted-foreground" },
	VENCIDO: { label: "Vencido", className: "bg-destructive/10 text-destructive" },
	DESCARTADO: { label: "Descartado", className: "bg-yellow-100 text-yellow-800" },
} as const;

type StockLotDetailPageProps = {
	params: Promise<{
		id: string;
	}>;
};

export default async function StockLotDetailPage({ params }: StockLotDetailPageProps) {
	const sessionUser = await getCurrentSession();
	if (!sessionUser) redirect("/auth/signin");
	if (!sessionUser.membership) redirect("/onboarding");
	if (!sessionUser.membership.organizacao.configuracao.recursos.erp.acesso) {
		return <UnauthorizedPage message="Oops, sua organização não possui acesso a este recurso." />;
	}

	const { id } = await params;
	const stockLot = await db.query.productStockLots.findFirst({
		where: and(eq(productStockLots.id, id), eq(productStockLots.organizacaoId, sessionUser.membership.organizacao.id)),
		with: {
			produto: { columns: { id: true, nome: true, codigo: true, unidade: true } },
			produtoVariante: { columns: { id: true, nome: true, codigo: true } },
			producao: { columns: { id: true, titulo: true, dataConclusao: true } },
			compra: { columns: { id: true, titulo: true } },
		},
	});

	if (!stockLot) notFound();

	const statusEfetivo = getEffectiveStatus(stockLot);
	const statusConfig = STOCK_LOT_STATUS_CONFIG[statusEfetivo];
	const productName = stockLot.produtoVariante?.nome ?? stockLot.produto.nome;
	const productCode = stockLot.produtoVariante?.codigo ?? stockLot.produto.codigo;
	const printHref = `/dashboard/operational/stock-lots/labels/preview?ids=${encodeURIComponent(stockLot.id)}`;

	return (
		<div className="flex w-full flex-col gap-4">
			<div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
				<div className="flex min-w-0 gap-3">
					<Button variant="outline" size="icon-sm" asChild>
						<Link href="/dashboard/operational/stock-lots" aria-label="Voltar para lotes">
							<ArrowLeft className="h-4 w-4" />
						</Link>
					</Button>
					<div className="min-w-0">
						<div className="flex flex-wrap items-center gap-2">
							<h1 className="text-lg font-black tracking-tight">{productName}</h1>
							<span className={cn("rounded-full px-2 py-0.5 text-[0.65rem] font-semibold", statusConfig.className)}>{statusConfig.label}</span>
						</div>
						<p className="text-sm text-muted-foreground">
							{stockLot.codigoLote ? `Lote ${stockLot.codigoLote}` : "Lote sem código"}
							{productCode ? ` · Código ${productCode}` : ""}
						</p>
					</div>
				</div>
				<Button size="sm" asChild>
					<Link href={printHref} target="_blank">
						<Printer className="h-4 w-4" />
						IMPRIMIR ETIQUETA
					</Link>
				</Button>
			</div>

			<section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
				<MetricCard label="Saldo atual" value={`${formatDecimalPlaces(stockLot.quantidadeAtual)} ${stockLot.produto.unidade}`} icon={<PackageSearch />} />
				<MetricCard label="Quantidade inicial" value={`${formatDecimalPlaces(stockLot.quantidadeInicial)} ${stockLot.produto.unidade}`} icon={<PackageSearch />} />
				<MetricCard label="Fabricação" value={formatDateAsLocale(stockLot.dataFabricacao, true) ?? "Não informada"} icon={<Factory />} />
				<MetricCard label="Validade" value={formatDateAsLocale(stockLot.dataValidade, false) ?? "Sem validade"} icon={<CalendarClock />} />
			</section>

			<section className="grid gap-3 lg:grid-cols-2">
				<div className="rounded-xl border border-border bg-card p-4">
					<h2 className="text-sm font-bold tracking-tight">Produto</h2>
					<div className="mt-3 grid gap-2 text-sm">
						<InfoRow label="Produto" value={stockLot.produto.nome} />
						<InfoRow label="Variante" value={stockLot.produtoVariante?.nome ?? "Sem variante"} />
						<InfoRow label="Código" value={productCode} />
						<InfoRow label="Unidade" value={stockLot.produto.unidade} />
					</div>
				</div>

				<div className="rounded-xl border border-border bg-card p-4">
					<h2 className="text-sm font-bold tracking-tight">Origem do lote</h2>
					<div className="mt-3 grid gap-2 text-sm">
						<InfoRow label="Produção" value={stockLot.producao?.titulo ?? "Sem produção vinculada"} />
						<InfoRow label="Compra" value={stockLot.compra?.titulo ?? "Sem compra vinculada"} />
						<InfoRow label="Criado em" value={formatDateAsLocale(stockLot.dataInsercao, true)} />
					</div>
					<div className="mt-4 flex flex-wrap gap-2">
						{stockLot.producao?.id ? (
							<span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1 text-xs font-medium text-muted-foreground">
								<Factory className="h-3.5 w-3.5" />
								{stockLot.producao.titulo}
							</span>
						) : null}
						{stockLot.compra?.id ? (
							<span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1 text-xs font-medium text-muted-foreground">
								<ShoppingCart className="h-3.5 w-3.5" />
								{stockLot.compra.titulo}
							</span>
						) : null}
					</div>
				</div>
			</section>
		</div>
	);
}

function MetricCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
	return (
		<div className="rounded-xl border border-border bg-card p-4">
			<div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
				<span className="[&_svg]:h-4 [&_svg]:w-4">{icon}</span>
				{label}
			</div>
			<p className="mt-2 text-base font-black tracking-tight">{value}</p>
		</div>
	);
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
	if (!value) return null;
	return (
		<div className="flex items-start justify-between gap-3 border-b border-border/70 pb-2 last:border-b-0 last:pb-0">
			<span className="text-muted-foreground">{label}</span>
			<span className="text-right font-semibold">{value}</span>
		</div>
	);
}

function getEffectiveStatus(stockLot: { status: string; dataValidade: Date | string | null; quantidadeAtual: number }) {
	const now = new Date();
	const validityDate = stockLot.dataValidade ? new Date(stockLot.dataValidade) : null;
	if (stockLot.status === "ATIVO" && validityDate && validityDate < now) return "VENCIDO";
	if (stockLot.status === "ATIVO" && stockLot.quantidadeAtual <= 0) return "ESGOTADO";
	return stockLot.status as keyof typeof STOCK_LOT_STATUS_CONFIG;
}
