"use client";

import type { TGetCampaignsOutputById } from "@/app/api/campaigns/route";
import { getTriggerConfigSummary } from "@/app/dashboard/commercial/campaigns/id/[id]/_helpers/trigger-config-summary";
import { getCategoryById, getCategoryFromTrigger } from "@/app/dashboard/commercial/campaigns/new/_helpers/categories";
import { getTriggerMeta } from "@/app/dashboard/commercial/campaigns/new/_helpers/triggers";
import EditAudienceSection from "@/components/Modals/Campaigns/Sections/EditAudienceSection";
import EditEffectsSection from "@/components/Modals/Campaigns/Sections/EditEffectsSection";
import EditGeneralSection from "@/components/Modals/Campaigns/Sections/EditGeneralSection";
import EditSendSection from "@/components/Modals/Campaigns/Sections/EditSendSection";
import EditSettingsSection from "@/components/Modals/Campaigns/Sections/EditSettingsSection";
import { Button } from "@/components/ui/button";
import { SectionWrapper, SectionWrapperDataRow } from "@/components/ui/section-wrapper";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { formatToMoney } from "@/lib/formatting";
import type { TAttributionModelEnum } from "@/schemas/enums";
import { ArrowRightLeft, Clock, Coins, Filter, Lock, Pencil, SendHorizonal, Settings2, TextIcon, Users, Zap } from "lucide-react";
import { useState } from "react";

type CampaignConfigViewProps = {
	campaign: TGetCampaignsOutputById;
	membership: NonNullable<TAuthUserSession["membership"]>;
};

type OpenSection = "general" | "send" | "audience" | "effects" | "settings" | null;

const ATTRIBUTION_MODEL_LABELS: Record<TAttributionModelEnum, string> = {
	LAST_TOUCH: "Último toque",
	FIRST_TOUCH: "Primeiro toque",
	LINEAR: "Linear",
};

function formatInterval(value: number | null | undefined, unit: string | null | undefined) {
	if (value === null || value === undefined) return "Não definido";
	return `${value} ${(unit ?? "DIAS").toLowerCase()}`;
}

function EditAction({ onClick }: { onClick: () => void }) {
	return (
		<Button variant="ghost" size="xs" onClick={onClick} className="flex items-center gap-1">
			<Pencil className="h-4 w-4 min-h-4 min-w-4" />
			EDITAR
		</Button>
	);
}

