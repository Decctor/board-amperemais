import CheckboxInput from "@/components/Inputs/CheckboxInput";
import { SaleValueConfirmationInput } from "@/app/(external)/point-of-interaction/[orgId]/_shared/components/sale-value-confirmation-input";
import NumberInput from "@/components/Inputs/NumberInput";
import TextInput from "@/components/Inputs/TextInput";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { TAuthUserSession } from "@/lib/authentication/types";
import type { TCashbackProgramTerminologyEnum } from "@/schemas/enums";
import { getErrorMessage } from "@/lib/errors";
import { formatCashbackValue, formatToCPForCNPJ, formatToMoney, formatToPhone } from "@/lib/formatting";
import { createPointOfInteractionSale } from "@/lib/mutations/sales";
import {
	getPoiSaleValueForConfirmation,
	poiSaleRequiresValueConfirmation,
	saleValuesMatch,
} from "@/lib/point-of-interaction/sale-value-confirmation";
import { useCashbackProgram } from "@/lib/queries/cashback-programs";
import { useClientByLookup } from "@/lib/queries/clients";
import { Input } from "@/components/ui/input";
import {
	getAvailableCashback,
	getFinalValue,
	getMaxCashbackToUse,
	getRedemptionLimitConfig,
} from "@/app/(external)/point-of-interaction/[orgId]/_shared/helpers/cashback-calculations";
import {
	TPointOfInteractionNewInternalTransactionRequestState,
	TUsePointOfInteractionNewInternalTransactionRequestState,
	usePointOfInteractionNewInternalTransactionRequestState,
} from "@/state-hooks/use-point-of-interaction-new-internal-transaction-request";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BadgePercent, CheckCircle2, Gift, LockKeyhole, ShoppingCart, UserRound } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { REGEXP_ONLY_DIGITS } from "input-otp";

const OPERATOR_PASSWORD_LENGTH = 5;

type TNewTransactionFlowMode = "discount" | "prize" | "sale-only";
type TInternalPrize = {
	id: string;
	titulo: string;
	descricao: string | null;
	imagemCapaUrl: string | null;
	valor: number;
	valorVenda: number;
	produto: { grupo: string | null } | null;
};

