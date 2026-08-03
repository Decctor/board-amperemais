import { Button } from "@/components/ui/button";
import { formatToMoney } from "@/lib/formatting";
import type { TSalePricingDrift } from "@/lib/sales/sale-pricing-validation";
import { PackageX, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";

type PricingDriftBannerProps = {
	pricing: TSalePricingDrift;
	onReprice: () => void;
	isRepricing?: boolean;
};

/**
 * Bloqueio explicável de preços defasados.
 *
 * Um orçamento antigo confirmado ao preço congelado é perda de margem silenciosa, então a
 * confirmação é recusada. Recusar sem dizer o quê nem oferecer o conserto seria só um erro no
 * caminho: a lista nomeia item a item o que mudou, e a ação resolve em um clique.
 *
 * Item fora do catálogo não tem conserto por reprecificação — só saindo do carrinho —, então ele é
 * separado do resto e não conta para a ação.
 */
export default function PricingDriftBanner({ pricing, onReprice, isRepricing }: PricingDriftBannerProps) {
	const indisponiveis = pricing.itens.filter((item) => item.indisponivel);
	const reprecificaveis = pricing.itens.filter((item) => item.divergente && !item.indisponivel);

	if (indisponiveis.length === 0 && reprecificaveis.length === 0) return null;

	const deltaTotal =
		pricing.totalBrutoAtual != null && reprecificaveis.length > 0 ? pricing.totalBrutoAtual - pricing.totalBrutoSalvo : null;

	return (
		<div className="flex w-full flex-col gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-3">
			<div className="flex flex-col gap-1">
				<h3 className="text-xs font-bold tracking-wide">
					{indisponiveis.length > 0 && reprecificaveis.length === 0 ? "ITENS FORA DO CATÁLOGO" : "PREÇOS DESATUALIZADOS"}
				</h3>
				<p className="text-[11px] text-muted-foreground">
					{reprecificaveis.length > 0
						? "Este orçamento guarda preços que mudaram no catálogo. Atualize antes de confirmar."
						: "Há itens que saíram do catálogo. Remova-os do carrinho para confirmar a venda."}
				</p>
			</div>

			<ul className="flex flex-col gap-1.5">
				{reprecificaveis.map((item) => {
					const subiu = (item.valorUnitarioAtual ?? 0) > item.valorUnitarioSalvo;
					return (
						<li key={item.itemId} className="flex items-center justify-between gap-2 text-[11px]">
							<span className="min-w-0 truncate font-medium">{item.nome}</span>
							<span className="flex shrink-0 items-center gap-1.5 tabular-nums">
								<span className="text-muted-foreground line-through">{formatToMoney(item.valorUnitarioSalvo)}</span>
								{subiu ? <TrendingUp className="h-3 w-3 text-amber-600" /> : <TrendingDown className="h-3 w-3 text-amber-600" />}
								<span className="font-bold">{formatToMoney(item.valorUnitarioAtual ?? 0)}</span>
							</span>
						</li>
					);
				})}

				{indisponiveis.map((item) => (
					<li key={item.itemId} className="flex items-center justify-between gap-2 text-[11px]">
						<span className="min-w-0 truncate font-medium">{item.nome}</span>
						<span className="flex shrink-0 items-center gap-1.5 font-bold text-destructive">
							<PackageX className="h-3 w-3" />
							FORA DO CATÁLOGO
						</span>
					</li>
				))}
			</ul>

			{reprecificaveis.length > 0 ? (
				<div className="flex items-center justify-between gap-2">
					{deltaTotal != null ? (
						<span className="text-[11px] tabular-nums text-muted-foreground">
							Total {deltaTotal > 0 ? "sobe" : "cai"} {formatToMoney(Math.abs(deltaTotal))}
						</span>
					) : (
						<span />
					)}
					<Button
						type="button"
						size="fit"
						variant="ghost-brand"
						className="gap-1.5 rounded-lg px-2 py-1 text-xs"
						onClick={onReprice}
						disabled={isRepricing}
					>
						<RefreshCw className="h-3.5 w-3.5" />
						ATUALIZAR PREÇOS
					</Button>
				</div>
			) : null}
		</div>
	);
}
