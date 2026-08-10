"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { VirtualKeyboard } from "@/components/ui/virtual-keyboard";
import { getErrorMessage } from "@/lib/errors";
import { formatToCPForCNPJ } from "@/lib/formatting";
import { createClientViaPointOfInteraction } from "@/lib/mutations/clients";
import { DEFAULT_LOGO_CHIP_COLOR, useLogoEdgeColor } from "@/lib/organizations/logo-color";
import type { TPoiRegistrationConfig } from "@/lib/point-of-interaction/registration";
import { cn } from "@/lib/utils";
import { isValidCpfCnpj } from "@/lib/validation";
import type { TCashbackProgramEntity, TOrganizationEntity } from "@/services/drizzle/schema";
import { useMutation } from "@tanstack/react-query";
import {
	ArrowLeft,
	ArrowRight,
	BadgePercent,
	Building2,
	CheckCircle2,
	ChevronDown,
	ChevronUp,
	Gift,
	Hourglass,
	Loader2,
	LockKeyhole,
	MessageCircleMore,
	PartyPopper,
	ShieldCheck,
	Sparkles,
	TicketPercent,
} from "lucide-react";
import Image from "next/image";
import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ClubIdentityCard } from "../components/club-identity-card";
import { SellerPicker } from "../components/seller-picker";
import { getCashbackAccumulationCopy } from "../helpers/cashback-copy";
import { useAutoAdvanceTimer } from "../hooks/use-auto-advance-timer";
import { usePoiSounds } from "../hooks/use-poi-sounds";
import { ProgressJourney } from "./progress-journey";
import { type TRegistrationAnswerDraft, type TRegistrationAnswers, buildRespostasCampos, isAnswerFilled, isFieldAnswerable, resolveAnswerValue } from "./registration-answers";
import { RegistrationFieldRenderer } from "./registration-field-renderer";
import { buildRegistrationSteps } from "./registration-steps";
import { useIdleReset } from "./use-idle-reset";

// Confete do sucesso: posições fixas, não sorteadas, para que servidor e cliente pintem o mesmo
// quadro na primeira renderização. As cores saem do tema da organização.
const CONFETTI_PIECES = [
	{ left: "8%", tone: "primary", delay: "0ms", rotation: "18deg" },
	{ left: "18%", tone: "foreground", delay: "180ms", rotation: "65deg" },
	{ left: "29%", tone: "accent", delay: "70ms", rotation: "110deg" },
	{ left: "41%", tone: "primary", delay: "240ms", rotation: "32deg" },
	{ left: "54%", tone: "accent", delay: "120ms", rotation: "145deg" },
	{ left: "66%", tone: "foreground", delay: "290ms", rotation: "85deg" },
	{ left: "78%", tone: "primary", delay: "40ms", rotation: "12deg" },
	{ left: "90%", tone: "accent", delay: "210ms", rotation: "125deg" },
] as const;

const CONFETTI_TONE_COLORS: Record<(typeof CONFETTI_PIECES)[number]["tone"], string> = {
	primary: "var(--poi-primary)",
	accent: "var(--poi-accent)",
	foreground: "var(--poi-primary-foreground)",
};

type RegistrationWizardProps = {
	org: {
		id: TOrganizationEntity["id"];
		nome: TOrganizationEntity["nome"];
		logoUrl: TOrganizationEntity["logoUrl"];
	};
	cashbackProgram: TCashbackProgramEntity;
	registrationConfig: TPoiRegistrationConfig;
	mode: "kiosk" | "mobile";
	flow: "transaction" | "profile";
	presetSellerId: string | null;
	/** Telefone já identificado no hub, formatado. O assistente só o exibe — não deixa editar. */
	phone: string;
	/** Volta à tela do telefone: "tentar outro número" e o reset por inatividade no quiosque. */
	onRestart: () => void;
	/** Continuação pós-cadastro — exatamente a mesma que o cadastro rápido executa hoje. */
	onContinue: (insertedClientId: string) => void;
};