type NewTransactionProps = {
	sessionOrgId: string;
	sessionUser: TAuthUserSession["user"];
	poiConfirmacaoValorObrigatoria: boolean;
	closeMenu: () => void;
	callbacks?: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: () => void;
		onSettled?: () => void;
	};
};
export function NewTransaction({ sessionOrgId, sessionUser, poiConfirmacaoValorObrigatoria, closeMenu, callbacks }: NewTransactionProps) {
	const queryClient = useQueryClient();
	const {
		state,
		updateClient,
		updateSale,
		updateCashback,
		updatePrizeRedemption,
		updateOperatorIdentifier,
		updateOperatorConfirmedSaleValue,
		resetState,
	} = usePointOfInteractionNewInternalTransactionRequestState();
	const {
		data: cashbackProgram,
		isLoading: isLoadingCashbackProgram,
		error: cashbackProgramError,
		queryKey: cashbackProgramQueryKey,
	} = useCashbackProgram();
	const [flowMode, setFlowMode] = useState<TNewTransactionFlowMode>("discount");
	const [selectedPrize, setSelectedPrize] = useState<TInternalPrize | null>(null);

	const prizes = useMemo<TInternalPrize[]>(() => {
		return (
			cashbackProgram?.recompensas
				?.filter((prize) => prize.ativo)
				.map((prize) => ({
					id: prize.id,
					titulo: prize.titulo,
					descricao: prize.descricao,
					imagemCapaUrl: prize.imagemCapaUrl,
					valor: prize.valor,
					valorVenda: prize.produtoVariante?.precoVenda ?? prize.produto?.precoVenda ?? 0,
					produto: prize.produto ? { grupo: prize.produto.grupo } : null,
				})) ?? []
		);
	}, [cashbackProgram?.recompensas]);

	const isDiscountModeAllowed = cashbackProgram?.modalidadeDescontosPermitida ?? true;
	const isPrizeModeAllowed = (cashbackProgram?.modalidadeRecompensasPermitida ?? false) && prizes.length > 0;
	const terminology: TCashbackProgramTerminologyEnum = cashbackProgram?.terminologia ?? "DINHEIRO";

	const { data: clientData, updateParams: updateClientLookupParams } = useClientByLookup({
		initialParams: { orgId: sessionOrgId, phone: state.client.telefone },
	});
	const availableCashback = useMemo(() => getAvailableCashback(clientData?.saldos), [clientData?.saldos]);
	const redemptionLimitConfig = useMemo(() => getRedemptionLimitConfig(clientData?.saldos), [clientData?.saldos]);
	const maximumCashbackAllowed = useMemo(
		() => getMaxCashbackToUse(availableCashback, state.sale.valor, redemptionLimitConfig),
		[availableCashback, redemptionLimitConfig, state.sale.valor],
	);
	const finalValue = useMemo(() => getFinalValue(state.sale.valor, state.sale.cashback), [state.sale.cashback, state.sale.valor]);
	const isAttemptingToUseMoreCashbackThanAllowed = state.sale.cashback.aplicar && state.sale.cashback.valor > maximumCashbackAllowed;
	const requiresSaleValueConfirmation = poiSaleRequiresValueConfirmation(poiConfirmacaoValorObrigatoria, state.sale);

	useEffect(() => {
		updateClientLookupParams({ orgId: sessionOrgId, phone: state.client.telefone });
	}, [sessionOrgId, state.client.telefone, updateClientLookupParams]);

	useEffect(() => {
		if (!clientData) return;
		updateClient({
			id: clientData.id,
			nome: clientData.nome,
			telefone: clientData.telefone,
			cpfCnpj: null,
		});
	}, [clientData, updateClient]);

	useEffect(() => {
		if (flowMode === "prize" && !isPrizeModeAllowed) setFlowMode(isDiscountModeAllowed ? "discount" : "sale-only");
		if (flowMode === "discount" && !isDiscountModeAllowed) setFlowMode(isPrizeModeAllowed ? "prize" : "sale-only");
	}, [flowMode, isDiscountModeAllowed, isPrizeModeAllowed]);

	const { mutate, isPending } = useMutation({
		mutationKey: ["create-point-of-interaction-internal-transaction"],
		mutationFn: createPointOfInteractionSale,
		onMutate: () => callbacks?.onMutate?.(),
		onSuccess: (data) => {
			callbacks?.onSuccess?.();
			toast.success(data.message);
			queryClient.invalidateQueries({ queryKey: ["sales"] });
			queryClient.invalidateQueries({ queryKey: cashbackProgramQueryKey });
			resetState();
			closeMenu();
		},
		onError: (error) => {
			callbacks?.onError?.();
			toast.error(getErrorMessage(error));
		},
		onSettled: () => callbacks?.onSettled?.(),
	});

	function handleSelectFlowMode(mode: TNewTransactionFlowMode) {
		if (mode === "discount" && !isDiscountModeAllowed) return toast.error("A modalidade de desconto não está habilitada.");
		if (mode === "prize" && !isPrizeModeAllowed) return toast.error("A modalidade de recompensas não está disponível.");

		setFlowMode(mode);
		setSelectedPrize(null);
		updatePrizeRedemption(null);
		updateCashback({ aplicar: false, valor: 0 });
		updateSale({ valor: 0 });
	}

	function handleSelectPrize(prize: TInternalPrize) {
		if (availableCashback < prize.valor) return toast.error("Saldo insuficiente para resgatar esta recompensa.");
		if (prize.valorVenda <= 0) return toast.error("Esta recompensa não possui valor comercial configurado.");

		setSelectedPrize(prize);
		updateSale({ valor: prize.valorVenda });
		updateCashback({ aplicar: true, valor: prize.valor });
		updatePrizeRedemption({ prizeId: prize.id, prizeValue: prize.valor, prizeSaleValue: prize.valorVenda });
	}

	function handleSubmit() {
		if (!state.client.telefone) return toast.error("Informe o telefone do cliente.");
		if (!state.client.id && !state.client.nome.trim()) return toast.error("Informe o nome do cliente.");
		if (state.sale.valor <= 0) return toast.error("Informe um valor de venda positivo.");
		if (state.sale.cashback.aplicar && state.sale.cashback.valor <= 0) return toast.error("Informe o valor do cashback.");
		if (isAttemptingToUseMoreCashbackThanAllowed) return toast.error("O cashback aplicado excede o limite disponível para esta venda.");
		if (flowMode === "prize" && !selectedPrize) return toast.error("Selecione uma recompensa.");
		if (state.operatorIdentifier.length !== OPERATOR_PASSWORD_LENGTH) return toast.error("Informe os 5 dígitos da senha do operador.");
		if (requiresSaleValueConfirmation && state.operatorConfirmedSaleValue == null) return toast.error("Confirme o valor final da venda.");
		if (
			requiresSaleValueConfirmation &&
			state.operatorConfirmedSaleValue != null &&
			!saleValuesMatch(state.operatorConfirmedSaleValue, getPoiSaleValueForConfirmation(state.sale))
		) {
			return toast.error("O valor confirmado não corresponde ao valor da venda.");
		}

		mutate({
			orgId: sessionOrgId,
			client: state.client,
			sale: state.sale,
			operatorIdentifier: state.operatorIdentifier,
			operatorConfirmedSaleValue: requiresSaleValueConfirmation ? state.operatorConfirmedSaleValue : undefined,
		});
	}

	return (
		<ResponsiveMenu
			menuTitle="NOVA TRANSAÇÃO"
			menuDescription={`Preencha os dados abaixo para registrar uma transação interna.${sessionUser.nome ? ` Operador logado: ${sessionUser.nome}.` : ""}`}
			menuActionButtonText="CRIAR TRANSAÇÃO"
			menuCancelButtonText="CANCELAR"
			actionFunction={handleSubmit}
			actionIsLoading={isPending}
			stateIsLoading={isLoadingCashbackProgram}
			stateError={cashbackProgramError ? getErrorMessage(cashbackProgramError) : null}
			closeMenu={closeMenu}
			dialogVariant="md"
		>
			<div className="flex flex-col gap-4">
				<NewTransactionClientBlock
					orgId={sessionOrgId}
					client={state.client}
					updateClient={updateClient}
					availableCashback={availableCashback}
					terminology={terminology}
				/>
				<ResponsiveMenuSection title="FLUXO" icon={<ShoppingCart className="h-4 min-h-4 w-4 min-w-4" />}>
					<NewTransactionFlowSelector
						flowMode={flowMode}
						isDiscountModeAllowed={isDiscountModeAllowed}
						isPrizeModeAllowed={isPrizeModeAllowed}
						onSelectFlowMode={handleSelectFlowMode}
					/>
				</ResponsiveMenuSection>
				{flowMode === "prize" ? (
					<NewTransactionPrizeFlow
						prizes={prizes}
						selectedPrize={selectedPrize}
						availableCashback={availableCashback}
						terminology={terminology}
						onSelectPrize={handleSelectPrize}
					/>
				) : (
					<NewTransactionDiscountFlow
						state={state}
						updateSale={updateSale}
						updateCashback={updateCashback}
						allowCashback={flowMode === "discount"}
						maximumCashbackAllowed={maximumCashbackAllowed}
						isAttemptingToUseMoreCashbackThanAllowed={isAttemptingToUseMoreCashbackThanAllowed}
						terminology={terminology}
					/>
				)}
				<NewTransactionSummaryBlock state={state} finalValue={finalValue} terminology={terminology} selectedPrize={selectedPrize} />
				<ResponsiveMenuSection title="OPERADOR" icon={<LockKeyhole className="h-4 min-h-4 w-4 min-w-4" />}>
					{requiresSaleValueConfirmation ? (
						<SaleValueConfirmationInput value={state.operatorConfirmedSaleValue} onChange={updateOperatorConfirmedSaleValue} compact />
					) : null}
					<p className="text-sm font-medium tracking-tight text-foreground/80">SENHA DO OPERADOR (5 DÍGITOS)</p>
					<InputOTP
						maxLength={OPERATOR_PASSWORD_LENGTH}
						pattern={REGEXP_ONLY_DIGITS}
						inputMode="numeric"
						autoComplete="off"
						pushPasswordManagerStrategy="none"
						value={state.operatorIdentifier}
						onChange={updateOperatorIdentifier}
						containerClassName="w-full max-w-full justify-center"
					>
						<InputOTPGroup>
							<InputOTPSlot index={0} />
							<InputOTPSlot index={1} />
							<InputOTPSlot index={2} />
							<InputOTPSlot index={3} />
							<InputOTPSlot index={4} />
						</InputOTPGroup>
					</InputOTP>
				</ResponsiveMenuSection>
			</div>
		</ResponsiveMenu>
	);
}

