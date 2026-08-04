"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { captureClientEvent } from "@/lib/analytics/posthog-client";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { getErrorMessage } from "@/lib/errors";
import { uploadFile } from "@/lib/files-storage";
import { useWhatsappConnections } from "@/lib/queries/whatsapp-connections";
import {
	completeOnboarding,
	createOrganization,
	seedOnboardingCampaigns,
	updateOrganization,
	upsertOnboardingCashback,
} from "@/lib/mutations/organizations";
import { PLATFORM_PARTNER_COOKIE_NAME } from "@/lib/platform-partnerships/constants";
import { isValidCNPJ } from "@/lib/validation";
import type { TOrganizationEntity } from "@/services/drizzle/schema";
import { useOrganizationOnboardingState } from "@/state-hooks/use-organization-onboarding-state";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { CampaignsConfigStage } from "./_components/CampaignsConfigStage";
import { CashbackConfigStage } from "./_components/CashbackConfigStage";
import { ConclusionStage } from "./_components/ConclusionStage";
import { DataSourceStage } from "./_components/DataSourceStage";
import { GeneralInfoStage } from "./_components/GeneralInfoStage";
import { OnboardingLayout } from "./_components/OnboardingLayout";
import { WhatsappConnectionStage } from "./_components/WhatsappConnectionStage";
import { ONBOARDING_STAGE_COOKIE, ONBOARDING_STAGES, type TOnboardingStage } from "./_lib/stages";

type ExistingOrganization =
	| (Pick<
			TOrganizationEntity,
			| "id"
			| "nome"
			| "cnpj"
			| "email"
			| "telefone"
			| "logoUrl"
			| "atuacaoNicho"
			| "atuacaoCanais"
			| "tamanhoBaseClientes"
			| "plataformasUtilizadas"
			| "origemLead"
			| "dadosViaPDI"
	  > & {
			/** Tipos das conexões de fonte de dados ativas em `integrations` (podem ser N). */
			integracoesAtivas: string[];
	  })
	| null;

type OnboardingPageProps = {
	user: TAuthUserSession["user"];
	initialStage: TOnboardingStage;
	existingOrganization: ExistingOrganization;
};

const STAGE_EVENTS: Record<TOnboardingStage, string> = {
	"organization-general-info": "onboarding_view_general_info",
	"cashback-config": "onboarding_view_cashback",
	"whatsapp-connection": "onboarding_view_whatsapp",
	"campaigns-config": "onboarding_view_campaigns",
	"data-source": "onboarding_view_data_source",
	conclusion: "onboarding_view_conclusion",
};

function persistStageCookie(stage: TOnboardingStage) {
	document.cookie = `${ONBOARDING_STAGE_COOKIE}=${stage}; path=/; max-age=${60 * 60 * 24}; samesite=lax`;
}

