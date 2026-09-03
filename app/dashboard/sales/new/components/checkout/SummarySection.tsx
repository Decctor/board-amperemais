import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { formatToMoney } from "@/lib/formatting";
import { evaluateDiscount, getDiscountCeiling, type TDiscountAuthority } from "@/lib/permissions/discounts";
import { useClientCashbackBalance } from "@/lib/queries/cashback-programs";
import type { TCashbackProgramEntity } from "@/services/drizzle/schema";
import type { TUseSaleState } from "@/state-hooks/use-sale-state";
import { DollarSign, Minus, Plus, ShieldAlert, Wallet } from "lucide-react";
import { useEffect } from "react";
import CouponRedemptionSection from "./CouponRedemptionSection";
import RewardRedemptionSection from "./RewardRedemptionSection";

type CashbackRedemptionBlockProps = {
	saleState: TUseSaleState;
	clientId: string;
	organizationCashbackProgram: TCashbackProgramEntity | null;
};

function CashbackRedemptionBlock({ saleState, clientId, organizationCashbackProgram }: CashbackRedemptionBlockProps) {
	const { data: clientCashbackBalance, isLoading: isCashbackBalanceLoading } = useClientCashbackBalance({
		clienteId: clientId,
	});

	const cashbackSaldoDisponivel = clientCashbackBalance?.saldoValorDisponivel ?? 0;
	const cashbackMaxByRule = (() => {
		if (!organizationCashbackProgram?.resgateLimiteTipo || organizationCashbackProgram.resgateLimiteValor === null) {
			return Number.POSITIVE_INFINITY;
		}
		if (organizationCashbackProgram.resgateLimiteTipo === "FIXO") {
			return Math.max(0, organizationCashbackProgram.resgateLimiteValor);
		}
		return Math.max(0, (saleState.valorAntesCashback * organizationCashbackProgram.resgateLimiteValor) / 100);
	})();
	const cashbackResgateMaximo = Math.max(0, Math.min(cashbackSaldoDisponivel, cashbackMaxByRule, saleState.valorAntesCashback));
	// Programa ausente/inativo e modalidade de desconto desabilitada não chegam aqui: o bloco
	// inteiro não é montado nesses casos (ver SummarySection).
	const cashbackDisabledReason = saleState.state.recompensaResgate
		? "Remova a recompensa para aplicar desconto em cashback."
		: cashbackSaldoDisponivel <= 0
			? "Cliente sem saldo de cashback disponível."
			: cashbackResgateMaximo <= 0
				? "Não há valor disponível para resgate nesta venda."
				: null;
	const isCashbackDisabled = isCashbackBalanceLoading || !!cashbackDisabledReason;

	useEffect(() => {
		if (isCashbackDisabled) {
			if (saleState.state.cashbackResgate !== 0) {
				saleState.setCashbackResgate(0);
			}
			return;
		}

		const nextValue = Math.min(Math.max(0, saleState.state.cashbackResgate), cashbackResgateMaximo);
		if (nextValue !== saleState.state.cashbackResgate) {
			saleState.setCashbackResgate(nextValue);
		}
	}, [isCashbackDisabled, cashbackResgateMaximo, saleState.state.cashbackResgate, saleState.setCashbackResgate]);

	return (
		<div className="w-full flex flex-col gap-1.5 rounded-lg border border-brand/35 bg-brand/20 px-2 py-2">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-1.5">
					<Wallet className="w-3 h-3 text-brand" />
					<span className="text-xs font-semibold text-brand">DESCONTO EM CASHBACK</span>
				</div>
				<span className="text-[11px] font-semibold text-brand">MAX: {formatToMoney(cashbackResgateMaximo)}</span>
			</div>
			<div className="flex items-center justify-between gap-2">
				<Input
					type="number"
					placeholder="Resgate"
					className="w-28 text-xs font-bold border-brand/50 text-brand"
					value={saleState.state.cashbackResgate}
					disabled={isCashbackDisabled}
					onChange={(event) => {
						const inputValue = Number(event.target.value);
						const safeValue = Number.isFinite(inputValue) ? inputValue : 0;
						saleState.setCashbackResgate(Math.min(Math.max(0, safeValue), cashbackResgateMaximo));
					}}
				/>
				<Button
					type="button"
					size="sm"
					variant="ghost-brand"
					disabled={isCashbackDisabled || cashbackResgateMaximo <= 0}
					onClick={() => saleState.setCashbackResgate(cashbackResgateMaximo)}
				>
					APLICAR MÁXIMO
				</Button>
			</div>
			{cashbackDisabledReason ? <p className="text-[11px] text-brand/90">{cashbackDisabledReason}</p> : null}
			{!cashbackDisabledReason && isCashbackBalanceLoading ? <p className="text-[11px] text-brand/90">Carregando saldo de cashback...</p> : null}
		</div>
	);
}