type NewTransactionClientBlockProps = {
	orgId: string;
	client: TPointOfInteractionNewInternalTransactionRequestState["client"];
	updateClient: TUsePointOfInteractionNewInternalTransactionRequestState["updateClient"];
	availableCashback: number;
	terminology: TCashbackProgramTerminologyEnum;
};
function NewTransactionClientBlock({ orgId, client, updateClient, availableCashback, terminology }: NewTransactionClientBlockProps) {
	const {
		data: clientData,
		isLoading: isLoadingClient,
		isSuccess: isSuccessClient,
		updateParams,
	} = useClientByLookup({ initialParams: { orgId, phone: client.telefone } });

	useEffect(() => {
		updateParams({ orgId, phone: client.telefone });
	}, [client.telefone, orgId, updateParams]);

	const isPhoneComplete = client.telefone.length === 15;

	const clientFound = isSuccessClient && !!clientData;
	const clientNotFound = isSuccessClient && !clientData && isPhoneComplete;
	const isLoadingState = isLoadingClient && isPhoneComplete;

	return (
		<ResponsiveMenuSection title="CLIENTE" icon={<UserRound className="h-4 min-h-4 w-4 min-w-4" />}>
			<TextInput
				label="TELEFONE"
				placeholder="Digite o telefone do cliente..."
				value={client.telefone}
				handleChange={(value) => {
					const telefone = formatToPhone(value);
					if (client.id != null) {
						updateClient({ id: null, nome: "", cpfCnpj: null, telefone });
					} else {
						updateClient({ telefone });
					}
				}}
			/>
			{isLoadingState ? <p className="text-xs font-medium text-muted-foreground">Buscando cliente...</p> : null}
			{clientFound ? (
				<div className="bg-green-50 border-2 short:border border-green-200 rounded-3xl short:rounded-xl p-6 short:p-2.5 flex flex-col items-center gap-4 short:gap-2 animate-in zoom-in">
					<div className="text-center">
						<p className="text-xs short:text-[0.65rem] font-bold text-green-600 uppercase tracking-widest mb-1 short:mb-0">✓ Perfil Encontrado</p>
						<p className="text-green-900 font-black text-2xl short:text-base uppercase italic">{clientData?.nome}</p>
						<p className="text-green-600 font-bold short:text-xs">{formatToPhone(clientData?.telefone)}</p>
						<p className="mt-2 px-3 py-2 rounded-xl bg-green-600 text-white text-xs font-bold uppercase tracking-widest">
							Saldo disponível: {formatCashbackValue(availableCashback, terminology)}
						</p>
					</div>
				</div>
			) : clientNotFound ? (
				<div className="bg-blue-50 border-2 short:border border-blue-200 rounded-3xl short:rounded-xl p-6 short:p-2.5 flex flex-col items-center gap-4 short:gap-2 animate-in zoom-in">
					<TextInput label="NOME" placeholder="Digite o nome do cliente..." value={client.nome} handleChange={(value) => updateClient({ nome: value })} />
					<TextInput
						label="CPF/CNPJ"
						placeholder="Digite o CPF/CNPJ do cliente..."
						value={client.cpfCnpj ?? ""}
						handleChange={(value) => updateClient({ cpfCnpj: formatToCPForCNPJ(value) })}
					/>
				</div>
			) : null}
		</ResponsiveMenuSection>
	);
}

