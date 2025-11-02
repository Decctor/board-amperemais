import StatUnitCard from "@/components/Stats/StatUnitCard";
import ResponsiveMenuViewOnly from "@/components/Utils/ResponsiveMenuViewOnly";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDecimalPlaces, formatNameAsInitials, formatToDateTime, formatToMoney } from "@/lib/formatting";
import { useSellerStats } from "@/lib/queries/sellers";
import type { TGetSellerStatsOutput } from "@/pages/api/sellers/stats";
import type { TUserSession } from "@/schemas/users";
import { CalendarDays, ChartArea, DollarSign, ListOrdered, Mail, Phone, ShoppingCart, User } from "lucide-react";

type ViewSellerResultsProps = {
	sellerId: string;
	session: TUserSession;
	closeModal: () => void;
};

function ViewSellerResults({ sellerId, session, closeModal }: ViewSellerResultsProps) {
	const {
		data: stats,
		isLoading,
		isError,
		isSuccess,
		error,
	} = useSellerStats({ sellerId, initialFilters: { periodAfter: null, periodBefore: null } });
	return (
		<ResponsiveMenuViewOnly
			menuTitle="RESULTADOS DO VENDEDOR"
			menuDescription="Visualize aqui os resultados do vendedor..."
			menuCancelButtonText="FECHAR"
			closeMenu={closeModal}
			stateIsLoading={isLoading}
		>
			{isSuccess ? (
				<>
					<ViewSellerResultsHeader seller={stats.seller} />
					<ViewSellerResultsQuantitative quantitative={stats.quantitative} firstSaleDate={stats.firstSaleDate} lastSaleDate={stats.lastSaleDate} />
					<ViewSellerResultsQualitative qualitative={stats.qualitative} />
				</>
			) : null}
		</ResponsiveMenuViewOnly>
	);
}
export default ViewSellerResults;

function ViewSellerResultsHeader({ seller }: { seller: TGetSellerStatsOutput["data"]["seller"] }) {
	return (
		<div className="flex w-full flex-col gap-3">
			<div className="flex w-fit items-center gap-2 rounded bg-primary/20 px-2 py-1">
				<User className="h-4 min-h-4 w-4 min-w-4" />
				<h1 className="w-fit text-start font-medium text-xs tracking-tight">VENDEDOR</h1>
			</div>
			<div className="flex w-full flex-col gap-1.5">
				<div className="w-full flex items-center gap-1.5">
					<Avatar className="w-6 h-6 min-w-6 min-h-6">
						<AvatarImage src={seller.avatarUrl ?? undefined} />
						<AvatarFallback>{formatNameAsInitials(seller.name)}</AvatarFallback>
					</Avatar>
					<h3 className="text-sm font-semibold tracking-tighter text-primary/80">VENDEDOR</h3>
					<h3 className="text-sm font-semibold">{seller.name}</h3>
				</div>
				<div className="w-full flex items-center gap-1.5">
					<Phone className="w-3 min-w-3 h-3 min-h-3" />
					<h3 className="text-sm font-semibold tracking-tighter text-primary/80">TELEFONE</h3>
					<h3 className="text-sm font-semibold">{seller.phone ?? "NÃO INFORMADO"}</h3>
				</div>
				<div className="w-full flex items-center gap-1.5">
					<Mail className="w-3 min-w-3 h-3 min-h-3" />
					<h3 className="text-sm font-semibold tracking-tighter text-primary/80">EMAIL</h3>
					<h3 className="text-sm font-semibold">{seller.email ?? "NÃO INFORMADO"}</h3>
				</div>
			</div>
		</div>
	);
}
function ViewSellerResultsQuantitative({
	quantitative,
	firstSaleDate,
	lastSaleDate,
}: {
	quantitative: TGetSellerStatsOutput["data"]["quantitative"];
	firstSaleDate: TGetSellerStatsOutput["data"]["firstSaleDate"];
	lastSaleDate: TGetSellerStatsOutput["data"]["lastSaleDate"];
}) {
	return (
		<div className="flex w-full flex-col gap-3">
			<div className="flex w-fit items-center gap-2 rounded bg-primary/20 px-2 py-1">
				<ChartArea className="h-4 min-h-4 w-4 min-w-4" />
				<h1 className="w-fit text-start font-medium text-xs tracking-tight">QUANTITATIVO</h1>
			</div>
			<div className="flex w-full flex-col gap-1.5">
				<StatUnitCard
					title="NÚMERO DE VENDAS"
					icon={<ListOrdered className="w-4 h-4 min-w-4 min-h-4" />}
					current={{ value: quantitative.salesCount || 0, format: (n) => formatDecimalPlaces(n) }}
					className="w-full"
				/>
				<StatUnitCard
					title="VALOR TOTAL DE VENDAS"
					icon={<DollarSign className="w-4 h-4 min-w-4 min-h-4" />}
					current={{ value: quantitative.totalSalesValue || 0, format: (n) => formatToMoney(n) }}
					className="w-full"
				/>
				<StatUnitCard
					title="TICKET MÉDIO"
					icon={<ShoppingCart className="w-4 h-4 min-w-4 min-h-4" />}
					current={{ value: quantitative.avgTicket || 0, format: (n) => formatToMoney(n) }}
					className="w-full"
				/>
			</div>
		</div>
	);
}