/**
 * Assistente do cadastro COMPLETO do ponto de interação.
 *
 * Três telas no máximo, montadas a partir de `registrationConfig`: identificação, as perguntas que
 * a organização configurou (todas juntas, na ordem que ela escolheu) e o consentimento. Nada aqui
 * sabe quais campos existem — o passo do meio é uma lista do que veio da configuração.
 *
 * O ritmo é curto de propósito: no balcão, com fila atrás, o cliente aceita responder um punhado de
 * perguntas visíveis de uma vez, mas desiste de uma sequência de telas em que cada uma pede uma
 * resposta e esconde quantas ainda faltam.
 */
export function RegistrationWizard({ org, cashbackProgram, registrationConfig, mode, flow, presetSellerId, phone, onRestart, onContinue }: RegistrationWizardProps) {
	const isKiosk = mode === "kiosk";
	const isProfileFlow = flow === "profile";
	const { playAction, playSuccess } = usePoiSounds();

	const steps = useMemo(() => buildRegistrationSteps(registrationConfig.campos), [registrationConfig.campos]);

	// No quiosque a tela ociosa do hub já é a apresentação do clube (cartão da organização com os
	// benefícios do programa): repeti-la aqui só adicionaria um toque na frente da fila. No celular
	// o cliente chega direto do teclado do telefone, então a boas-vindas é a primeira coisa que
	// explica por que vale a pena preencher.
	const showWelcome = !isKiosk;

	const [screen, setScreen] = useState<"welcome" | "steps" | "success">(showWelcome ? "welcome" : "steps");
	const [stepIndex, setStepIndex] = useState(0);
	const [direction, setDirection] = useState<"forward" | "back">("forward");
	// Uma frase de erro por passo, em português, limpa a qualquer edição — o cliente nunca acumula
	// mensagens vermelhas de passos que já resolveu.
	const [error, setError] = useState("");

	const [nome, setNome] = useState("");
	const [cpfCnpj, setCpfCnpj] = useState("");
	const [showOptionalIdentity, setShowOptionalIdentity] = useState(false);
	const [authorSellerId, setAuthorSellerId] = useState<string | null>(presetSellerId);
	const [authorSellerSkipped, setAuthorSellerSkipped] = useState(false);
	const [answers, setAnswers] = useState<TRegistrationAnswers>({});
	const [consentimentoMarketing, setConsentimentoMarketing] = useState(false);
	const [insertedClientId, setInsertedClientId] = useState<string | null>(null);

	const showSellerSelection = !presetSellerId;
	const currentStep = steps[stepIndex];
	const isLastStep = stepIndex === steps.length - 1;
	const firstName = nome.trim().split(/\s+/)[0] ?? "";

	const contentRef = useRef<HTMLDivElement | null>(null);

	const { mutate: submitRegistration, isPending: isSubmitting } = useMutation({
		mutationKey: ["create-client-poi-wizard"],
		mutationFn: createClientViaPointOfInteraction,
		onSuccess: (data) => {
			playSuccess();
			toast.success(data.message);
			setInsertedClientId(data.data.insertedClientId);
			setDirection("forward");
			setScreen("success");
		},
		onError: (mutationError) => {
			// O servidor valida as respostas dentro da transação: se uma delas cai, o cadastro
			// inteiro é desfeito. Manter o cliente no passo de consentimento (com os dados que ele
			// digitou intactos) é o que permite corrigir e reenviar sem recomeçar.
			const message = getErrorMessage(mutationError);
			setError(message);
			toast.error(message);
		},
	});

	// ===== Reset por inatividade (só no quiosque) =====
	// Um tablet no balcão ficaria com o cadastro de outra pessoa aberto na tela até alguém reparar.
	// Desligado no sucesso (que tem o próprio avanço automático) e durante o envio.
	const isIdleResetEnabled = isKiosk && screen !== "success" && !isSubmitting;
	const { secondsRemaining, isWarning } = useIdleReset({ enabled: isIdleResetEnabled, onIdle: onRestart });

	const goToStep = useCallback(
		(nextIndex: number, nextDirection: "forward" | "back") => {
			setDirection(nextDirection);
			setStepIndex(nextIndex);
			setError("");
			playAction();
			// O quiosque não rola a janela (a tela inteira é o app); o celular sim.
			if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
		},
		[playAction],
	);

	// Zera o erro sempre que o cliente mexe em qualquer coisa.
	const updateAnswer = useCallback((campoId: string, draft: TRegistrationAnswerDraft) => {
		setAnswers((current) => ({ ...current, [campoId]: draft }));
		setError("");
	}, []);

	const validateCurrentStep = useCallback((): string => {
		if (!currentStep) return "";

		if (currentStep.tipo === "identity") {
			if (!nome.trim()) return "Preencha o nome para continuar.";
			if (cpfCnpj && !isValidCpfCnpj(cpfCnpj)) return "CPF/CNPJ inválido. Confira os números digitados.";
			return "";
		}

		// Uma tela, várias perguntas: só as obrigatórias barram o avanço, e a mensagem nomeia a
		// primeira que ficou em branco — "responda tudo" não diz ao cliente onde olhar.
		if (currentStep.tipo === "campos") {
			for (const campo of currentStep.campos) {
				const draft = answers[campo.campoId];
				if (!isAnswerFilled(draft)) {
					if (campo.obrigatorio && isFieldAnswerable(campo)) return `Responda "${campo.titulo}" para continuar.`;
					continue;
				}
				const resolved = resolveAnswerValue({ campo, draft: draft as TRegistrationAnswerDraft });
				if (resolved.erro !== null) return resolved.erro;
			}
			return "";
		}

		// Consentimento é opt-in: a recusa não trava o cadastro. Exigir a autorização de marketing
		// para entrar no clube tornaria o consentimento não-livre — e o clube funciona sem ela.
		return "";
	}, [answers, cpfCnpj, currentStep, nome]);

	const handleSubmit = useCallback(() => {
		const built = buildRespostasCampos({ campos: registrationConfig.campos, answers });
		if (built.erro) {
			setError(built.erro);
			return;
		}
		submitRegistration({
			orgId: org.id,
			client: {
				nome: nome.trim(),
				telefone: phone,
				cpfCnpj: cpfCnpj || null,
				// O assistente coleta a data de nascimento como campo configurável (`birth-date`),
				// que o servidor grava na coluna real via write-through — nunca por aqui.
				dataNascimento: null,
				autorVendedorId: authorSellerId,
			},
			customFieldAnswers: built.respostas,
			marketingConsent: consentimentoMarketing,
		});
	}, [answers, authorSellerId, consentimentoMarketing, cpfCnpj, nome, org.id, phone, registrationConfig.campos, submitRegistration]);

	const handleAdvance = useCallback(() => {
		const message = validateCurrentStep();
		if (message) {
			setError(message);
			return;
		}
		if (isLastStep) {
			handleSubmit();
			return;
		}
		goToStep(stepIndex + 1, "forward");
	}, [goToStep, handleSubmit, isLastStep, stepIndex, validateCurrentStep]);

	const handleBack = useCallback(() => {
		if (stepIndex > 0) {
			goToStep(stepIndex - 1, "back");
			return;
		}
		if (showWelcome) {
			setDirection("back");
			setScreen("welcome");
			setError("");
			playAction();
			return;
		}
		onRestart();
	}, [goToStep, onRestart, playAction, showWelcome, stepIndex]);

	// ===== Continuação pós-cadastro =====
	// A carteirinha aparece primeiro; depois o assistente entrega o cliente ao mesmo destino que o
	// cadastro rápido usa hoje (transação no caixa ou perfil do clube).
	const handleContinue = useCallback(() => {
		if (!insertedClientId) return;
		onContinue(insertedClientId);
	}, [insertedClientId, onContinue]);

	const {
		countdown: successCountdown,
		countdownSeconds: successCountdownSeconds,
		wasCancelled: successWasCancelled,
		cancel: cancelSuccessAdvance,
	} = useAutoAdvanceTimer({
		shouldStart: screen === "success" && !!insertedClientId,
		countdownSeconds: 6,
		onAdvance: handleContinue,
	});

	// Foco no início do passo: leitor de tela anuncia a pergunta nova em vez de manter o cursor no
	// botão que acabou de sumir.
	useEffect(() => {
		if (screen !== "steps") return;
		contentRef.current?.focus({ preventScroll: true });
	}, [screen]);

	// O chip da logo assume a cor da borda da própria logo: a maioria vem em quadrado com fundo
	// próprio, e um chip branco em volta faz a marca parecer colada por cima.
	const logoChipColor = useLogoEdgeColor(org.logoUrl);

	const stepAnimationClass = direction === "forward" ? "poi-step-forward" : "poi-step-back";
	const containerWidth = isKiosk ? "max-w-2xl" : "max-w-md";

	// =========================================================================
	// Sucesso
	// =========================================================================
	if (screen === "success") {
		return (
			<div className={cn("relative w-full flex flex-col items-center gap-4 short:gap-3", containerWidth)}>
				<div className="pointer-events-none absolute inset-x-0 top-0 h-56 overflow-hidden" aria-hidden="true">
					{CONFETTI_PIECES.map((piece) => (
						<span
							key={`${piece.left}-${piece.delay}`}
							className="poi-confetti absolute -top-4 h-3 w-1.5 rounded-full"
							style={
								{
									left: piece.left,
									backgroundColor: CONFETTI_TONE_COLORS[piece.tone],
									animationDelay: piece.delay,
									"--poi-confetti-rotation": piece.rotation,
								} as CSSProperties
							}
						/>
					))}
				</div>

				<div className="relative flex flex-col items-center text-center">
					<div className="poi-success-pop relative flex size-20 short:size-14 items-center justify-center rounded-full bg-brand/15 text-brand">
						<CheckCircle2 className="size-11 short:size-8" strokeWidth={2.2} />
						<PartyPopper className="absolute -right-1 -top-1 size-6 text-brand" />
					</div>
					<p className="mt-4 short:mt-2 text-[0.65rem] font-black uppercase tracking-[0.16em] text-muted-foreground">Cadastro concluído</p>
					<h2 className="mt-1 text-2xl short:text-xl font-black tracking-tight text-foreground">
						{firstName ? `Tudo certo, ${firstName}!` : "Tudo certo!"}
					</h2>
					<p className="mt-1.5 text-sm text-muted-foreground font-medium">Você já faz parte do clube. Esta é a sua carteirinha.</p>
				</div>

				<ClubIdentityCard
					org={{ nome: org.nome, logoUrl: org.logoUrl }}
					programTitle={cashbackProgram.titulo}
					client={{ nome: nome.trim(), telefone: phone, metadataTotalCompras: 0 }}
					saldoDisponivel={0}
					terminologia={cashbackProgram.terminologia}
					dataAdesao={new Date()}
					size={isKiosk ? "kiosk" : "mobile"}
				/>

				<Button
					type="button"
					size="lg"
					onClick={handleContinue}
					className="w-full rounded-2xl h-16 short:h-12 text-base font-black uppercase tracking-widest shadow-lg shadow-brand/20 bg-brand text-brand-foreground hover:bg-brand hover:opacity-90"
				>
					{isProfileFlow ? "VER MEU CLUBE" : "CONTINUAR"}
					<ArrowRight className="w-5 h-5 ml-2" />
				</Button>

				{successCountdown !== null && !successWasCancelled ? (
					<div className="w-full flex flex-col gap-2">
						<div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
							<div
								className="h-full bg-brand transition-all duration-1000 ease-linear motion-reduce:transition-none"
								style={{ width: `${(successCountdown / successCountdownSeconds) * 100}%` }}
							/>
						</div>
						<p className="text-sm text-muted-foreground text-center font-medium">
							Avançando em {successCountdown} segundo{successCountdown !== 1 ? "s" : ""}...
						</p>
						<Button
							type="button"
							variant="outline"
							size="fit"
							className="w-full p-3.5 font-black rounded-2xl text-sm uppercase tracking-widest"
							onClick={cancelSuccessAdvance}
						>
							CANCELAR
						</Button>
					</div>
				) : null}
			</div>
		);
	}

	// =========================================================================
	// Boas-vindas
	// =========================================================================
	if (screen === "welcome") {
		return (
			<div className={cn("w-full flex flex-col", containerWidth)}>
				<div className="poi-step-forward bg-card border-2 border-brand/20 rounded-3xl p-7 short:p-5 flex flex-col gap-5 shadow-xl">
					<div className="flex items-center gap-4">
						<div
							className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand/10"
							style={logoChipColor ? { backgroundColor: logoChipColor } : undefined}
						>
							{org.logoUrl ? (
								<Image src={org.logoUrl} alt={org.nome} fill sizes="56px" className="object-contain p-1.5" />
							) : (
								<Building2 className="size-7 text-brand" />
							)}
						</div>
						<div className="min-w-0">
							<p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-muted-foreground">{cashbackProgram.titulo || "Clube de benefícios"}</p>
							<h2 className="truncate text-xl font-black tracking-tight text-foreground">{org.nome}</h2>
						</div>
					</div>

					<div>
						<h1 className="text-2xl font-black leading-tight tracking-tight text-foreground">Toda compra vale mais quando você faz parte.</h1>
						<p className="mt-2 text-sm leading-relaxed text-muted-foreground">
							Leva menos de um minuto. Depois é só informar seu telefone para aproveitar seus benefícios.
						</p>
					</div>

					<div className="grid gap-2.5">
						{[
							{ icon: BadgePercent, text: getCashbackAccumulationCopy(cashbackProgram) },
							...(cashbackProgram.modalidadeDescontosPermitida ? [{ icon: TicketPercent, text: "Use seu saldo como desconto" }] : []),
							...(cashbackProgram.modalidadeRecompensasPermitida ? [{ icon: Gift, text: "Troque por prêmios exclusivos" }] : []),
							{ icon: ShieldCheck, text: "Seus dados protegidos pela LGPD" },
						].map((item) => (
							<div key={item.text} className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3.5">
								<span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-brand/10">
									<item.icon className="size-4 text-brand" />
								</span>
								<span className="text-sm font-bold text-foreground">{item.text}</span>
							</div>
						))}
					</div>

					<Button
						type="button"
						size="lg"
						onClick={() => {
							setDirection("forward");
							setScreen("steps");
							playAction();
						}}
						className="w-full rounded-2xl h-16 short:h-12 text-base font-black uppercase tracking-widest shadow-lg shadow-brand/20 bg-brand text-brand-foreground hover:bg-brand hover:opacity-90"
					>
						QUERO FAZER PARTE
						<ArrowRight className="w-5 h-5 ml-2" />
					</Button>

					<div className="w-full flex items-center flex-col gap-1">
						<p className="text-sm text-muted-foreground font-medium">Outro número de telefone?</p>
						<button
							type="button"
							className="px-5 py-2.5 border border-border bg-background text-foreground hover:bg-accent rounded-xl text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
							onClick={onRestart}
						>
							TENTAR OUTRO NÚMERO
						</button>
					</div>
				</div>
			</div>
		);
	}

	// =========================================================================
	// Passos
	// =========================================================================
	return (
		<div className={cn("w-full flex flex-col", containerWidth)}>
			<div className="overflow-hidden rounded-3xl border-2 border-brand/20 bg-card shadow-xl">
				{/* Cabeçalho de marca + trilha de progresso */}
				<header className="relative bg-brand px-5 pb-5 pt-5 short:pb-4 short:pt-4 text-brand-foreground">
					<div className="relative flex items-center gap-3">
						<div
							className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl ring-1 ring-brand-foreground/20"
							style={{ backgroundColor: logoChipColor ?? DEFAULT_LOGO_CHIP_COLOR }}
						>
							{org.logoUrl ? (
								<Image src={org.logoUrl} alt={org.nome} fill sizes="44px" className="object-contain p-1" />
							) : (
								<Building2 className="size-5 text-brand" />
							)}
						</div>
						<div className="min-w-0">
							<p className="truncate text-[0.62rem] font-bold uppercase tracking-[0.16em] text-brand-foreground/70">
								{cashbackProgram.titulo || "Clube de benefícios"}
							</p>
							<p className="truncate text-base font-black leading-tight">{org.nome}</p>
						</div>
						{isKiosk && isWarning ? (
							<span className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full bg-brand-foreground/15 px-3 py-1.5 text-[0.65rem] font-black uppercase tracking-wide">
								<Hourglass className="size-3.5" />
								{secondsRemaining}s
							</span>
						) : null}
					</div>

					<ProgressJourney steps={steps} currentIndex={stepIndex} className="mt-5 short:mt-4" />
				</header>

				{/* Conteúdo do passo — remontado por chave para reanimar a transição */}
				<div className="px-5 pb-5 pt-6 short:pt-4 sm:px-7">
					{/** biome-ignore lint/a11y/noNoninteractiveTabindex: alvo de foco programático a cada troca de passo */}
					<div key={currentStep?.chave ?? "step"} ref={contentRef} tabIndex={-1} className={cn("flex flex-col outline-none", stepAnimationClass)}>
						{currentStep?.tipo === "identity" ? (
							<section className="flex flex-col">
								<p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-muted-foreground">Vamos começar</p>
								<h1 className="mt-1.5 text-xl short:text-lg font-black tracking-tight text-foreground">Como podemos te chamar?</h1>
								<p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
									Cadastrando o telefone <span className="font-bold text-foreground whitespace-nowrap">{phone}</span>.
								</p>

								<div className="mt-5 flex flex-col gap-4">
									<div className="flex flex-col gap-1.5">
										<span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">NOME COMPLETO</span>
										{isKiosk ? (
											<VirtualKeyboard
												type="text"
												label="Nome completo"
												description="Digite o nome do cliente para criar o cadastro."
												placeholder="Digite o nome do cliente"
												value={nome}
												onChange={(value) => {
													setNome(value);
													setError("");
												}}
												confirmLabel="Confirmar nome"
												triggerClassName="h-16 short:h-14 justify-start text-left px-4 rounded-2xl border-2 border-border bg-card text-base font-medium"
											/>
										) : (
											<input
												type="text"
												autoComplete="name"
												placeholder="Digite seu nome"
												value={nome}
												onChange={(event) => {
													setNome(event.target.value);
													setError("");
												}}
												className="h-14 w-full rounded-2xl border-2 border-border bg-card px-4 text-base font-medium text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-brand"
											/>
										)}
										{nome.trim() ? (
											<p className="poi-validity-pop mt-0.5 flex items-center gap-1.5 text-xs font-bold text-brand">
												<CheckCircle2 className="size-3.5" />
												Prazer, {firstName}!
											</p>
										) : null}
									</div>

									{showSellerSelection ? (
										<SellerPicker
											orgId={org.id}
											selectedSellerId={authorSellerId}
											isSkipped={authorSellerSkipped}
											onSelectSeller={(sellerId) => {
												setAuthorSellerSkipped(false);
												setAuthorSellerId(sellerId);
												setError("");
											}}
											onSkip={() => {
												setAuthorSellerSkipped(true);
												setAuthorSellerId(null);
												setError("");
											}}
										/>
									) : null}

									{/* CPF continua aqui, e não como campo configurável, porque não existe no catálogo de
									    campos personalizados — sem esta gaveta o fluxo COMPLETO perderia uma captura que
									    o cadastro rápido oferece. */}
									<div className="w-full flex items-center justify-center">
										<Button
											type="button"
											variant="ghost"
											size="fit"
											className="w-fit flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
											onClick={() => setShowOptionalIdentity((prev) => !prev)}
										>
											{showOptionalIdentity ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
											{showOptionalIdentity ? "OCULTAR OUTROS DADOS" : "MOSTRAR OUTROS DADOS"}
										</Button>
									</div>

									{showOptionalIdentity ? (
										<div className="flex flex-col gap-1.5">
											<span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">CPF/CNPJ (OPCIONAL)</span>
											{isKiosk ? (
												<VirtualKeyboard
													type="numeric"
													label="CPF/CNPJ"
													description="Digite apenas os números do documento do cliente."
													placeholder="Digite o CPF/CNPJ do cliente"
													value={cpfCnpj.replace(/\D/g, "")}
													onChange={(value) => {
														setCpfCnpj(formatToCPForCNPJ(value));
														setError("");
													}}
													maxLength={14}
													formatValue={formatToCPForCNPJ}
													confirmLabel="Confirmar documento"
													triggerClassName={cn(
														"h-16 short:h-14 justify-start text-left px-4 rounded-2xl border-2 border-border bg-card text-base font-medium",
														cpfCnpj && !isValidCpfCnpj(cpfCnpj) && "border-destructive",
													)}
												/>
											) : (
												<input
													type="text"
													inputMode="numeric"
													placeholder="000.000.000-00"
													value={cpfCnpj}
													onChange={(event) => {
														setCpfCnpj(formatToCPForCNPJ(event.target.value));
														setError("");
													}}
													className={cn(
														"h-14 w-full rounded-2xl border-2 border-border bg-card px-4 text-base font-medium text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-brand",
														cpfCnpj && !isValidCpfCnpj(cpfCnpj) && "border-destructive",
													)}
												/>
											)}
											{cpfCnpj && !isValidCpfCnpj(cpfCnpj) ? <p className="text-xs font-medium text-destructive">CPF/CNPJ inválido — confira os números.</p> : null}
										</div>
									) : null}
								</div>
							</section>
						) : null}

						{currentStep?.tipo === "campos" ? (
							<section className="flex flex-col">
								<p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-muted-foreground">
									{firstName ? `Perfeito, ${firstName}` : "Quase lá"}
								</p>
								<h1 className="mt-1.5 text-xl short:text-lg font-black tracking-tight text-foreground">Conte um pouco sobre você</h1>

								{/* Uma pergunta embaixo da outra, cada uma com o próprio título. A única linha de
								    apoio possível é a `descricao` que a organização escreveu — nada é inventado aqui. */}
								<div className="mt-5 flex flex-col gap-6 short:gap-4">
									{currentStep.campos.map((campo) => (
										<div key={campo.campoId} className="flex flex-col">
											<div className="flex items-baseline justify-between gap-2">
												<h2 className={cn("font-black tracking-tight text-foreground", isKiosk ? "text-base" : "text-sm")}>{campo.titulo}</h2>
												{!campo.obrigatorio ? (
													<span className="shrink-0 text-[0.6rem] font-bold uppercase tracking-wider text-muted-foreground">Opcional</span>
												) : null}
											</div>
											{campo.descricao ? <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{campo.descricao}</p> : null}

											<div className="mt-2.5">
												<RegistrationFieldRenderer
													campo={campo}
													draft={answers[campo.campoId]}
													onChange={(draft) => updateAnswer(campo.campoId, draft)}
													isKiosk={isKiosk}
												/>
											</div>
										</div>
									))}
								</div>
							</section>
						) : null}

						{currentStep?.tipo === "consent" ? (
							<section className="flex flex-col">
								<div className="inline-flex size-11 items-center justify-center rounded-2xl bg-brand/15 text-brand">
									<LockKeyhole className="size-5" />
								</div>
								<p className="mt-4 text-[0.65rem] font-black uppercase tracking-[0.16em] text-muted-foreground">
									{firstName ? `Último passo, ${firstName}` : "Último passo"}
								</p>
								<h1 className="mt-1.5 text-xl short:text-lg font-black tracking-tight text-foreground">Você no controle dos seus dados</h1>
								<p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
									Seus dados são usados para identificar seus benefícios em {org.nome}. Com sua autorização, também avisamos quando houver novidades.
								</p>

								<label
									htmlFor="poi-consentimento-marketing"
									className={cn(
										"mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border-2 bg-background p-4 text-sm leading-relaxed transition-all",
										consentimentoMarketing ? "border-brand ring-4 ring-brand/10" : "border-border",
									)}
								>
									<Checkbox
										id="poi-consentimento-marketing"
										checked={consentimentoMarketing}
										onCheckedChange={(checked) => {
											setConsentimentoMarketing(checked === true);
											setError("");
										}}
										className="mt-0.5 size-5 rounded-md"
									/>
									<span className="font-medium text-foreground">
										Autorizo <span className="font-bold">{org.nome}</span> a me enviar ofertas e novidades do clube pelo WhatsApp.
									</span>
								</label>

								<div className="mt-4 grid gap-2.5">
									{[
										{ icon: MessageCircleMore, text: "Só ofertas e novidades desta loja" },
										{ icon: ShieldCheck, text: "Seus dados permanecem protegidos" },
										{ icon: CheckCircle2, text: "Cancele o recebimento quando quiser" },
									].map((item) => (
										<div key={item.text} className="flex items-center gap-3 rounded-2xl border border-border bg-background px-3.5 py-3">
											<span
												className={cn(
													"flex size-7 shrink-0 items-center justify-center rounded-full transition-colors",
													consentimentoMarketing ? "bg-brand text-brand-foreground" : "bg-muted text-muted-foreground",
												)}
											>
												<item.icon className="size-3.5" />
											</span>
											<span className="text-xs font-bold text-foreground">{item.text}</span>
										</div>
									))}
								</div>

								<p className="mt-3 text-xs leading-relaxed text-muted-foreground">
									Você pode entrar no clube sem autorizar o envio de mensagens — a caixa acima é opcional.
								</p>
							</section>
						) : null}
					</div>

					{/* Rodapé de navegação */}
					<div className="mt-6 short:mt-4">
						{error ? (
							<p role="alert" className="poi-error-shake mb-3 rounded-xl bg-destructive/10 px-3 py-2.5 text-center text-sm font-semibold text-destructive">
								{error}
							</p>
						) : null}

						<div className="grid grid-cols-[3.5rem_1fr] gap-2.5">
							<Button
								type="button"
								onClick={handleBack}
								variant="outline"
								aria-label="Voltar"
								disabled={isSubmitting}
								className="h-16 short:h-12 rounded-2xl border-2"
							>
								<ArrowLeft className="w-5 h-5" />
							</Button>
							{/* Sempre habilitado: quem barra o avanço é a validação, que diz QUAL pergunta falta.
							    Um botão apagado sem explicação é o que faz o cliente tocar duas vezes e desistir. */}
							<Button
								type="button"
								onClick={handleAdvance}
								disabled={isSubmitting}
								className="h-16 short:h-12 rounded-2xl text-base font-black uppercase tracking-widest shadow-lg shadow-brand/20 bg-brand text-brand-foreground hover:bg-brand hover:opacity-90"
							>
								{isSubmitting ? (
									<>
										<Loader2 className="w-5 h-5 mr-2 animate-spin motion-reduce:animate-none" />
										CADASTRANDO...
									</>
								) : isLastStep ? (
									<>
										{isProfileFlow ? "ENTRAR NO CLUBE" : "CONCLUIR CADASTRO"}
										<Sparkles className="w-5 h-5 ml-2" />
									</>
								) : (
									<>
										CONTINUAR
										<ArrowRight className="w-5 h-5 ml-2" />
									</>
								)}
							</Button>
						</div>
					</div>
				</div>
			</div>

			<div className="mt-4 w-full flex items-center flex-col gap-1">
				<p className="text-sm text-muted-foreground font-medium">Outro número de telefone?</p>
				<button
					type="button"
					className="px-5 py-2.5 border border-border bg-background text-foreground hover:bg-accent rounded-xl text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
					onClick={onRestart}
				>
					TENTAR OUTRO NÚMERO
				</button>
			</div>
		</div>
	);
}