type NewTransactionFlowSelectorProps = {
	flowMode: TNewTransactionFlowMode;
	isDiscountModeAllowed: boolean;
	isPrizeModeAllowed: boolean;
	onSelectFlowMode: (mode: TNewTransactionFlowMode) => void;
};
function NewTransactionFlowSelector({ flowMode, isDiscountModeAllowed, isPrizeModeAllowed, onSelectFlowMode }: NewTransactionFlowSelectorProps) {
	return (
		<div className="flex items-center gap-3 flex-wrap">
			<Button
				variant={flowMode === "sale-only" ? "brand" : "outline"}
				onClick={() => onSelectFlowMode("sale-only")}
				className="flex items-center gap-1.5"
			>
				<ShoppingCart className="h-4 min-h-4 w-4 min-w-4" />
				<span>APENAS PONTUAR</span>
			</Button>
			<Button
				variant={flowMode === "prize" ? "brand" : "outline"}
				disabled={!isPrizeModeAllowed}
				onClick={() => onSelectFlowMode("prize")}
				className="flex items-center gap-1.5"
			>
				<Gift className="h-4 min-h-4 w-4 min-w-4" />
				<span>RECOMPENSA</span>
			</Button>
			<Button
				variant={flowMode === "discount" ? "brand" : "outline"}
				disabled={!isDiscountModeAllowed}
				onClick={() => onSelectFlowMode("discount")}
				className="flex items-center gap-1.5"
			>
				<BadgePercent className="h-4 min-h-4 w-4 min-w-4" />
				<span>DESCONTO</span>
			</Button>
		</div>
	);
}