function ViewSellerResultsQualitative({ qualitative }: { qualitative: TGetSellerStatsOutput["data"]["qualitative"] }) {
	return (
		<div className="flex w-full flex-col gap-3">
			<div className="flex w-fit items-center gap-2 rounded bg-primary/20 px-2 py-1">
				<ChartArea className="h-4 min-h-4 w-4 min-w-4" />
				<h1 className="w-fit text-start font-medium text-xs tracking-tight">QUALITATIVOS</h1>
			</div>

			<div className="flex w-full flex-col gap-2">
				<h2 className="text-xs font-medium tracking-tight uppercase">TOP CLIENTES</h2>
				<div className="overflow-hidden rounded border bg-card shadow-xs">
					<table className="w-full text-xs">
						<thead>
							<tr className="bg-muted/40 text-left">
								<th className="px-3 py-2 font-medium">CLIENTE</th>
								<th className="px-3 py-2 font-medium text-right">QTDE</th>
								<th className="px-3 py-2 font-medium text-right">TOTAL</th>
							</tr>
						</thead>
						<tbody>
							{qualitative.byClientTop10.map((row) => (
								<tr key={row.clientId} className="border-t">
									<td className="px-3 py-2">{row.clientName || row.clientId}</td>
									<td className="px-3 py-2 text-right">{formatDecimalPlaces(row.quantity)}</td>
									<td className="px-3 py-2 text-right">{formatToMoney(row.total)}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>

			<div className="flex w-full flex-col gap-2">
				<h2 className="text-xs font-medium tracking-tight uppercase">TOP PRODUTOS</h2>
				<div className="overflow-hidden rounded border bg-card shadow-xs">
					<table className="w-full text-xs">
						<thead>
							<tr className="bg-muted/40 text-left">
								<th className="px-3 py-2 font-medium">PRODUTO</th>
								<th className="px-3 py-2 font-medium">GRUPO</th>
								<th className="px-3 py-2 font-medium text-right">QTDE</th>
								<th className="px-3 py-2 font-medium text-right">TOTAL</th>
							</tr>
						</thead>
						<tbody>
							{qualitative.byProductTop10.map((row) => (
								<tr key={row.productId} className="border-t">
									<td className="px-3 py-2">{row.productDescription}</td>
									<td className="px-3 py-2">{row.productGroup || "-"}</td>
									<td className="px-3 py-2 text-right">{formatDecimalPlaces(row.quantity)}</td>
									<td className="px-3 py-2 text-right">{formatToMoney(row.total)}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>

			<div className="flex w-full flex-col gap-3">
				<h2 className="text-xs font-medium tracking-tight uppercase">TOP CATEGORIAS DE PRODUTO</h2>
				<div className="w-full flex flex-col gap-1.5">
					{qualitative.byProductCategoryTop10.map((row, idx) => (
						<div key={`${row.category}-${idx}`} className="flex items-center justify-between rounded border bg-card px-3 py-2 text-xs shadow-xs">
							<span className="font-medium">{row.category || "NÃO CATEGORIZADO"}</span>
							<span className="font-semibold">{formatDecimalPlaces(row.quantity)}</span>
							<span className="font-semibold">{formatToMoney(row.total || 0)}</span>
						</div>
					))}
				</div>
			</div>

			<div className="flex w-full flex-col gap-2">
				<h2 className="text-xs font-medium tracking-tight uppercase">POR DIA DO MÊS</h2>
				<div className="overflow-hidden rounded border bg-card shadow-xs">
					<table className="w-full text-xs">
						<thead>
							<tr className="bg-muted/40 text-left">
								<th className="px-3 py-2 font-medium">DIA</th>
								<th className="px-3 py-2 font-medium text-right">QTDE</th>
								<th className="px-3 py-2 font-medium text-right">TOTAL</th>
							</tr>
						</thead>
						<tbody>
							{qualitative.byDayOfMonth.map((row) => (
								<tr key={row.day} className="border-t">
									<td className="px-3 py-2">{row.day}</td>
									<td className="px-3 py-2 text-right">{formatDecimalPlaces(row.quantity)}</td>
									<td className="px-3 py-2 text-right">{formatToMoney(row.total)}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>

			<div className="flex w-full flex-col gap-2">
				<h2 className="text-xs font-medium tracking-tight uppercase">POR MÊS</h2>
				<div className="overflow-hidden rounded border bg-card shadow-xs">
					<table className="w-full text-xs">
						<thead>
							<tr className="bg-muted/40 text-left">
								<th className="px-3 py-2 font-medium">MÊS</th>
								<th className="px-3 py-2 font-medium text-right">QTDE</th>
								<th className="px-3 py-2 font-medium text-right">TOTAL</th>
							</tr>
						</thead>
						<tbody>
							{qualitative.byMonth.map((row) => (
								<tr key={row.month} className="border-t">
									<td className="px-3 py-2">{row.month}</td>
									<td className="px-3 py-2 text-right">{formatDecimalPlaces(row.quantity)}</td>
									<td className="px-3 py-2 text-right">{formatToMoney(row.total)}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}
