import SelectInput from "@/components/Inputs/SelectInput";
import NewWhatsappTemplate from "@/components/Modals/WhatsappTemplates/NewWhatsappTemplate";
import TemplatePreview from "@/components/Modals/WhatsappTemplates/Blocks/TemplatePreview";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { Button } from "@/components/ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useWhatsappConnection } from "@/lib/queries/whatsapp-connections";
import { useWhatsappTemplates } from "@/lib/queries/whatsapp-templates";
import { whatsappTemplateComponentsToMessageContent } from "@/lib/message-templates";
import { validateTemplateForTrigger } from "@/lib/whatsapp/template-variables";
import type { TUseCampaignState } from "@/state-hooks/use-campaign-state";
import { useQueryClient } from "@tanstack/react-query";
import { Eye, Info, Pencil, Plus, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import ControlWhatsappTemplate from "../../WhatsappTemplates/ControlWhatsappTemplate";
import { cn } from "@/lib/utils";
import { getWhatsappTemplateStatusUIDetails } from "@/utils/select-options";

type CampaignsActionBlockProps = {
	organizationId: string;
	campaign: TUseCampaignState["state"]["campaign"];
	updateCampaign: TUseCampaignState["updateCampaign"];
};

export default function CampaignsActionBlock({ organizationId, campaign, updateCampaign }: CampaignsActionBlockProps) {
	const [showCreateTemplate, setShowCreateTemplate] = useState(false);
	const [editTemplateId, setEditTemplateId] = useState<string | null>(null);
	const queryClient = useQueryClient();

	const { data: whatsappConnections } = useWhatsappConnection();
	const {
		data: whatsappTemplatesResult,
		updateParams,
		queryKey,
	} = useWhatsappTemplates({
		initialParams: { page: 1, search: "", whatsappConnectionPhoneId: campaign.whatsappConexaoTelefoneId, includeRecompraTemplates: true },
	});

	const whatsappConnectionPhones =
		whatsappConnections
			?.flatMap((v) => v.telefones)
			.map((v) => ({
				id: v.id,
				label: `(${v.numero}) - ${v.nome}`,
				value: v.id,
			})) ?? [];

	const allTemplates = whatsappTemplatesResult?.whatsappTemplates ?? [];

	// Filter templates by trigger compatibility
	const { compatibleTemplates, hiddenTemplates, hiddenCount } = useMemo(() => {
		if (!campaign.gatilhoTipo) return { compatibleTemplates: allTemplates, hiddenTemplates: [], hiddenCount: 0 };

		const compatible = [];
		const hidden = [];

		for (const template of allTemplates) {
			const validation = validateTemplateForTrigger(template.bodyParametros, campaign.gatilhoTipo);
			if (validation.valid) {
				compatible.push(template);
				continue;
			}

			hidden.push({
				id: template.id,
				nome: template.nome,
				incompatibleVariables: validation.incompatibleVariables,
			});
		}

		return { compatibleTemplates: compatible, hiddenTemplates: hidden, hiddenCount: hidden.length };
	}, [allTemplates, campaign.gatilhoTipo]);

	// Clear template when trigger type changes and selected template becomes incompatible
	useEffect(() => {
		if (!campaign.whatsappTemplateId || !campaign.gatilhoTipo || allTemplates.length === 0) return;
		const selectedTemplate = allTemplates.find((t) => t.id === campaign.whatsappTemplateId);
		if (!selectedTemplate) return;
		const validation = validateTemplateForTrigger(selectedTemplate.bodyParametros, campaign.gatilhoTipo);
		if (!validation.valid) {
			updateCampaign({ whatsappTemplateId: "" });
			toast.warning("Template desmarcado: as variáveis dele não são compatíveis com o novo tipo de gatilho.");
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [campaign.gatilhoTipo]);

	const handleOnMutate = async () => await queryClient.cancelQueries({ queryKey });
	const handleOnSettled = async () => await queryClient.invalidateQueries({ queryKey });
	// Find the selected template for status/quality display
	const selectedTemplate = useMemo(() => allTemplates.find((t) => t.id === campaign.whatsappTemplateId), [allTemplates, campaign.whatsappTemplateId]);
	const selectedTemplateComponents = selectedTemplate?.componentes;

	return (
		<>
			{showCreateTemplate && (
				<NewWhatsappTemplate
					organizationId={organizationId}
					triggerContext={campaign.gatilhoTipo ?? undefined}
					closeMenu={() => setShowCreateTemplate(false)}
					callbacks={{
						onMutate: handleOnMutate,
						onSuccess: ({ templateId }) => {
							if (templateId) updateCampaign({ whatsappTemplateId: templateId });
							handleOnSettled();
							setShowCreateTemplate(false);
						},
					}}
				/>
			)}
			{editTemplateId ? (
				<ControlWhatsappTemplate
					whatsappTemplateId={editTemplateId}
					organizationId={organizationId}
					closeMenu={() => setEditTemplateId(null)}
					callbacks={{
						onMutate: handleOnMutate,
						onSuccess: () => {
							handleOnSettled();
							setEditTemplateId(null);
						},
					}}
				/>
			) : null}
			<ResponsiveMenuSection title="AÇÃO" icon={<Send className="h-4 min-h-4 w-4 min-w-4" />}>
				<div className="w-full flex flex-col gap-3">
					<p className="text-center text-sm tracking-tight leading-snug text-muted-foreground">
						Quando o gatilho disparar para um cliente elegível, esta campanha envia uma mensagem pelo WhatsApp oficial da empresa. Escolha de qual número
						sai o envio e qual modelo (template) será usado — apenas números já conectados e templates aprovados aparecem aqui.
					</p>
					<SelectInput
						label="TELEFONE DO WHATSAPP (REMETENTE)"
						value={campaign.whatsappConexaoTelefoneId}
						resetOptionLabel="SELECIONE O TELEFONE"
						options={whatsappConnectionPhones}
						handleChange={(value) => {
							updateCampaign({ whatsappConexaoTelefoneId: value, whatsappTemplateId: "" });
							updateParams({ whatsappConnectionPhoneId: value });
						}}
						onReset={() => {
							updateCampaign({ whatsappConexaoTelefoneId: "", whatsappTemplateId: "" });
							updateParams({ whatsappConnectionPhoneId: undefined });
						}}
						width="100%"
					/>
					<p className="text-center text-xs leading-snug text-muted-foreground">
						A lista de templates é filtrada pelo tipo de gatilho da campanha: só entram modelos cujas variáveis esse gatilho consegue preencher.
					</p>
					<div className="flex items-end gap-2">
						<div className="flex-1 min-w-0">
							<SelectInput
								label="TEMPLATE DO WHATSAPP (CONTEÚDO DA MENSAGEM)"
								value={campaign.whatsappTemplateId}
								editable={!!campaign.whatsappConexaoTelefoneId}
								resetOptionLabel={campaign.whatsappConexaoTelefoneId ? "SELECIONE O TEMPLATE" : "SELECIONE UM TELEFONE PRIMEIRO"}
								options={compatibleTemplates.map((template) => {
									const details = getWhatsappTemplateStatusUIDetails(template.statusGeral);
									return {
										startContent: details ? (
											<div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-lg", details.colors.background)}>
												{details.icon}
												<span className={cn("text-[0.65rem] font-semibold uppercase", details.colors.text)}>{details.label}</span>
											</div>
										) : null,
										id: template.id,
										label: template.nome,
										value: template.id,
									};
								})}
								handleChange={(value) => updateCampaign({ whatsappTemplateId: value })}
								onReset={() => updateCampaign({ whatsappTemplateId: "" })}
								width="100%"
							/>
						</div>
					</div>
					<div className="w-full flex items-center justify-end gap-3">
						{selectedTemplate && selectedTemplateComponents ? (
							<HoverCard openDelay={200}>
								<HoverCardTrigger asChild>
									<Button type="button" size="sm" variant="ghost" className="flex items-center gap-1.5">
										<Eye className="h-3.5 w-3.5" />
										PRÉ-VISUALIZAR
									</Button>
								</HoverCardTrigger>
								<HoverCardContent className="w-[360px] p-2 overflow-auto max-h-[70vh]" side="left" align="end">
									<TemplatePreview content={whatsappTemplateComponentsToMessageContent(selectedTemplateComponents)} />
								</HoverCardContent>
							</HoverCard>
						) : null}
						{selectedTemplate ? (
							<Button type="button" size="sm" variant="ghost" className="flex items-center gap-1.5" onClick={() => setEditTemplateId(selectedTemplate.id)}>
								<Pencil className="h-3.5 w-3.5" />
								EDITAR
							</Button>
						) : null}
						<Button
							type="button"
							size="sm"
							variant="ghost"
							className="flex items-center gap-1.5"
							onClick={() => setShowCreateTemplate(true)}
							disabled={!campaign.whatsappConexaoTelefoneId}
						>
							<Plus className="h-3.5 w-3.5" />
							CRIAR
						</Button>
					</div>
					{hiddenCount > 0 && (
						<TooltipProvider>
							<Tooltip delayDuration={150}>
								<TooltipTrigger asChild>
									<div className="flex cursor-help items-center gap-2 rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-xs leading-snug text-muted-foreground transition-colors hover:bg-muted/60">
										<Info className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
										<span>
											{hiddenCount === 1 ? (
												<>Mais um template não aparece aqui porque usa variáveis que este tipo de gatilho não fornece.</>
											) : (
												<>Mais {hiddenCount} templates não aparecem aqui porque usam variáveis que este tipo de gatilho não fornece.</>
											)}{" "}
											Passe o cursor para ver o nome de cada um e quais variáveis são.
										</span>
									</div>
								</TooltipTrigger>
								<TooltipContent
									side="top"
									align="start"
									className="w-[360px] rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-xl"
								>
									<div className="flex max-h-72 flex-col gap-3 overflow-y-auto overscroll-y-contain pr-1 scrollbar-thin scrollbar-track-primary/10 scrollbar-thumb-primary/30">
										<p className="text-xs font-semibold uppercase tracking-wide text-foreground">Templates fora da lista</p>
										<div className="flex flex-col gap-2">
											{hiddenTemplates.map((template) => (
												<div key={template.id} className="rounded-lg border border-border/60 bg-muted/35 px-2.5 py-2">
													<p className="text-xs font-semibold text-foreground">{template.nome}</p>
													<p className="mt-1 text-xs leading-snug text-muted-foreground">
														Variáveis que este gatilho não preenche: {template.incompatibleVariables.join(", ")}.
													</p>
												</div>
											))}
										</div>
									</div>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					)}
				</div>
			</ResponsiveMenuSection>
		</>
	);
}