type NewTransactionPrizeFlowProps = {
	prizes: TInternalPrize[];
	selectedPrize: TInternalPrize | null;
	availableCashback: number;
	terminology: TCashbackProgramTerminologyEnum;
	onSelectPrize: (prize: TInternalPrize) => void;
};
function NewTransactionPrizeFlow({ prizes, selectedPrize, availableCashback, terminology, onSelectPrize }: NewTransactionPrizeFlowProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const prizesSortedByValue = prizes.sort((a, b) => a.valor - b.valor);
	const prizesFiltered = prizesSortedByValue.filter((prize) => prize.titulo.toLowerCase().includes(searchQuery.toLowerCase()));
	return (
		<ResponsiveMenuSection title="RECOMPENSA" icon={<Gift className="h-4 min-h-4 w-4 min-w-4" />}>
			<div className="flex flex-col gap-3">
				<Input placeholder="Pesquisar recompensa..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
				{prizesFiltered.length === 0 ? (
					<p className="text-sm text-muted-foreground">Nenhuma recompensa ativa encontrada.</p>
				) : (
					<div className="grid gap-3 sm:grid-cols-2">
						{prizesFiltered.map((prize) => {
							const isSelected = selectedPrize?.id === prize.id;
							const isDisabled = availableCashback < prize.valor || prize.valorVenda <= 0;
							return (
								<button
									key={prize.id}
									type="button"
									disabled={isDisabled}
									onClick={() => onSelectPrize(prize)}
									className={`flex min-h-28 w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${
										isSelected ? "border-brand bg-brand/10" : "border-border/15 bg-card hover:border-brand/50"
									} ${isDisabled ? "cursor-not-allowed opacity-50" : ""}`}
								>
									<div className="relative h-16 w-16 min-w-16 overflow-hidden rounded-xl bg-secondary">
										{prize.imagemCapaUrl ? (
											<Image src={prize.imagemCapaUrl} alt={prize.titulo} fill className="object-cover" />
										) : (
											<div className="flex h-full w-full items-center justify-center">
												<Gift className="h-6 w-6 text-muted-foreground" />
											</div>
										)}
									</div>
									<div className="flex min-w-0 flex-1 flex-col gap-1">
										<p className="truncate text-sm font-black uppercase tracking-tight">{prize.titulo}</p>
										<p className="text-xs font-bold text-brand">{formatCashbackValue(prize.valor, terminology)}</p>
										<p className="text-xs text-muted-foreground">Valor comercial: {formatToMoney(prize.valorVenda)}</p>
									</div>
									{isSelected ? <CheckCircle2 className="h-5 w-5 min-w-5 text-brand" /> : null}
								</button>
							);
						})}
					</div>
				)}
			</div>
		</ResponsiveMenuSection>
	);
}