export function OnboardingPage({ user, initialStage, existingOrganization }: OnboardingPageProps) {
	const {
		state,
		updateOrganization: updateOrganizationState,
		updateOrganizationLogoHolder,
		updateOnboarding,
		updateCashback,
		applyCashbackPresetFromNiche,
		toggleCampaign,
		updateDataSource,
		goToNextStage,
		goToPreviousStage,
	} = useOrganizationOnboardingState({ initialStage, existingOrganization });

	const [isAdvancing, setIsAdvancing] = useState(false);
	const [orgCreatedThisSession, setOrgCreatedThisSession] = useState(false);
	const hasOrganization = !!existingOrganization || orgCreatedThisSession;
	const { data: whatsappConnections } = useWhatsappConnections();
	const hasWhatsappConnection = (whatsappConnections ?? []).some((connection) => connection.telefones.length > 0);

	// Persist the current stage so OAuth round-trips resume here.
	useEffect(() => {
		persistStageCookie(state.stage);
		captureClientEvent({ event: STAGE_EVENTS[state.stage], properties: { stage: state.stage } });
	}, [state.stage]);

	// Pre-fill referral code from the platform partner cookie (preserves prior behavior).
	useEffect(() => {
		const cookieCode = document.cookie
			.split("; ")
			.find((row) => row.startsWith(`${PLATFORM_PARTNER_COOKIE_NAME}=`))
			?.split("=")[1];
		if (!cookieCode) return;
		updateOnboarding({ indicadorCodigo: decodeURIComponent(cookieCode).trim().toUpperCase() });
		updateOrganizationState({ origemLead: "INDICAÇÃO" });
	}, [updateOnboarding, updateOrganizationState]);

	async function handleCreateOrganizationStep() {
		if (!state.termsAccepted) {
			toast.error("Aceite os Termos de Uso e Política de Privacidade para continuar.");
			return false;
		}
		if (!state.organization.nome.trim()) {
			toast.error("Preencha o nome da empresa.");
			return false;
		}
		if (!isValidCNPJ(state.organization.cnpj)) {
			toast.error("Preencha um CNPJ válido.");
			return false;
		}
		if (!state.organization.atuacaoNicho) {
			toast.error("Escolha o segmento de atuação da sua empresa.");
			return false;
		}

		let logoUrl: string | null = state.organization.logoUrl ?? null;
		if (state.organizationLogoHolder.file) {
			const { url } = await uploadFile({ file: state.organizationLogoHolder.file, fileName: state.organization.nome, prefix: "organizations" });
			logoUrl = url;
		}

		await createOrganization({
			organization: { ...state.organization, logoUrl },
			subscription: "FREE-TRIAL",
			indicadorCodigo: state.indicadorCodigo,
		});
		setOrgCreatedThisSession(true);
		captureClientEvent({ event: "onboarding_organization_created", properties: { niche: state.organization.atuacaoNicho } });
		// Seed cashback config from the chosen niche before entering the cashback stage.
		applyCashbackPresetFromNiche();
		return true;
	}

	async function handleCashbackStep() {
		await upsertOnboardingCashback({
			cashbackProgram: {
				ativo: state.cashback.ativo,
				titulo: state.cashback.titulo || `Programa de Cashback ${state.organization.nome}`,
				descricao: "Nosso programa de fidelidade.",
				terminologia: state.cashback.terminologia,
				modalidadeDescontosPermitida: state.cashback.modalidadeDescontosPermitida,
				modalidadeRecompensasPermitida: state.cashback.modalidadeRecompensasPermitida,
				acumuloTipo: state.cashback.acumuloTipo,
				acumuloValor: state.cashback.acumuloValor,
				acumuloValorParceiro: state.cashback.acumuloValorParceiro,
				acumuloRegraValorMinimo: state.cashback.acumuloRegraValorMinimo,
				acumuloPermitirViaIntegracao: state.cashback.acumuloPermitirViaIntegracao,
				acumuloPermitirViaPontoIntegracao: state.cashback.acumuloPermitirViaPontoIntegracao,
				expiracaoRegraValidadeValor: state.cashback.expiracaoRegraValidadeValor,
				resgateLimiteTipo: state.cashback.resgateLimiteTipo,
				resgateLimiteValor: state.cashback.resgateLimiteValor,
			},
		});
		return true;
	}

	function handleWhatsappStep() {
		if (!hasWhatsappConnection) {
			toast.error("Conecte um número de WhatsApp para continuar.");
			return false;
		}
		return true;
	}

	async function handleCampaignsStep() {
		if (state.selectedCampaignKeys.length === 0) {
			toast.error("Selecione ao menos uma campanha para continuar.");
			return false;
		}
		await seedOnboardingCampaigns({ cashbackAtivo: state.cashback.ativo, selectedKeys: state.selectedCampaignKeys });
		return true;
	}

	async function handleDataSourceStep() {
		if (!state.dataSource.mode) {
			toast.error("Escolha como os dados de vendas vão entrar no sistema.");
			return false;
		}
		if (state.dataSource.mode === "POI") {
			// Registro de vendas do POI é config explícita (D8) — a escolha do onboarding a grava.
			await updateOrganization({
				organization: { dadosViaPDI: true, origemDadosPadrao: "RECEPTOR", poiConfiguracao: { vendas: { registroAtivo: true } } },
			});
		}
		return true;
	}

	async function handleNext() {
		if (isAdvancing) return;
		setIsAdvancing(true);
		try {
			let ok = true;
			switch (state.stage) {
				case "organization-general-info":
					ok = await handleCreateOrganizationStep();
					break;
				case "cashback-config":
					ok = await handleCashbackStep();
					break;
				case "whatsapp-connection":
					ok = handleWhatsappStep();
					break;
				case "campaigns-config":
					ok = await handleCampaignsStep();
					break;
				case "data-source":
					ok = await handleDataSourceStep();
					break;
				default:
					ok = true;
			}
			if (ok) goToNextStage();
		} catch (error) {
			toast.error(getErrorMessage(error));
		} finally {
			setIsAdvancing(false);
		}
	}

	async function handleComplete() {
		if (isAdvancing) return;
		setIsAdvancing(true);
		try {
			const result = await completeOnboarding();
			window.location.href = result.data.redirectTo;
		} catch (error) {
			toast.error(getErrorMessage(error));
			setIsAdvancing(false);
		}
	}

	// Resume should not let the user step back before the org-creation stage once the org exists.
	const minStageIndex = hasOrganization ? ONBOARDING_STAGES.indexOf("cashback-config") : 0;
	const canGoBack = ONBOARDING_STAGES.indexOf(state.stage) > minStageIndex;

	const stageInfo = getStageInfo(state.stage);

	function renderStage() {
		switch (state.stage) {
			case "organization-general-info":
				return (
					<GeneralInfoStage
						state={state}
						updateOrganization={updateOrganizationState}
						updateOrganizationLogoHolder={updateOrganizationLogoHolder}
						updateOnboarding={updateOnboarding}
					/>
				);
			case "cashback-config":
				return <CashbackConfigStage state={state} updateCashback={updateCashback} />;
			case "whatsapp-connection":
				return <WhatsappConnectionStage />;
			case "campaigns-config":
				return <CampaignsConfigStage state={state} toggleCampaign={toggleCampaign} />;
			case "data-source":
				return <DataSourceStage state={state} updateDataSource={updateDataSource} />;
			case "conclusion":
				return <ConclusionStage state={state} onComplete={handleComplete} isCompleting={isAdvancing} />;
			default:
				return null;
		}
	}

	return (
		<OnboardingLayout currentStage={state.stage}>
			<div className="h-full flex w-full flex-col gap-6 min-h-0">
				<div className="flex flex-col gap-0.5">
					<h3 className="text-xs text-gray-500 tracking-tight">ETAPA {stageInfo.step} DE 6</h3>
					<h1 className="font-bold text-xl md:text-2xl text-gray-900 tracking-tight">{stageInfo.title}</h1>
					<p className="text-sm text-gray-500 tracking-tight">{stageInfo.description}</p>
				</div>
				<div
					key={state.stage}
					className="min-h-0 grow w-full flex flex-col gap-6 overflow-visible px-1 md:overflow-y-auto md:overscroll-y-contain scrollbar-thin scrollbar-track-primary/10 scrollbar-thumb-primary/30"
				>
					{renderStage()}
				</div>
				{state.stage !== "conclusion" && (
					<>
						<Separator />
						<div className="w-full flex items-center justify-between">
							<Button
								variant="ghost"
								size="lg"
								onClick={goToPreviousStage}
								disabled={!canGoBack || isAdvancing}
								className="flex items-center gap-1.5 rounded-xl py-3 disabled:opacity-40"
							>
								<ArrowLeft className="h-4 w-4" />
								VOLTAR
							</Button>
							<Button
								onClick={handleNext}
								disabled={isAdvancing}
								size="lg"
								className="flex items-center gap-1.5 bg-[#24549C] text-white hover:bg-[#1a3d7a] transition-all rounded-xl py-3"
							>
								{isAdvancing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
								CONTINUAR
								{!isAdvancing && <ArrowRight className="h-4 w-4" />}
							</Button>
						</div>
					</>
				)}
			</div>
		</OnboardingLayout>
	);
}

function getStageInfo(stage: TOnboardingStage): { step: number; title: string; description: string } {
	switch (stage) {
		case "organization-general-info":
			return { step: 1, title: "SOBRE A EMPRESA", description: "Dados básicos e o segmento de atuação do seu negócio." };
		case "cashback-config":
			return { step: 2, title: "CASHBACK", description: "Configure o programa de fidelidade do jeito que faz sentido para você." };
		case "whatsapp-connection":
			return { step: 3, title: "WHATSAPP", description: "Conecte o número que vai enviar suas campanhas." };
		case "campaigns-config":
			return { step: 4, title: "CAMPANHAS", description: "Escolha as automações de venda que vão rodar sozinhas." };
		case "data-source":
			return { step: 5, title: "FONTE DE DADOS", description: "Defina de onde virão os dados de vendas." };
		case "conclusion":
			return { step: 6, title: "TUDO PRONTO", description: "Revise e comece a usar o RecompraCRM." };
	}
}
