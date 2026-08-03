import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCashbackValue, formatToMoney } from "@/lib/formatting";
import { type TPosAvailableReward, usePosAvailableRewards } from "@/lib/queries/cashback-programs";
import type { TCashbackProgramTerminologyEnum } from "@/schemas/enums";
import type { TUseSaleState } from "@/state-hooks/use-sale-state";
import { ChevronDown, ChevronUp, Gift, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

/** Busca tolerante a acentos e caixa, no mesmo idioma dos normalizadores da casa. */
function normalizeForSearch(value: string) {
	return value.trim().toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

type RewardRedemptionSectionProps = {
	saleState: TUseSaleState;
	clientId: string;
};

/**
 * Resgate de recompensa (prêmio) via saldo de cashback no PDV. A recompensa sai integralmente
 * de graça (o servidor constrói o item com 100% de desconto) e o saldo é debitado pelo valor
 * do prêmio em moeda cashback. Exclusiva com cupom e com desconto em cashback.
 */
export default function RewardRedemptionSection({ saleState, clientId }: RewardRedemptionSectionProps) {
	const [isListOpen, setIsListOpen] = useState(false);
	const [searchValue, setSearchValue] = useState("");
	const { data: rewardsData, isLoading } = usePosAvailableRewards({ clienteId: clientId });

	const appliedReward = saleState.state.recompensaResgate;
	const program = rewardsData?.program ?? null;
	const terminologia: TCashbackProgramTerminologyEnum = program?.terminologia ?? "DINHEIRO";
	const saldoDisponivel = rewardsData?.saldoValorDisponivel ?? 0;
	const rewards = useMemo(() => rewardsData?.rewards ?? [], [rewardsData?.rewards]);

	// Catálogo de prêmios chega inteiro do servidor: o filtro é local, sem round-trip por tecla.
	const filteredRewards = useMemo(() => {
		const term = normalizeForSearch(searchValue);
		if (!term) return rewards;
		return rewards.filter((reward) =>
			[reward.titulo, reward.descricao, reward.grupo].some((field) => (field ? normalizeForSearch(field).includes(term) : false)),
		);
	}, [rewards, searchValue]);

	// Revalida a recompensa aplicada contra o servidor: prêmio desativado, saldo insuficiente
	// ou valores alterados no catálogo removem/atualizam a seleção com aviso ao operador.
	useEffect(() => {
		if (!appliedReward || !rewardsData) return;
		const freshReward = rewardsData.rewards.find((reward) => reward.id === appliedReward.recompensaId);
		if (!freshReward || !freshReward.elegivel) {
			saleState.setRecompensaResgate(null);
			toast.warning("A recompensa selecionada deixou de estar disponível e foi removida.");
			return;
		}
		if (Math.abs(freshReward.valor - appliedReward.valor) > 0.01 || Math.abs(freshReward.valorVenda - appliedReward.valorVenda) > 0.01) {
			saleState.setRecompensaResgate({ ...appliedReward, valor: freshReward.valor, valorVenda: freshReward.valorVenda });
		}
	}, [appliedReward, rewardsData, saleState.setRecompensaResgate]);

	// A modalidade já é conferida pelo SummarySection (que monta ou não este bloco); aqui resta
	// o caso de organização com a modalidade ligada mas nenhum prêmio ativo cadastrado.
	if (!appliedReward && !isLoading && (!program?.modalidadeRecompensasPermitida || rewards.length === 0)) return null;

	if (appliedReward) {
		return (
			<div className="w-full flex flex-col gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2 py-2">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-1.5">
						<Gift className="w-3 h-3 text-amber-600" />
						<span className="text-xs font-semibold text-amber-600">RECOMPENSA — {appliedReward.titulo.toUpperCase()}</span>
					</div>
					<span className="text-xs font-bold text-amber-600">-{formatCashbackValue(appliedReward.valor, terminologia)}</span>
				</div>
				<div className="flex items-center justify-between text-[11px] text-amber-700">
					<span>
						Valor comercial: <span className="line-through">{formatToMoney(appliedReward.valorVenda)}</span> → GRÁTIS
					</span>
					<span>Não combinável com cupom ou desconto em cashback.</span>
				</div>
				<Button
					type="button"
					size="sm"
					variant="ghost"
					className="self-end flex items-center gap-1.5"
					onClick={() => saleState.setRecompensaResgate(null)}
				>
					<X className="w-3 h-3 min-w-3 min-h-3" />
					REMOVER RECOMPENSA
				</Button>
			</div>
		);
	}

	const eligibleCount = rewards.filter((reward) => reward.elegivel).length;

	// Fechar o painel limpa a busca: reabrir sempre parte do catálogo inteiro.
	function toggleList() {
		setIsListOpen((prev) => !prev);
		setSearchValue("");
	}

	return (
		<div className="w-full flex flex-col gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2 py-2">
			<button type="button" className="flex items-center justify-between cursor-pointer" onClick={toggleList}>
				<div className="flex items-center gap-1.5">
					<Gift className="w-3 h-3 text-amber-600" />
					<span className="text-xs font-semibold text-amber-600">
						{isLoading
							? "BUSCANDO RECOMPENSAS..."
							: eligibleCount > 0
								? `${eligibleCount} ${eligibleCount === 1 ? "RECOMPENSA RESGATÁVEL" : "RECOMPENSAS RESGATÁVEIS"}`
								: "NENHUMA RECOMPENSA RESGATÁVEL"}
					</span>
				</div>
				<div className="flex items-center gap-1.5">
					<span className="text-[11px] font-semibold text-amber-600">SALDO: {formatCashbackValue(saldoDisponivel, terminologia)}</span>
					{rewards.length > 0 ? isListOpen ? <ChevronUp className="w-3 h-3 text-amber-600" /> : <ChevronDown className="w-3 h-3 text-amber-600" /> : null}
				</div>
			</button>
			{isListOpen && program ? (
				<div className="w-full flex flex-col gap-1.5">
					<div className="relative">
						<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-amber-600/70" />
						<Input
							value={searchValue}
							onChange={(event) => setSearchValue(event.target.value)}
							placeholder="Buscar recompensa..."
							className="pl-8 h-8 text-xs border-amber-500/40"
						/>
					</div>
					{filteredRewards.length === 0 ? (
						<p className="text-[11px] text-amber-700 py-1">Nenhuma recompensa encontrada para a busca.</p>
					) : (
						filteredRewards.map((reward) => (
							<AvailableRewardCard
								key={reward.id}
								reward={reward}
								terminologia={terminologia}
								programaId={program.id}
								saleState={saleState}
								onApplied={() => {
									setIsListOpen(false);
									setSearchValue("");
								}}
							/>
						))
					)}
				</div>
			) : null}
		</div>
	);
}

function AvailableRewardCard({
	reward,
	terminologia,
	programaId,
	saleState,
	onApplied,
}: {
	reward: TPosAvailableReward;
	terminologia: TCashbackProgramTerminologyEnum;
	programaId: string;
	saleState: TUseSaleState;
	onApplied: () => void;
}) {
	function handleApply() {
		if (!reward.elegivel) return;
		if (saleState.state.cupomResgate || saleState.state.cashbackResgate > 0) {
			toast.warning("Cupom e desconto em cashback foram removidos: não são combináveis com resgate de recompensa.");
		}
		saleState.setRecompensaResgate({
			recompensaId: reward.id,
			programaId,
			titulo: reward.titulo,
			valor: reward.valor,
			valorVenda: reward.valorVenda,
			imagemCapaUrl: reward.imagemCapaUrl,
		});
		onApplied();
	}

	return (
		<div className="w-full flex flex-col gap-1 rounded-lg border border-border bg-card px-2 py-1.5">
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-2 min-w-0">
					{reward.imagemCapaUrl ? (
						<img src={reward.imagemCapaUrl} alt={reward.titulo} className="h-9 w-9 rounded-md object-cover shrink-0" />
					) : (
						<div className="h-9 w-9 rounded-md bg-amber-500/15 flex items-center justify-center shrink-0">
							<Gift className="w-4 h-4 text-amber-600" />
						</div>
					)}
					<div className="flex flex-col min-w-0">
						<span className="text-xs font-bold uppercase truncate">{reward.titulo}</span>
						<span className="text-[11px] text-muted-foreground uppercase">VALOR COMERCIAL: {formatToMoney(reward.valorVenda)}</span>
					</div>
				</div>
				<span className="text-xs font-bold text-amber-600 shrink-0">{formatCashbackValue(reward.valor, terminologia)}</span>
			</div>
			{!reward.elegivel && reward.motivo ? <p className="text-[11px] text-muted-foreground">{reward.motivo}</p> : null}
			<Button type="button" size="sm" variant="ghost" className="self-end" disabled={!reward.elegivel} onClick={handleApply}>
				RESGATAR RECOMPENSA
			</Button>
		</div>
	);
}
