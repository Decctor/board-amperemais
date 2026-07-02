"use client";

import ResponsiveMenuV2 from "@/components/Utils/ResponsiveMenuV2";
import { SaleValueConfirmationInput } from "@/app/(external)/point-of-interaction/[orgId]/_shared/components/sale-value-confirmation-input";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { getErrorMessage } from "@/lib/errors";
import { formatDecimalPlaces, formatToMoney } from "@/lib/formatting";
import { approvePoiTransactionRequest } from "@/lib/mutations/poi-transaction-requests";
import { saleValuesMatch } from "@/lib/point-of-interaction/sale-value-confirmation";
import { cn } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { AlertTriangle } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

const OPERATOR_PASSWORD_LENGTH = 5;

// Acima deste valor a aprovação exige uma confirmação explícita do operador, reduzindo a
// chance de aprovar uma venda com a ordem de grandeza errada (ex.: R$ 20,96 digitado como R$ 2.096,00).
// TODO: tornar configurável por organização quando houver necessidade.
const HIGH_VALUE_CONFIRMATION_THRESHOLD = 1000;

type TApproveTransactionCoupon = {
	cupomId: string;
	valorDesconto: number | null;
	titulo: string | null;
	codigo: string | null;
	validacaoModo: string | null;
	condicoesTexto: string | null;
};

type ApproveTransactionProps = {
	requestId: string;
	clientDisplayName?: string;
	valorBruto: number;
	valorFinal: number;
	/** Cupom solicitado na transação (quando MANUAL sem valor, o operador informa o desconto aqui). */
	coupon?: TApproveTransactionCoupon | null;
	/** Quando ausente, é obrigatório informar a senha do operador (vendedor). */
	hasLinkedSeller: boolean;
	requiresOperatorPassword: boolean;
	requiresSaleValueConfirmation: boolean;
	closeModal: () => void;
	callbacks?: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: (error: Error) => void;
		onSettled?: () => void;
	};
};

// Exibe o valor com os centavos visualmente separados, deixando a ordem de grandeza inequívoca.
function HighlightedMoney({ value }: { value: number }) {
	const [reais, centavos] = formatDecimalPlaces(value, 2, 2).split(",");
	return (
		<span className="font-black tabular-nums tracking-tight">
			<span className="text-sm align-top text-muted-foreground">R$ </span>
			<span className="text-4xl short:text-3xl">{reais}</span>
			<span className="text-2xl short:text-xl text-muted-foreground">,{centavos}</span>
		</span>
	);
}