type NewTransactionDiscountFlowProps = {
	state: TPointOfInteractionNewInternalTransactionRequestState;
	updateSale: TUsePointOfInteractionNewInternalTransactionRequestState["updateSale"];
	updateCashback: TUsePointOfInteractionNewInternalTransactionRequestState["updateCashback"];
	allowCashback: boolean;
	maximumCashbackAllowed: number;
	isAttemptingToUseMoreCashbackThanAllowed: boolean;
	terminology: TCashbackProgramTerminologyEnum;
};
function NewTransactionDiscountFlow({
	state,
	updateSale,
	updateCashback,
	allowCashback,
	maximumCashbackAllowed,
	isAttemptingToUseMoreCashbackThanAllowed,
	terminology,
}: NewTransactionDiscountFlowProps) {
	return (
		<>
			<ResponsiveMenuSection title="VALOR DA TRANSAÇÃO" icon={<ShoppingCart className="h-4 min-h-4 w-4 min-w-4" />}>
				<NumberInput
					label="VALOR"
					placeholder={"Preencha aqui o valor da venda..."}
					width="100%"
					value={state.sale.valor}
					handleChange={(value) => updateSale({ valor: value })}
				/>
			</ResponsiveMenuSection>
			{allowCashback ? (
				<ResponsiveMenuSection title="CASHBACK" icon={<BadgePercent className="h-4 min-h-4 w-4 min-w-4" />}>
					<CheckboxInput
						labelTrue="APLICAR CASHBACK"
						labelFalse="APLICAR CASHBACK"
						checked={state.sale.cashback.aplicar}
						handleChange={(value) => updateCashback({ aplicar: value, valor: value ? maximumCashbackAllowed : 0 })}
					/>
					<p className="text-xs text-muted-foreground">
						Máximo permitido para esta venda: <strong>{formatCashbackValue(maximumCashbackAllowed, terminology)}</strong>
					</p>
					{state.sale.cashback.aplicar ? (
						<>
							<NumberInput
								label="VALOR DO CASHBACK"
								placeholder="Preencha aqui o valor do cashback..."
								width="100%"
								value={state.sale.cashback.valor}
								handleChange={(value) => updateCashback({ valor: value })}
							/>
							{isAttemptingToUseMoreCashbackThanAllowed ? (
								<p className="text-xs font-bold text-red-600">O valor informado excede o limite disponível para esta venda.</p>
							) : null}
						</>
					) : null}
				</ResponsiveMenuSection>
			) : null}
		</>
	);
}

type NewTransactionSummaryBlockProps = {
	state: TPointOfInteractionNewInternalTransactionRequestState;
	finalValue: number;
	terminology: TCashbackProgramTerminologyEnum;
	selectedPrize: TInternalPrize | null;
};
function NewTransactionSummaryBlock({ state, finalValue, terminology, selectedPrize }: NewTransactionSummaryBlockProps) {
	return (
		<ResponsiveMenuSection title="RESUMO" icon={<CheckCircle2 className="h-4 min-h-4 w-4 min-w-4" />}>
			<div className="grid gap-2 text-xs sm:grid-cols-2">
				<div className="rounded-xl bg-secondary/60 px-3 py-2">
					<p className="text-xs text-muted-foreground">CLIENTE</p>
					<p className="font-bold">{state.client.nome || "Não informado"}</p>
				</div>
				<div className="rounded-xl bg-secondary/60 px-3 py-2">
					<p className="text-xs text-muted-foreground">VALOR BRUTO</p>
					<p className="font-bold">{formatToMoney(state.sale.valor)}</p>
				</div>
				<div className="rounded-xl bg-secondary/60 px-3 py-2">
					<p className="text-xs text-muted-foreground">RESGATE</p>
					<p className="font-bold">{formatCashbackValue(state.sale.cashback.aplicar ? state.sale.cashback.valor : 0, terminology)}</p>
				</div>
				<div className="rounded-xl bg-secondary/60 px-3 py-2">
					<p className="text-xs text-muted-foreground">VALOR FINAL</p>
					<p className="font-bold">{formatToMoney(finalValue)}</p>
				</div>
				{selectedPrize ? (
					<div className="rounded-xl bg-amber-50 px-3 py-2 text-amber-900 sm:col-span-2">
						<p className="text-amber-700">RECOMPENSA SELECIONADA</p>
						<p className="font-bold">{selectedPrize.titulo}</p>
					</div>
				) : null}
			</div>
		</ResponsiveMenuSection>
	);
}
