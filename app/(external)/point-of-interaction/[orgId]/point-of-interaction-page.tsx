"use client";

import TextInput from "@/components/Inputs/TextInput";
import { Button } from "@/components/ui/button";
import { captureClientEvent } from "@/lib/analytics/posthog-client";
import { getErrorMessage } from "@/lib/errors";
import { formatCashbackValue, formatToCPForCNPJ, formatToMoney, formatToPhone } from "@/lib/formatting";
import { createClientViaPointOfInteraction } from "@/lib/mutations/clients";
import { useClientByLookup } from "@/lib/queries/clients";
import type { TCashbackProgramEntity, TOrganizationEntity } from "@/services/drizzle/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BadgePercent, Building2, ChevronDown, ChevronUp, Clock, Delete, Gift, Loader2, Phone, ShoppingCart, UserPlus } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useAutoAdvanceTimer } from "./_shared/hooks/use-auto-advance-timer";
import { usePoiSounds } from "./_shared/hooks/use-poi-sounds";

type PointOfInteractionContentProps = {
	cashbackProgram: TCashbackProgramEntity;
	org: {
		id: TOrganizationEntity["id"];
		cnpj: TOrganizationEntity["cnpj"];
		nome: TOrganizationEntity["nome"];
		logoUrl: TOrganizationEntity["logoUrl"];
		telefone: TOrganizationEntity["telefone"];
	};
	mode: "kiosk" | "mobile";
};

function getCashbackAccumulationCopy(cashbackProgram: TCashbackProgramEntity): string {
	const { acumuloTipo, acumuloValor, acumuloRegraValorMinimo, terminologia } = cashbackProgram;

	let copy: string;

	if (acumuloTipo === "PERCENTUAL") {
		const referencePurchaseValue = 100;
		const earnedPerReference = (referencePurchaseValue * acumuloValor) / 100;
		copy = `A cada ${formatToMoney(referencePurchaseValue)} gastos, você ganha ${formatCashbackValue(earnedPerReference, terminologia)}`;
	} else {
		copy = `Ganhe ${formatCashbackValue(acumuloValor, terminologia)} por compra`;
	}

	if (acumuloRegraValorMinimo > 0) {
		copy += ` ( para compras a partir de ${formatToMoney(acumuloRegraValorMinimo)} )`;
	}

	return copy;
}