export function ApproveTransaction({
	requestId,
	clientDisplayName,
	valorBruto,
	valorFinal,
	coupon,
	hasLinkedSeller,
	requiresOperatorPassword,
	requiresSaleValueConfirmation,
	closeModal,
	callbacks,
}: ApproveTransactionProps) {
	const [operatorPassword, setOperatorPassword] = useState("");
	const [operatorConfirmedSaleValue, setOperatorConfirmedSaleValue] = useState<number | null>(null);
	const [operatorCouponDiscountValue, setOperatorCouponDiscountValue] = useState<number | null>(null);
	const [highValueConfirmed, setHighValueConfirmed] = useState(false);

	const requiresHighValueConfirmation = valorFinal >= HIGH_VALUE_CONFIRMATION_THRESHOLD;
	const hasDiscount = valorBruto > valorFinal;
	// Cupom MANUAL enviado sem valor: o desconto é definido pelo operador na aprovação.
	const requiresCouponDiscountInput = !!coupon && coupon.validacaoModo === "MANUAL" && !coupon.valorDesconto;

	const { mutate, isPending } = useMutation({
		mutationKey: ["approve-poi-transaction-request", requestId],
		mutationFn: approvePoiTransactionRequest,
		onMutate: () => {
			callbacks?.onMutate?.();
		},
		onSuccess: (data) => {
			callbacks?.onSuccess?.();
			toast.success(data.message);
			closeModal();
		},
		onError: (error) => {
			callbacks?.onError?.(error);
			toast.error(getErrorMessage(error));
		},
		onSettled: () => {
			callbacks?.onSettled?.();
		},
	});

	const handleApprove = useCallback(() => {
		if (requiresHighValueConfirmation && !highValueConfirmed) {
			toast.error(`Confirme que o valor de ${formatToMoney(valorFinal)} está correto antes de aprovar.`);
			return;
		}
		console.log({
			requiresSaleValueConfirmation,
			operatorConfirmedSaleValue,
		});
		const code = operatorPassword;
		if (requiresSaleValueConfirmation && operatorConfirmedSaleValue == null) {
			toast.error("Confirme o valor final da venda.");
			return;
		}
		if (requiresSaleValueConfirmation && operatorConfirmedSaleValue != null && !saleValuesMatch(operatorConfirmedSaleValue, valorFinal)) {
			toast.error("O valor confirmado não corresponde ao valor da venda.");
			return;
		}
		if (requiresCouponDiscountInput) {
			if (!operatorCouponDiscountValue || operatorCouponDiscountValue <= 0) {
				toast.error("Informe o valor do desconto do cupom (validação do operador).");
				return;
			}
			if (operatorCouponDiscountValue > valorBruto) {
				toast.error("O desconto do cupom não pode superar o valor da venda.");
				return;
			}
		}
		if (!hasLinkedSeller || requiresOperatorPassword) {
			if (code.length !== OPERATOR_PASSWORD_LENGTH) {
				toast.error("Informe os 5 dígitos da senha do operador.");
				return;
			}
		} else if (code.length > 0 && code.length !== OPERATOR_PASSWORD_LENGTH) {
			toast.error("Informe os 5 dígitos da senha ou deixe todos os campos em branco para usar o vendedor vinculado ao seu usuário.");
			return;
		}
		mutate({
			requestId,
			operatorIdentifier: code.length === OPERATOR_PASSWORD_LENGTH ? code : undefined,
			operatorConfirmedSaleValue: requiresSaleValueConfirmation ? operatorConfirmedSaleValue : undefined,
			operatorCouponDiscountValue: requiresCouponDiscountInput ? operatorCouponDiscountValue : undefined,
		});
	}, [
		hasLinkedSeller,
		highValueConfirmed,
		mutate,
		operatorConfirmedSaleValue,
		operatorCouponDiscountValue,
		operatorPassword,
		requestId,
		requiresCouponDiscountInput,
		requiresHighValueConfirmation,
		requiresOperatorPassword,
		requiresSaleValueConfirmation,
		valorBruto,
		valorFinal,
	]);

	const description = hasLinkedSeller
		? requiresOperatorPassword
			? "Informe os 5 dígitos da senha do vendedor que receberá a venda."
			: "Informe os 5 dígitos da senha do vendedor que receberá a venda. Se deixar em branco, será usado o vendedor vinculado ao seu usuário."
		: "Informe os 5 dígitos da senha do operador (vendedor) que receberá esta venda.";

	return (
		<ResponsiveMenuV2
			menuTitle="APROVAR SOLICITAÇÃO"
			menuDescription={clientDisplayName ? `Cliente: ${clientDisplayName}.` : "Confira o valor e identifique o operador."}
			menuActionButtonText="APROVAR"
			menuCancelButtonText="CANCELAR"
			actionFunction={handleApprove}
			actionIsLoading={isPending}
			stateIsLoading={false}
			stateError={null}
			closeMenu={closeModal}
			dialogContentClassName="min-w-0 overflow-x-hidden sm:max-w-lg"
			drawerContentClassName="overflow-x-hidden"
		>
			<div className="flex w-full min-w-0 flex-col gap-4 overflow-x-hidden py-2">
				{/* Valor em destaque: o operador deve conferir o valor no momento da aprovação. */}
				<div className="flex w-full flex-col items-center gap-1 rounded-2xl border border-brand/20 bg-brand/5 px-4 py-5 text-center">
					<span className="text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground">Valor a aprovar</span>
					<HighlightedMoney value={valorFinal} />
					{hasDiscount ? (
						<span className="text-[0.7rem] font-medium text-muted-foreground">Bruto: {formatToMoney(valorBruto)} · com desconto/resgate aplicado</span>
					) : null}
				</div>

				{requiresHighValueConfirmation ? (
					<label
						htmlFor="poi-approve-high-value"
						className={cn(
							"flex w-full cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 transition-colors",
							highValueConfirmed ? "border-brand/40 bg-brand/5" : "border-amber-300 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-900/10",
						)}
					>
						<Checkbox
							id="poi-approve-high-value"
							checked={highValueConfirmed}
							onCheckedChange={(v) => setHighValueConfirmed(v === true)}
							className="mt-0.5"
						/>
						<span className="flex items-start gap-1.5 text-xs font-medium leading-snug text-foreground/90">
							<AlertTriangle className="mt-0.5 h-4 w-4 min-h-4 min-w-4 text-amber-500" />
							Valor elevado. Confirmo que conferi e o valor de <strong className="font-black">{formatToMoney(valorFinal)}</strong> está correto.
						</span>
					</label>
				) : null}

				{coupon ? (
					<div className="flex w-full flex-col gap-2 rounded-xl border border-brand/20 bg-brand/5 px-3 py-3">
						<div className="flex items-center justify-between">
							<span className="text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground">
								Cupom {coupon.codigo ?? ""} — {coupon.titulo ?? ""}
							</span>
							{coupon.valorDesconto ? <span className="text-xs font-black text-green-600">- {formatToMoney(coupon.valorDesconto)}</span> : null}
						</div>
						{coupon.condicoesTexto ? <p className="text-[0.7rem] text-muted-foreground">Condições: {coupon.condicoesTexto}</p> : null}
						{requiresCouponDiscountInput ? (
							<div className="flex flex-col gap-1">
								<Label htmlFor="poi-approve-coupon-discount" className="text-xs font-medium tracking-tight text-foreground/80">
									DESCONTO DO CUPOM (R$)<span className="text-red-500">*</span>
								</Label>
								<p className="text-[0.7rem] text-muted-foreground">Confira as condições do cupom na compra e informe o valor do desconto concedido.</p>
								<Input
									id="poi-approve-coupon-discount"
									type="number"
									placeholder="Ex: 25 para R$ 25,00..."
									value={operatorCouponDiscountValue ?? ""}
									onChange={(event) => {
										const inputValue = Number(event.target.value);
										setOperatorCouponDiscountValue(Number.isFinite(inputValue) && inputValue > 0 ? inputValue : null);
									}}
								/>
							</div>
						) : null}
					</div>
				) : null}

				{requiresSaleValueConfirmation ? (
					<SaleValueConfirmationInput value={operatorConfirmedSaleValue} onChange={setOperatorConfirmedSaleValue} compact />
				) : null}

				<div className="flex w-full min-w-0 flex-col gap-3 overflow-x-hidden">
					<Label htmlFor="poi-approve-operator-password" className="text-sm font-medium tracking-tight text-foreground/80">
						SENHA DO OPERADOR (5 DÍGITOS)
						{!hasLinkedSeller || requiresOperatorPassword ? <span className="text-red-500">*</span> : null}
					</Label>
					<p className="text-[0.7rem] text-muted-foreground">{description}</p>
					<InputOTP
						id="poi-approve-operator-password"
						maxLength={OPERATOR_PASSWORD_LENGTH}
						pattern={REGEXP_ONLY_DIGITS}
						inputMode="numeric"
						autoComplete="off"
						pushPasswordManagerStrategy="none"
						value={operatorPassword}
						onChange={(value) => setOperatorPassword(value)}
						containerClassName="mx-auto w-full max-w-full justify-center"
					>
						<InputOTPGroup>
							<InputOTPSlot index={0} />
							<InputOTPSlot index={1} />
							<InputOTPSlot index={2} />
							<InputOTPSlot index={3} />
							<InputOTPSlot index={4} />
						</InputOTPGroup>
					</InputOTP>
				</div>
			</div>
		</ResponsiveMenuV2>
	);
}
