"use client";

import TextInput from "@/components/Inputs/TextInput";
import { Button } from "@/components/ui/button";
import { VirtualKeyboard } from "@/components/ui/virtual-keyboard";
import { captureClientEvent } from "@/lib/analytics/posthog-client";
import { getErrorMessage } from "@/lib/errors";
import { formatCashbackValue, formatToCPForCNPJ, formatToPhone } from "@/lib/formatting";
import { createClientViaPointOfInteraction } from "@/lib/mutations/clients";
import { useClientByLookup } from "@/lib/queries/clients";
import { usePoiSellers } from "@/lib/queries/sellers";
import { cn } from "@/lib/utils";
import { isValidCpfCnpj } from "@/lib/validation";
import type { TCashbackProgramEntity, TOrganizationEntity } from "@/services/drizzle/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
	BadgePercent,
	Building2,
	Check,
	ChevronDown,
	ChevronUp,
	Clock,
	Delete,
	Gift,
	HelpCircle,
	Loader2,
	ShoppingCart,
	UserPlus,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { getCashbackAccumulationCopy } from "./_shared/helpers/cashback-copy";
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
	// Destino pós-identificação/cadastro: "transaction" = fluxo de venda no caixa (padrão);
	// "profile" = clube de benefícios (perfil do cliente) — QR de mesa, link do vendedor.
	flow: "transaction" | "profile";
	// Vendedor pré-atribuído via link pessoal (?sellerId=), já validado no servidor.
	// Quando presente, o select "quem te atendeu" fica oculto.
	presetSellerId: string | null;
};

// Preview progressivo do teclado numérico: "31121990" -> "31/12/1990".
function formatBirthDateDigits(digits: string): string {
	const day = digits.slice(0, 2);
	const month = digits.slice(2, 4);
	const year = digits.slice(4, 8);
	return [day, month, year].filter((part) => part.length > 0).join("/");
}

// "DDMMAAAA" -> "AAAA-MM-DD" (o formato que o ClientSchema transforma em Date).
// Null = data incompleta ou inexistente (ex.: 31/02); nunca enviar DD/MM cru no payload.
function parseBirthDateDigitsToIso(digits: string): string | null {
	if (digits.length !== 8) return null;
	const day = Number(digits.slice(0, 2));
	const month = Number(digits.slice(2, 4));
	const year = Number(digits.slice(4, 8));
	const date = new Date(year, month - 1, day);
	const isRealDate = date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
	if (!isRealDate || year < 1900 || date.getTime() > Date.now()) return null;
	return `${digits.slice(4, 8)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`;
}