type SummarySectionProps = {
	saleState: TUseSaleState;
	organizationCashbackProgram: TCashbackProgramEntity | null;
	discountAuthority?: TDiscountAuthority | null;
	// Modo edição: cupom e resgate de cashback são imutáveis (aplicados na criação da venda);
	// os blocos interativos somem e permanecem apenas as linhas de leitura abaixo do separador.
	editMode?: boolean;
};

export default function SummarySection({ saleState, organizationCashbackProgram, discountAuthority, editMode }: SummarySectionProps) {
	// Mesmo cômputo do servidor: desconto agregado (geral + itens + cupom MANUAL) sobre o bruto dos itens.
	const cupomManual = saleState.state.cupomResgate?.validacaoModo === "MANUAL" ? saleState.state.cupomResgate.valorDesconto : 0;
	const descontoAgregado = saleState.state.descontoGeral + saleState.totalDescontoItensAvaliavel + cupomManual;
	const discountCeiling = discountAuthority ? getDiscountCeiling({ authority: discountAuthority, valorBase: saleState.subtotalAvaliavel }) : null;
	const discountRequiresApproval = discountAuthority
		? evaluateDiscount({ authority: discountAuthority, valorBase: saleState.subtotalAvaliavel, descontoTotal: descontoAgregado }) === "REQUER_APROVACAO"
		: false;
	// Modalidades desabilitadas não viram bloco desabilitado: somem do checkout. O programa vem
	// do servidor (page.tsx), então não há piscada de carregamento antes de decidir.
	const programaCashbackAtivo = !!organizationCashbackProgram?.ativo;
	const podeResgatarPorDesconto = programaCashbackAtivo && !!organizationCashbackProgram?.modalidadeDescontosPermitida;
	const podeResgatarRecompensa = programaCashbackAtivo && !!organizationCashbackProgram?.modalidadeRecompensasPermitida;
	const mostrarBlocosDeResgate = !editMode && !!saleState.state.cliente;
	return (
		<div className="bg-card border-border flex w-full flex-col gap-2 rounded-xl border px-3 py-3 shadow-2xs">
			<div className="flex items-center gap-1.5">
				<DollarSign className="w-4 h-4 text-foreground" />
				<h3 className="font-bold text-xs uppercase tracking-wide">Resumo</h3>
			</div>
			<div className="flex items-center justify-between text-sm">
				<span className="text-muted-foreground">Subtotal itens</span>
				<span>{formatToMoney(saleState.totalItens)}</span>
			</div>
			<div className="flex flex-col gap-1.5">
				{mostrarBlocosDeResgate && saleState.state.cliente ? (
					<CouponRedemptionSection saleState={saleState} clientId={saleState.state.cliente.id} />
				) : null}
				{mostrarBlocosDeResgate && podeResgatarRecompensa && saleState.state.cliente ? (
					<RewardRedemptionSection saleState={saleState} clientId={saleState.state.cliente.id} />
				) : null}
				{mostrarBlocosDeResgate && podeResgatarPorDesconto && saleState.state.cliente ? (
					<CashbackRedemptionBlock saleState={saleState} clientId={saleState.state.cliente.id} organizationCashbackProgram={organizationCashbackProgram} />
				) : null}
				<div className="w-full flex flex-col gap-1 px-2 py-1 rounded-lg bg-red-200">
					<div className="w-full flex items-center justify-between">
						<div className="flex items-center gap-1.5">
							<Minus className="w-3 h-3 text-red-600" />
							<span className="text-xs text-red-600">OUTROS DESCONTOS</span>
						</div>
						<Input
							type="number"
							placeholder="Desconto"
							className="w-24 text-xs font-bold border border-red-600 text-red-600"
							value={saleState.state.descontoGeral}
							onChange={(event) => saleState.setDescontoGeral(Number(event.target.value) || 0)}
						/>
					</div>
					{discountCeiling !== null ? (
						<span className="text-[11px] font-semibold text-red-600">LIMITE DO OPERADOR: {formatToMoney(discountCeiling)}</span>
					) : null}
					{discountRequiresApproval ? (
						<div className="flex items-center gap-1.5 text-[11px] font-semibold text-red-700">
							<ShieldAlert className="w-3 h-3 min-w-3 min-h-3" />
							<span>Desconto acima do limite — a finalização exigirá a aprovação de um gestor.</span>
						</div>
					) : null}
				</div>
				<div className="w-full flex items-center justify-between px-2 py-1 rounded-lg bg-green-200">
					<div className="flex items-center gap-1.5">
						<Plus className="w-3 h-3 text-green-600" />
						<span className="text-xs text-green-600">ACRÉSCIMOS</span>
					</div>
					<Input
						type="number"
						placeholder="Acréscimo"
						className="w-24 text-xs font-bold border border-green-600 text-green-600"
						value={saleState.state.acrescimoGeral}
						onChange={(event) => saleState.setAcrescimoGeral(Number(event.target.value) || 0)}
					/>
				</div>
			</div>
			<Input
				placeholder="Defina, se aplicável, observações da venda aqui..."
				value={saleState.state.observacoes}
				onChange={(event) => saleState.setObservacoes(event.target.value)}
			/>
			<Separator />
			{saleState.state.cupomResgate ? (
				<div className="flex items-center justify-between text-sm text-green-600">
					<span>
						Cupom {saleState.state.cupomResgate.codigo ?? ""}
						{editMode ? <span className="text-[11px] text-muted-foreground"> (aplicado na venda)</span> : null}
					</span>
					<span>-{formatToMoney(saleState.state.cupomResgate.valorDesconto)}</span>
				</div>
			) : null}
			{saleState.state.cashbackResgate > 0 ? (
				<div className="flex items-center justify-between text-sm text-green-600">
					<span>
						Desconto em cashback
						{editMode ? <span className="text-[11px] text-muted-foreground"> (aplicado na venda)</span> : null}
					</span>
					<span>-{formatToMoney(saleState.state.cashbackResgate)}</span>
				</div>
			) : null}
			{saleState.state.recompensaResgate ? (
				<div className="flex items-center justify-between text-sm text-amber-600">
					<span>
						Recompensa: {saleState.state.recompensaResgate.titulo}
						{editMode ? <span className="text-[11px] text-muted-foreground"> (aplicada na venda)</span> : null}
					</span>
					<span>GRÁTIS ({formatToMoney(saleState.state.recompensaResgate.valorVenda)})</span>
				</div>
			) : null}
			{saleState.state.taxaEntrega > 0 ? (
				<div className="flex items-center justify-between text-sm text-muted-foreground">
					<span>Taxa de entrega</span>
					<span>+{formatToMoney(saleState.state.taxaEntrega)}</span>
				</div>
			) : null}
			<div className="flex items-center justify-between text-sm font-semibold">
				<span>TOTAL FINAL</span>
				<span>{formatToMoney(saleState.valorFinal)}</span>
			</div>
			{saleState.state.pagamentosEfetivadosTotal > 0 ? (
				<div className="flex items-center justify-between text-xs font-semibold text-green-700 dark:text-green-400">
					<span>JÁ RECEBIDO</span>
					<span>-{formatToMoney(saleState.state.pagamentosEfetivadosTotal)}</span>
				</div>
			) : null}
			<div className="flex items-center justify-between text-xs text-muted-foreground">
				<span>PAGAMENTOS</span>
				<span>{formatToMoney(saleState.totalPagamentos)}</span>
			</div>
			{saleState.troco > 0 ? (
				<div className="flex items-center justify-between text-xs font-semibold text-amber-600 dark:text-amber-400">
					<span>TROCO</span>
					<span>{formatToMoney(saleState.troco)}</span>
				</div>
			) : (
				<div className="flex items-center justify-between text-xs text-muted-foreground">
					<span>RESTANTE</span>
					<span>{formatToMoney(saleState.valorRestante)}</span>
				</div>
			)}
			{saleState.trocoBloqueio ? <p className="text-[11px] text-red-600 dark:text-red-400">{saleState.trocoBloqueio}</p> : null}
		</div>
	);
}