export default function PointOfInteractionContent({ org, cashbackProgram, mode }: PointOfInteractionContentProps) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { playAction, playSuccess } = usePoiSounds();
	const isMobileMode = mode === "mobile";

	// Phone number state (raw digits only)
	const [phoneDigits, setPhoneDigits] = useState("");
	const formattedPhone = formatToPhone(phoneDigits);
	const isPhoneComplete = phoneDigits.length === 11;

	// New client form state
	const [newClientName, setNewClientName] = useState("");
	const [newClientCpfCnpj, setNewClientCpfCnpj] = useState("");
	const [newClientDateOfBirth, setNewClientDateOfBirth] = useState("");
	const [showOptionalFields, setShowOptionalFields] = useState(false);

	// Client lookup
	const {
		data: client,
		queryKey,
		isLoading: isLoadingClient,
		isSuccess: isSuccessClient,
		updateParams,
	} = useClientByLookup({
		initialParams: { orgId: org.id, phone: "", clientId: null },
	});

	// Sync phone digits to lookup params
	useEffect(() => {
		if (isPhoneComplete) {
			updateParams({ phone: formattedPhone });
		} else {
			updateParams({ phone: "" });
		}
	}, [isPhoneComplete, formattedPhone, updateParams]);

	// Analytics
	useEffect(() => {
		captureClientEvent({
			event: "view_point_of_interaction_hub",
			properties: { organization_id: org.id },
		});
	}, [org.id]);

	// Auto-advance timer for found clients
	const handleAdvance = useCallback(() => {
		if (!client || !isPhoneComplete) return;
		const modeParam = isMobileMode ? "&mode=mobile" : "";
		router.push(`/point-of-interaction/${org.id}/new-transaction?clientId=${client.id}${modeParam}`);
	}, [client, isMobileMode, isPhoneComplete, org.id, router]);

	const { countdown, countdownSeconds, isAdvancing, wasCancelled, cancel, resetCancellation } = useAutoAdvanceTimer({
		shouldStart: isSuccessClient && !!client && isPhoneComplete,
		onAdvance: handleAdvance,
	});

	// Play sound when client is found
	useEffect(() => {
		if (isSuccessClient && client && !wasCancelled) {
			playAction();
		}
	}, [isSuccessClient, client, wasCancelled, playAction]);

	// Reset cancellation when phone changes
	useEffect(() => {
		if (phoneDigits && wasCancelled) {
			resetCancellation();
		}
	}, [phoneDigits, wasCancelled, resetCancellation]);

	// Create client mutation
	const { mutate: handleCreateClient, isPending: isCreatingClient } = useMutation({
		mutationKey: ["create-client-poi-v2"],
		mutationFn: createClientViaPointOfInteraction,
		onSuccess: (data) => {
			playSuccess();
			toast.success(data.message);
			const modeParam = isMobileMode ? "&mode=mobile" : "";
			router.push(`/point-of-interaction/${org.id}/new-transaction?clientId=${data.data.insertedClientId}${modeParam}`);
		},
		onError: (error) => {
			toast.error(getErrorMessage(error));
		},
	});

	// Virtual keypad handlers
	function handleKeyPress(digit: string) {
		if (phoneDigits.length >= 11) return;
		setPhoneDigits((prev) => prev + digit);
		playAction();
	}

	function handleBackspace() {
		setPhoneDigits((prev) => prev.slice(0, -1));
	}

	function clearClientLookup() {
		queryClient.cancelQueries({ queryKey: ["client-by-lookup"] });
		queryClient.removeQueries({ queryKey: ["client-by-lookup"] });
		updateParams({ phone: "", clientId: null });
	}

	function handleReset() {
		cancel();
		setPhoneDigits("");
		setNewClientName("");
		setNewClientCpfCnpj("");
		setNewClientDateOfBirth("");
		setShowOptionalFields(false);
		clearClientLookup();
		resetCancellation();
	}

	function handleCancelRedirect() {
		cancel();
		setPhoneDigits("");
		clearClientLookup();
	}

	function handleSubmitNewClient() {
		if (!newClientName || !formattedPhone) {
			toast.error("Preencha o nome do cliente.");
			return;
		}
		handleCreateClient({
			orgId: org.id,
			client: {
				nome: newClientName,
				telefone: formattedPhone,
				cpfCnpj: newClientCpfCnpj || null,
				// biome-ignore lint: dataNascimento schema transforms string->Date, but API receives string via JSON
				dataNascimento: (newClientDateOfBirth || null) as any,
			},
		});
	}

	// UI state: determine what to show
	const clientFound = isSuccessClient && !!client && !wasCancelled && isPhoneComplete;
	const clientNotFound = isSuccessClient && !client && isPhoneComplete;
	const isIdleState = !clientFound && !clientNotFound && !isAdvancing && !isLoadingClient;
	const isLoadingState = isLoadingClient && isPhoneComplete;

	return (
		<div className="grow bg-background flex flex-col items-center justify-center p-4 md:p-8">
			{/* ===== IDLE STATE: Org card + Keypad side by side ===== */}
			{isIdleState ? (
				<div className="w-full max-w-5xl flex flex-col md:flex-row items-center md:items-stretch gap-8 md:gap-12">
					{/* LEFT: Unified org card — brand hero header + program details list */}
					<div className="w-full md:w-[45%] flex flex-col">
						<div className="bg-card rounded-3xl shadow-xl border border-border/50 overflow-hidden flex flex-col flex-1">
							{/* Brand hero header */}
							<div className="bg-brand px-6 py-7 md:px-8 md:py-10 flex items-center gap-5">
								<div className="w-16 h-16 md:w-20 md:h-20 flex-shrink-0 flex items-center justify-center relative rounded-2xl overflow-hidden bg-white shadow-lg ring-2 ring-white/20">
									{org.logoUrl ? (
										<Image src={org.logoUrl} alt={org.nome} fill className="object-contain p-1.5 rounded-2xl" />
									) : (
										<Building2 className="w-9 h-9 text-brand" />
									)}
								</div>
								<div className="flex flex-col gap-0.5 min-w-0">
									<h1 className="text-xl md:text-2xl font-black tracking-tight leading-tight text-brand-foreground truncate">{org.nome}</h1>
									{org.telefone ? <p className="text-sm text-brand-foreground/70 font-medium">{formatToPhone(org.telefone)}</p> : null}
								</div>
							</div>

							{/* Program info rows */}
							<div className="px-5 py-4 md:px-7 md:py-5 flex flex-col flex-1 justify-evenly divide-y divide-border/50">
								{/* Accumulation */}
								<div className="flex items-center gap-3.5 py-3 first:pt-0 last:pb-0">
									<div className="bg-green-100 p-2.5 rounded-xl flex-shrink-0">
										<BadgePercent className="w-5 h-5 text-green-700" />
									</div>
									<div className="flex flex-col min-w-0">
										<span className="text-[0.65rem] font-bold uppercase text-muted-foreground tracking-widest">Acúmulo</span>
										<span className="text-sm font-extrabold text-foreground leading-snug">{getCashbackAccumulationCopy(cashbackProgram)}</span>
									</div>
								</div>

								{/* Expiration */}
								{cashbackProgram.expiracaoRegraValidadeValor > 0 ? (
									<div className="flex items-center gap-3.5 py-3 first:pt-0 last:pb-0">
										<div className="bg-amber-100 p-2.5 rounded-xl flex-shrink-0">
											<Clock className="w-5 h-5 text-amber-700" />
										</div>
										<div className="flex flex-col min-w-0">
											<span className="text-[0.65rem] font-bold uppercase text-muted-foreground tracking-widest">Validade</span>
											<span className="text-sm font-extrabold text-foreground leading-snug">
												{cashbackProgram.expiracaoRegraValidadeValor} dias para utilizar
											</span>
										</div>
									</div>
								) : null}

								{/* Discounts */}
								{cashbackProgram.modalidadeDescontosPermitida ? (
									<div className="flex items-center gap-3.5 py-3 first:pt-0 last:pb-0">
										<div className="bg-blue-100 p-2.5 rounded-xl flex-shrink-0">
											<ShoppingCart className="w-5 h-5 text-blue-700" />
										</div>
										<div className="flex flex-col min-w-0">
											<span className="text-[0.65rem] font-bold uppercase text-muted-foreground tracking-widest">Descontos</span>
											<span className="text-sm font-extrabold text-foreground leading-snug">Use seu saldo como desconto</span>
										</div>
									</div>
								) : null}

								{/* Rewards */}
								{cashbackProgram.modalidadeRecompensasPermitida ? (
									<div className="flex items-center gap-3.5 py-3 first:pt-0 last:pb-0">
										<div className="bg-purple-100 p-2.5 rounded-xl flex-shrink-0">
											<Gift className="w-5 h-5 text-purple-700" />
										</div>
										<div className="flex flex-col min-w-0">
											<span className="text-[0.65rem] font-bold uppercase text-muted-foreground tracking-widest">Recompensas</span>
											<span className="text-sm font-extrabold text-foreground leading-snug">Troque por prêmios exclusivos</span>
										</div>
									</div>
								) : null}
							</div>
						</div>
					</div>

					{/* RIGHT: Keypad or Mobile Input */}
					<div className="w-full md:w-[55%] flex flex-col justify-center">
						{isMobileMode ? (
							<div className="flex flex-col gap-5 items-center">
								<div className="text-center space-y-1">
									<h2 className="text-2xl font-black uppercase tracking-tight">Identifique-se</h2>
									<p className="text-sm text-muted-foreground">Digite seu número de telefone para começar</p>
								</div>
								<div className="w-full max-w-sm">
									<TextInput
										label="TELEFONE"
										inputType="tel"
										placeholder="(00) 00000-0000"
										value={formattedPhone}
										handleChange={(v) => {
											const digits = v.replace(/\D/g, "").slice(0, 11);
											setPhoneDigits(digits);
										}}
									/>
								</div>
							</div>
						) : (
							<div className="flex flex-col gap-3.5">
								{/* Phone showcase */}
								<div className="bg-card border border-border/50 rounded-2xl p-5 md:p-7 text-center shadow-xl">
									<p className="text-[0.65rem] font-bold uppercase text-muted-foreground tracking-widest mb-2">Número de Telefone</p>
									<div className="flex items-center justify-center min-h-[3.5rem]">
										{phoneDigits.length > 0 ? (
											<p className="text-4xl font-black tracking-wider text-foreground">{formattedPhone}</p>
										) : (
											<p className="text-4xl font-black tracking-wider text-muted-foreground/20">(00) 00000-0000</p>
										)}
									</div>
								</div>

								{/* Keypad — brand-colored buttons */}
								<div className="grid grid-cols-3 gap-2.5">
									{[7, 8, 9, 4, 5, 6, 1, 2, 3].map((digit) => (
										<button
											key={digit}
											type="button"
											disabled={phoneDigits.length >= 11}
											onClick={() => handleKeyPress(String(digit))}
											className="h-16 md:h-[4.25rem] rounded-xl bg-brand text-brand-foreground text-2xl md:text-3xl font-black hover:opacity-90 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-md"
										>
											{digit}
										</button>
									))}
									<button
										type="button"
										disabled={phoneDigits.length >= 11}
										onClick={() => handleKeyPress("0")}
										className="col-span-2 h-16 md:h-[4.25rem] rounded-xl bg-brand text-brand-foreground text-2xl md:text-3xl font-black hover:opacity-90 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-md"
									>
										0
									</button>
									<button
										type="button"
										onClick={handleBackspace}
										disabled={phoneDigits.length === 0}
										className="h-16 md:h-[4.25rem] rounded-xl bg-red-500 text-white hover:bg-red-600 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-md flex items-center justify-center"
									>
										<Delete className="w-7 h-7" />
									</button>
								</div>
							</div>
						)}
					</div>
				</div>
			) : null}

			{/* ===== LOADING STATE ===== */}
			{isLoadingState ? (
				<div className="w-full max-w-lg flex flex-col items-center justify-center gap-4 py-16 animate-in fade-in">
					<Loader2 className="w-12 h-12 text-brand animate-spin" />
					<div className="text-center">
						<p className="text-lg font-bold text-foreground">Buscando registros...</p>
						<p className="text-sm text-muted-foreground mt-1">Verificando o número {formattedPhone}</p>
					</div>
				</div>
			) : null}

			{/* ===== CLIENT FOUND ===== */}
			{clientFound && client ? (
				<div className="w-full max-w-xl flex flex-col items-center justify-center animate-in zoom-in duration-300">
					<div className="w-full bg-green-50 border-2 border-green-200 rounded-3xl p-8 md:p-10 flex flex-col items-center gap-5 shadow-lg">
						<div className="text-center">
							<p className="text-sm font-bold text-green-600 uppercase tracking-widest mb-2">&#10003; Perfil Encontrado</p>
							<p className="text-green-900 font-black text-3xl md:text-4xl uppercase italic tracking-tight">{client.nome}</p>
							<p className="text-green-600 font-bold text-lg mt-1">{formatToPhone(client.telefone)}</p>
						</div>

						<div className="bg-green-600 w-full rounded-2xl p-5 md:p-6 text-center text-white shadow-md">
							<p className="text-xs font-bold opacity-80 uppercase tracking-widest mb-1">Saldo Disponível</p>
							<p className="text-4xl md:text-5xl font-black">
								{formatCashbackValue(client.saldos[0]?.saldoValorDisponivel ?? 0, client.saldos[0]?.programa?.terminologia ?? cashbackProgram.terminologia)}
							</p>
						</div>

						<div className="w-full flex flex-col gap-2">
							<div className="w-full h-2.5 bg-green-200 rounded-full overflow-hidden">
								<div
									className="h-full bg-green-600 transition-all duration-1000 ease-linear"
									style={{ width: `${((countdown ?? 0) / countdownSeconds) * 100}%` }}
								/>
							</div>
							<p className="text-sm text-green-700 text-center font-medium">
								Avançando em {countdown} segundo{countdown !== 1 ? "s" : ""}...
							</p>
						</div>

						<Button
							type="button"
							variant="outline"
							size="fit"
							className="w-full p-4 font-black border-green-300 text-green-700 hover:bg-green-100 rounded-2xl text-base"
							onClick={handleCancelRedirect}
						>
							CANCELAR
						</Button>
					</div>
				</div>
			) : null}

			{/* ===== ADVANCING LOADER ===== */}
			{isAdvancing ? (
				<div className="w-full max-w-lg flex flex-col items-center justify-center gap-4 py-16 animate-in fade-in">
					<Loader2 className="w-12 h-12 text-green-600 animate-spin" />
					<p className="text-lg font-bold text-muted-foreground">Carregando...</p>
				</div>
			) : null}

			{/* ===== CLIENT NOT FOUND ===== */}
			{clientNotFound ? (
				<div className="w-full max-w-xl flex flex-col items-center justify-center animate-in zoom-in duration-300">
					<div className="w-full bg-blue-50 border-2 border-blue-200 rounded-3xl p-8 md:p-10 flex flex-col gap-5 shadow-lg">
						<div className="flex items-center gap-4 mb-1">
							<div className="p-3 bg-blue-600 rounded-xl text-white shadow-sm">
								<UserPlus className="w-7 h-7" />
							</div>
							<div>
								<h3 className="font-black uppercase text-blue-900 text-xl tracking-tight">NOVO CLIENTE</h3>
								<p className="text-sm text-blue-600">Complete os dados para criar o cadastro</p>
							</div>
						</div>

						<div className="w-fit flex items-center gap-2 self-center bg-blue-600 text-white px-5 py-2.5 rounded-xl shadow-sm">
							<Phone className="w-4 h-4" />
							<span className="text-sm font-bold tracking-wide">{formattedPhone}</span>
						</div>

						<form
							className="flex flex-col gap-4"
							onSubmit={(e) => {
								e.preventDefault();
								handleSubmitNewClient();
							}}
						>
							<TextInput label="NOME COMPLETO" placeholder="Digite o nome do cliente" value={newClientName} handleChange={setNewClientName} />

							<div className="w-full flex items-center justify-center">
								<Button
									type="button"
									variant="ghost"
									size="fit"
									className="w-fit flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
									onClick={() => setShowOptionalFields((prev) => !prev)}
								>
									{showOptionalFields ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
									MOSTRAR OUTROS DADOS
								</Button>
							</div>

							{showOptionalFields ? (
								<div className="flex flex-col gap-3">
									<TextInput
										label="CPF/CNPJ"
										inputType="tel"
										placeholder="Digite o CPF/CNPJ do cliente"
										value={newClientCpfCnpj}
										handleChange={(value) => setNewClientCpfCnpj(formatToCPForCNPJ(value))}
									/>
									<div className="flex flex-col gap-1.5">
										<label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">DATA DE NASCIMENTO</label>
										<input
											type="date"
											value={newClientDateOfBirth}
											onChange={(e) => setNewClientDateOfBirth(e.target.value)}
											className="w-full h-11 px-3 rounded-lg border border-input bg-background text-sm font-medium"
										/>
									</div>
								</div>
							) : null}

							<Button
								type="submit"
								size="lg"
								disabled={isCreatingClient || !newClientName}
								className="w-full mt-1 rounded-2xl h-16 text-lg font-bold shadow-lg shadow-blue-600/20 bg-blue-600 hover:bg-blue-700 uppercase tracking-widest"
							>
								{isCreatingClient ? (
									<>
										<Loader2 className="w-5 h-5 mr-2 animate-spin" />
										CADASTRANDO...
									</>
								) : (
									<>
										<UserPlus className="w-5 h-5 mr-2" />
										AVANÇAR
									</>
								)}
							</Button>
						</form>

						<div className="w-full flex items-center flex-col gap-1 pt-2">
							<p className="text-sm text-gray-500 font-medium">Outro número de telefone?</p>
							<button
								type="button"
								className="px-5 py-2.5 bg-gray-400 hover:bg-gray-500 text-white rounded-xl text-xs font-bold transition-colors"
								onClick={handleReset}
							>
								TENTAR OUTRO NÚMERO
							</button>
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
}