export default function PointOfInteractionContent({ org, cashbackProgram, mode, flow, presetSellerId }: PointOfInteractionContentProps) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { playAction, playSuccess } = usePoiSounds();
	const isMobileMode = mode === "mobile";
	const isProfileFlow = flow === "profile";

	// Phone number state (raw digits only)
	const [phoneDigits, setPhoneDigits] = useState("");
	const formattedPhone = formatToPhone(phoneDigits);
	const isPhoneComplete = phoneDigits.length === 11;

	// New client form state
	const [newClientName, setNewClientName] = useState("");
	const [newClientCpfCnpj, setNewClientCpfCnpj] = useState("");
	// Dígitos DDMMAAAA do teclado numérico; convertidos para ISO só no submit.
	const [newClientBirthDateDigits, setNewClientBirthDateDigits] = useState("");
	const [showOptionalFields, setShowOptionalFields] = useState(false);
	// "Quem te atendeu": seleção opcional — null = sem escolha, não trava a conversão.
	// authorSellerSkipped distingue "tocou em NÃO SEI" de "nem interagiu com o campo".
	// Com vendedor pré-atribuído via link, a seleção nasce feita e o select fica oculto.
	const [newClientAuthorSellerId, setNewClientAuthorSellerId] = useState<string | null>(presetSellerId);
	const [authorSellerSkipped, setAuthorSellerSkipped] = useState(false);

	const { data: poiSellers, isLoading: isLoadingPoiSellers } = usePoiSellers({ orgId: org.id });
	const showSellerSelection = !presetSellerId;

	// Client lookup
	const {
		data: client,
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
		if (isProfileFlow) {
			// Clube de benefícios: cliente já cadastrado vai direto ao perfil (consulta de saldo).
			router.push(`/point-of-interaction/${org.id}/client-profile/${client.id}${isMobileMode ? "?mode=mobile" : ""}`);
			return;
		}
		const modeParam = isMobileMode ? "&mode=mobile" : "";
		router.push(`/point-of-interaction/${org.id}/new-transaction?clientId=${client.id}${modeParam}`);
	}, [client, isMobileMode, isPhoneComplete, isProfileFlow, org.id, router]);

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
			if (isProfileFlow) {
				// Recém-entrou no clube: perfil com boas-vindas.
				router.push(`/point-of-interaction/${org.id}/client-profile/${data.data.insertedClientId}?welcome=true${isMobileMode ? "&mode=mobile" : ""}`);
				return;
			}
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
		setNewClientBirthDateDigits("");
		setNewClientAuthorSellerId(presetSellerId);
		setAuthorSellerSkipped(false);
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
		if (newClientCpfCnpj && !isValidCpfCnpj(newClientCpfCnpj)) {
			toast.error("CPF/CNPJ inválido. Confira os números digitados.");
			return;
		}
		let birthDateIso: string | null = null;
		if (newClientBirthDateDigits.length > 0) {
			birthDateIso = parseBirthDateDigitsToIso(newClientBirthDateDigits);
			if (!birthDateIso) {
				toast.error("Data de nascimento inválida. Confira o formato DD/MM/AAAA.");
				return;
			}
		}
		handleCreateClient({
			orgId: org.id,
			client: {
				nome: newClientName,
				telefone: formattedPhone,
				cpfCnpj: newClientCpfCnpj || null,
				// biome-ignore lint: dataNascimento schema transforms string->Date, but API receives string via JSON
				dataNascimento: birthDateIso as any,
				autorVendedorId: newClientAuthorSellerId,
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
				<div className="w-full max-w-xl flex flex-col items-center justify-center animate-in zoom-in duration-300 motion-reduce:animate-none">
					<div className="w-full bg-card border-2 border-brand/20 rounded-3xl p-8 md:p-10 short:p-5 flex flex-col gap-5 short:gap-3 shadow-xl">
						<div className="flex items-center gap-4 short:gap-3 mb-1 short:mb-0">
							<div className="p-3 short:p-2 bg-brand rounded-xl text-brand-foreground shadow-sm">
								<UserPlus className="w-7 h-7 short:w-5 short:h-5" />
							</div>
							<div className="min-w-0">
								<h3 className="font-black uppercase text-foreground text-xl short:text-lg tracking-tight">
									{isProfileFlow ? "CLUBE DE BENEFÍCIOS" : "NOVO CLIENTE"}
								</h3>
								<p className="text-sm text-muted-foreground">
									{isProfileFlow ? "Complete os dados para entrar no clube com" : "Complete os dados para cadastrar"}{" "}
									<span className="font-bold text-foreground whitespace-nowrap">{formattedPhone}</span>
								</p>
							</div>
						</div>

						<form
							className="flex flex-col gap-4 short:gap-3"
							onSubmit={(e) => {
								e.preventDefault();
								handleSubmitNewClient();
							}}
						>
							<div className="flex flex-col gap-1.5">
								<span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">NOME COMPLETO</span>
								<VirtualKeyboard
									type="text"
									label="Nome completo"
									description="Digite o nome do cliente para criar o cadastro."
									placeholder="Digite o nome do cliente"
									value={newClientName}
									onChange={setNewClientName}
									confirmLabel="Confirmar nome"
									triggerClassName="h-11 justify-start text-left px-3 rounded-lg border-input bg-background text-sm font-medium"
								/>
							</div>

							{showSellerSelection && isLoadingPoiSellers ? (
								<div className="flex flex-col gap-1.5">
									<span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">QUEM TE ATENDEU? (OPCIONAL)</span>
									<div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
										{[0, 1, 2, 3].map((placeholder) => (
											<div
												key={placeholder}
												className="flex flex-col items-center gap-1.5 rounded-xl border-2 border-border p-2.5 short:p-2 animate-pulse motion-reduce:animate-none"
											>
												<div className="w-12 h-12 short:w-10 short:h-10 rounded-full bg-muted" />
												<div className="h-2.5 w-12 rounded bg-muted" />
											</div>
										))}
									</div>
								</div>
							) : null}

							{showSellerSelection && !isLoadingPoiSellers && poiSellers && poiSellers.length > 0 ? (
								<div className="flex flex-col gap-1.5">
									<span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">QUEM TE ATENDEU? (OPCIONAL)</span>
									{/* Teto de altura: orgs com muitos vendedores rolam aqui dentro, o AVANÇAR nunca sai da dobra. */}
									<div className="max-h-[15.5rem] short:max-h-44 overflow-y-auto overscroll-contain pr-1">
										<div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
											{poiSellers.map((seller, sellerIndex) => {
												const isSelected = newClientAuthorSellerId === seller.id;
												return (
													<button
														key={seller.id}
														type="button"
														aria-pressed={isSelected}
														onClick={() => {
															setAuthorSellerSkipped(false);
															setNewClientAuthorSellerId((prev) => (prev === seller.id ? null : seller.id));
														}}
														style={{ animationDelay: `${Math.min(sellerIndex * 30, 240)}ms`, animationFillMode: "backwards" }}
														className={cn(
															"relative flex flex-col items-center gap-1.5 rounded-xl border-2 p-2.5 short:p-2 transition-all active:scale-95 motion-reduce:active:scale-100",
															"animate-in fade-in slide-in-from-bottom-2 motion-reduce:animate-none",
															"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2",
															isSelected ? "border-brand bg-brand/10 shadow-md" : "border-border bg-background hover:border-brand/50",
														)}
													>
														{isSelected ? (
															<span className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-5 h-5 rounded-full bg-brand text-brand-foreground shadow-sm">
																<Check className="w-3 h-3" strokeWidth={3} />
															</span>
														) : null}
														<div className="relative w-12 h-12 short:w-10 short:h-10 rounded-full overflow-hidden bg-brand/10 flex items-center justify-center">
															{seller.avatarUrl ? (
																<Image src={seller.avatarUrl} alt={seller.nome} fill sizes="48px" className="object-cover" />
															) : (
																<span className="text-base font-black text-foreground/80">
																	{seller.nome
																		.split(" ")
																		.slice(0, 2)
																		.map((part) => part.charAt(0).toUpperCase())
																		.join("")}
																</span>
															)}
														</div>
														<span className="w-full text-[0.65rem] font-bold uppercase leading-tight text-center truncate text-foreground">
															{seller.nome.split(" ")[0]}
														</span>
													</button>
												);
											})}
											<button
												type="button"
												aria-pressed={authorSellerSkipped}
												onClick={() => {
													setAuthorSellerSkipped(true);
													setNewClientAuthorSellerId(null);
												}}
												style={{ animationDelay: `${Math.min(poiSellers.length * 30, 240)}ms`, animationFillMode: "backwards" }}
												className={cn(
													"relative flex flex-col items-center gap-1.5 rounded-xl border-2 border-dashed p-2.5 short:p-2 transition-all active:scale-95 motion-reduce:active:scale-100",
													"animate-in fade-in slide-in-from-bottom-2 motion-reduce:animate-none",
													"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2",
													authorSellerSkipped ? "border-brand bg-brand/10 shadow-md" : "border-border bg-background hover:border-brand/50",
												)}
											>
												{authorSellerSkipped ? (
													<span className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-5 h-5 rounded-full bg-brand text-brand-foreground shadow-sm">
														<Check className="w-3 h-3" strokeWidth={3} />
													</span>
												) : null}
												<div className="relative w-12 h-12 short:w-10 short:h-10 rounded-full bg-muted flex items-center justify-center">
													<HelpCircle className="w-6 h-6 text-muted-foreground" />
												</div>
												<span className="w-full text-[0.65rem] font-bold uppercase leading-tight text-center truncate text-muted-foreground">NÃO SEI</span>
											</button>
										</div>
									</div>
								</div>
							) : null}

							<div className="w-full flex items-center justify-center">
								<Button
									type="button"
									variant="ghost"
									size="fit"
									className="w-fit flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
									onClick={() => setShowOptionalFields((prev) => !prev)}
								>
									{showOptionalFields ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
									{showOptionalFields ? "OCULTAR OUTROS DADOS" : "MOSTRAR OUTROS DADOS"}
								</Button>
							</div>

							{showOptionalFields ? (
								<div className="flex flex-col gap-3">
									<div className="flex flex-col gap-1.5">
										<span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">CPF/CNPJ</span>
										<VirtualKeyboard
											type="numeric"
											label="CPF/CNPJ"
											description="Digite apenas os números do documento do cliente."
											placeholder="Digite o CPF/CNPJ do cliente"
											value={newClientCpfCnpj.replace(/\D/g, "")}
											onChange={(value) => setNewClientCpfCnpj(formatToCPForCNPJ(value))}
											maxLength={14}
											formatValue={formatToCPForCNPJ}
											confirmLabel="Confirmar documento"
											triggerClassName={cn(
												"h-11 justify-start text-left px-3 rounded-lg border-input bg-background text-sm font-medium",
												newClientCpfCnpj && !isValidCpfCnpj(newClientCpfCnpj) && "border-destructive",
											)}
										/>
										{newClientCpfCnpj && !isValidCpfCnpj(newClientCpfCnpj) ? (
											<p className="text-xs font-medium text-destructive">CPF/CNPJ inválido — confira os números.</p>
										) : null}
									</div>
									<div className="flex flex-col gap-1.5">
										<span className="text-xs font-bold uppercase text-muted-foreground tracking-wider">DATA DE NASCIMENTO</span>
										<VirtualKeyboard
											type="numeric"
											label="Data de nascimento"
											description="Digite dia, mês e ano (DD/MM/AAAA)."
											placeholder="DD/MM/AAAA"
											value={newClientBirthDateDigits}
											onChange={setNewClientBirthDateDigits}
											maxLength={8}
											formatValue={formatBirthDateDigits}
											confirmLabel="Confirmar data"
											triggerClassName="h-11 justify-start text-left px-3 rounded-lg border-input bg-background text-sm font-medium"
										/>
									</div>
								</div>
							) : null}

							<Button
								type="submit"
								size="lg"
								disabled={isCreatingClient || !newClientName}
								className="w-full mt-1 short:mt-0 rounded-2xl h-16 short:h-12 text-lg short:text-base font-bold shadow-lg shadow-brand/20 bg-brand text-brand-foreground hover:bg-brand hover:opacity-90 uppercase tracking-widest"
							>
								{isCreatingClient ? (
									<>
										<Loader2 className="w-5 h-5 mr-2 animate-spin" />
										CADASTRANDO...
									</>
								) : (
									<>
										<UserPlus className="w-5 h-5 mr-2" />
										{isProfileFlow ? "ENTRAR NO CLUBE" : "AVANÇAR"}
									</>
								)}
							</Button>
							{!newClientName ? <p className="text-xs text-muted-foreground text-center -mt-2 short:-mt-1">Preencha o nome para continuar</p> : null}
						</form>

						<div className="w-full flex items-center flex-col gap-1 pt-2">
							<p className="text-sm text-muted-foreground font-medium">Outro número de telefone?</p>
							<button
								type="button"
								className="px-5 py-2.5 border border-border bg-background text-foreground hover:bg-accent rounded-xl text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
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