export default function CampaignConfigView({ campaign, membership }: CampaignConfigViewProps) {
	const [openSection, setOpenSection] = useState<OpenSection>(null);

	const category = getCategoryById(getCategoryFromTrigger(campaign.gatilhoTipo));
	const trigger = getTriggerMeta(campaign.gatilhoTipo);
	const TriggerIcon = trigger?.icon ?? Zap;

	const activeSegmentations = campaign.segmentacoes ?? [];
	const isRecurrentLike = campaign.gatilhoTipo === "RECORRENTE" || campaign.gatilhoTipo === "USO-UNICO";

	const templateName = campaign.whatsappTemplate?.nome ?? null;
	const senderPhone = campaign.whatsappConexaoTelefone
		? `(${campaign.whatsappConexaoTelefone.numero}) ${campaign.whatsappConexaoTelefone.nome}`
		: null;
	const triggerSummary = getTriggerConfigSummary(campaign);

	function closeModal() {
		setOpenSection(null);
	}

	return (
		<div className="flex w-full flex-col gap-3">
			<div className="grid w-full grid-cols-1 items-start gap-3 lg:grid-cols-2">
				{/* Informações gerais */}
				<SectionWrapper
					title="INFORMAÇÕES GERAIS"
					icon={<TextIcon className="h-4 w-4 min-h-4 min-w-4" />}
					actions={<EditAction onClick={() => setOpenSection("general")} />}
				>
					<div className="flex w-full flex-col gap-2">
						<SectionWrapperDataRow icon={<TextIcon className="h-4 w-4 min-h-4 min-w-4" />} label="TÍTULO" value={campaign.titulo} />
						<div className="flex w-full flex-col gap-0.5">
							<h3 className="text-sm font-semibold tracking-tighter text-foreground/80">DESCRIÇÃO</h3>
							<p className="text-sm font-medium tracking-tight text-foreground">{campaign.descricao || "Nenhuma descrição definida..."}</p>
						</div>
					</div>
				</SectionWrapper>

				{/* Gatilho — read only */}
				<SectionWrapper title="GATILHO" icon={<TriggerIcon className="h-4 w-4 min-h-4 min-w-4" />}>
					<div className="flex w-full flex-col gap-2">
						<SectionWrapperDataRow icon={<Zap className="h-4 w-4 min-h-4 min-w-4" />} label="CATEGORIA" value={category?.label ?? "Não definida"} />
						<SectionWrapperDataRow
							icon={<TriggerIcon className="h-4 w-4 min-h-4 min-w-4" />}
							label="GATILHO"
							value={trigger?.label ?? campaign.gatilhoTipo}
						/>
						{triggerSummary.length > 0 ? (
							<div className="flex w-full flex-col gap-1">
								<h3 className="text-sm font-semibold tracking-tighter text-foreground/80">CONFIGURAÇÃO</h3>
								{triggerSummary.map((line) => (
									<p key={line} className="text-sm font-medium tracking-tight text-foreground">
										{line}
									</p>
								))}
							</div>
						) : null}
						{trigger?.description ? <p className="text-xs leading-snug text-muted-foreground">{trigger.description}</p> : null}
					</div>
					<div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
						<Lock className="mt-0.5 h-3.5 w-3.5 min-h-3.5 min-w-3.5 text-muted-foreground" />
						<p className="text-xs leading-snug text-muted-foreground">
							O gatilho não pode ser alterado após a criação. Para usar outro gatilho, crie uma nova campanha.
						</p>
					</div>
				</SectionWrapper>

				{/* Mensagem & Envio */}
				<SectionWrapper
					title="MENSAGEM & ENVIO"
					icon={<SendHorizonal className="h-4 w-4 min-h-4 min-w-4" />}
					actions={<EditAction onClick={() => setOpenSection("send")} />}
				>
					<div className="flex w-full flex-col gap-2">
						<SectionWrapperDataRow
							icon={<SendHorizonal className="h-4 w-4 min-h-4 min-w-4" />}
							label="TEMPLATE"
							value={templateName ?? "Template não selecionado"}
						/>
						<SectionWrapperDataRow
							icon={<Users className="h-4 w-4 min-h-4 min-w-4" />}
							label="REMETENTE WHATSAPP"
							value={senderPhone ?? "Sem remetente definido"}
						/>
						<SectionWrapperDataRow icon={<Clock className="h-4 w-4 min-h-4 min-w-4" />} label="FAIXA DE HORÁRIO" value={campaign.execucaoAgendadaBloco} />
						{!isRecurrentLike ? (
							<SectionWrapperDataRow
								icon={<Clock className="h-4 w-4 min-h-4 min-w-4" />}
								label="INTERVALO DE EXECUÇÃO"
								value={`${formatInterval(campaign.execucaoAgendadaValor, campaign.execucaoAgendadaMedida)} ${campaign.execucaoAgendadaDirecao === "ANTES" ? "antes" : "depois"} do evento`}
							/>
						) : null}
					</div>
				</SectionWrapper>

				{/* Público */}
				<SectionWrapper
					title="PÚBLICO"
					icon={<Filter className="h-4 w-4 min-h-4 min-w-4" />}
					actions={<EditAction onClick={() => setOpenSection("audience")} />}
				>
					<div className="flex w-full flex-col gap-2">
						<SectionWrapperDataRow
							icon={<Users className="h-4 w-4 min-h-4 min-w-4" />}
							label="SEGMENTAÇÕES"
							value={activeSegmentations.length > 0 ? `${activeSegmentations.length} ativa(s)` : "Todos os clientes"}
						/>
						{activeSegmentations.length > 0 ? (
							<p className="text-xs leading-snug text-muted-foreground">{activeSegmentations.map((s) => s.segmentacao).join(", ")}</p>
						) : null}
						<SectionWrapperDataRow
							icon={<Filter className="h-4 w-4 min-h-4 min-w-4" />}
							label="FILTROS ADICIONAIS"
							value={
								campaign.filtros && Array.isArray(campaign.filtros.itens) && campaign.filtros.itens.length > 0
									? `${campaign.filtros.itens.length} no grupo principal`
									: "Nenhum filtro"
							}
						/>
					</div>
				</SectionWrapper>

				{/* Efeitos / Cashback */}
				<SectionWrapper
					title="EFEITOS / CASHBACK"
					icon={<Coins className="h-4 w-4 min-h-4 min-w-4" />}
					actions={<EditAction onClick={() => setOpenSection("effects")} />}
				>
					<div className="flex w-full flex-col gap-2">
						{campaign.cashbackGeracaoAtivo ? (
							<>
								<SectionWrapperDataRow
									icon={<Coins className="h-4 w-4 min-h-4 min-w-4" />}
									label="GERAÇÃO DE CASHBACK"
									value={
										campaign.cashbackGeracaoTipo === "PERCENTUAL"
											? `${campaign.cashbackGeracaoValor ?? 0}% do valor da venda`
											: `${formatToMoney(campaign.cashbackGeracaoValor ?? 0)} fixo`
									}
								/>
								<SectionWrapperDataRow
									icon={<Clock className="h-4 w-4 min-h-4 min-w-4" />}
									label="EXPIRAÇÃO"
									value={
										campaign.cashbackGeracaoExpiracaoValor
											? formatInterval(campaign.cashbackGeracaoExpiracaoValor, campaign.cashbackGeracaoExpiracaoMedida)
											: "Padrão (30 dias)"
									}
								/>
							</>
						) : (
							<SectionWrapperDataRow icon={<Coins className="h-4 w-4 min-h-4 min-w-4" />} label="GERAÇÃO DE CASHBACK" value="Não gera cashback" />
						)}
					</div>
				</SectionWrapper>

				{/* Conversão & Ajustes */}
				<SectionWrapper
					title="CONVERSÃO & AJUSTES"
					icon={<Settings2 className="h-4 w-4 min-h-4 min-w-4" />}
					actions={<EditAction onClick={() => setOpenSection("settings")} />}
				>
					<div className="flex w-full flex-col gap-2">
						<SectionWrapperDataRow
							icon={<ArrowRightLeft className="h-4 w-4 min-h-4 min-w-4" />}
							label="MODELO DE ATRIBUIÇÃO"
							value={ATTRIBUTION_MODEL_LABELS[campaign.atribuicaoModelo] ?? campaign.atribuicaoModelo}
						/>
						<SectionWrapperDataRow
							icon={<Clock className="h-4 w-4 min-h-4 min-w-4" />}
							label="JANELA DE ATRIBUIÇÃO"
							value={`${campaign.atribuicaoJanelaDias ?? 0} dias`}
						/>
						<SectionWrapperDataRow
							icon={<Settings2 className="h-4 w-4 min-h-4 min-w-4" />}
							label="RECORRÊNCIA POR CLIENTE"
							value={
								campaign.permitirRecorrencia
									? `A cada ${formatInterval(campaign.frequenciaIntervaloValor, campaign.frequenciaIntervaloMedida)}`
									: "Não permite repetição"
							}
						/>
						<SectionWrapperDataRow
							icon={<SendHorizonal className="h-4 w-4 min-h-4 min-w-4" />}
							label="LIMITE SEMANAL DE ENVIOS"
							value={campaign.limiteEnviosSemanais ? `${campaign.limiteEnviosSemanais} por semana` : "Sem limite"}
						/>
					</div>
				</SectionWrapper>
			</div>

			{openSection === "general" ? <EditGeneralSection campaign={campaign} closeModal={closeModal} /> : null}
			{openSection === "send" ? (
				<EditSendSection
					campaign={campaign}
					organizationId={membership.organizacao.id}
					organizationName={membership.organizacao.nome}
					organizationLogoUrl={membership.organizacao.logoUrl}
					closeModal={closeModal}
				/>
			) : null}
			{openSection === "audience" ? <EditAudienceSection campaign={campaign} closeModal={closeModal} /> : null}
			{openSection === "effects" ? <EditEffectsSection campaign={campaign} closeModal={closeModal} /> : null}
			{openSection === "settings" ? <EditSettingsSection campaign={campaign} closeModal={closeModal} /> : null}
		</div>
	);
}
