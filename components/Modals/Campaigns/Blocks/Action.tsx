import SelectInput from "@/components/Inputs/SelectInput";
import NewWhatsappTemplate from "@/components/Modals/WhatsappTemplates/NewWhatsappTemplate";
import TemplatePreview from "@/components/Modals/WhatsappTemplates/Blocks/TemplatePreview";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { Button } from "@/components/ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useWhatsappConnection } from "@/lib/queries/whatsapp-connections";
import { useWhatsappTemplates } from "@/lib/queries/whatsapp-templates";
import { validateTemplateForTrigger } from "@/lib/whatsapp/template-variables";
import type { TUseCampaignState } from "@/state-hooks/use-campaign-state";
import { useQueryClient } from "@tanstack/react-query";
import { Eye, Info, Plus, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type CampaignsActionBlockProps = {
	organizationId: string;
	campaign: TUseCampaignState["state"]["campaign"];
	updateCampaign: TUseCampaignState["updateCampaign"];
};

export default function CampaignsActionBlock({ organizationId, campaign, updateCampaign }: CampaignsActionBlockProps) {
	const [showCreateTemplate, setShowCreateTemplate] = useState(false);
	const queryClient = useQueryClient();

	const { data: whatsappConnection } = useWhatsappConnection();
	const { data: whatsappTemplatesResult, updateParams } = useWhatsappTemplates({
		initialParams: { page: 1, search: "", whatsappConnectionPhoneId: campaign.whatsappConexaoTelefoneId, includeRecompraTemplates: true },
	});

	const whatsappConnectionPhones =
		whatsappConnection?.telefones.map((v) => ({
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
			toast.warning("Template removido: variáveis incompatíveis com o novo gatilho.");
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [campaign.gatilhoTipo]);

	// Find the selected template for status/quality display
	const selectedTemplate = useMemo(() => allTemplates.find((t) => t.id === campaign.whatsappTemplateId), [allTemplates, campaign.whatsappTemplateId]);
	const selectedTemplateComponents = selectedTemplate?.componentes;

	const rejectionReason = selectedTemplate?.rejeicao ?? null;
	return (
		<>
			{showCreateTemplate && (
				<NewWhatsappTemplate
					organizationId={organizationId}
					triggerContext={campaign.gatilhoTipo ?? undefined}
					closeMenu={() => setShowCreateTemplate(false)}
					callbacks={{
						onSuccess: ({ templateId }) => {
							if (templateId) updateCampaign({ whatsappTemplateId: templateId });
							queryClient.invalidateQueries({ queryKey: ["whatsapp-templates"] });
							setShowCreateTemplate(false);
						},
					}}
				/>
			)}
			<ResponsiveMenuSection title="AÇÃO" icon={<Send className="h-4 min-h-4 w-4 min-w-4" />}>
				<div className="w-full flex flex-col gap-1">
					<p className="text-center text-sm tracking-tight text-muted-foreground">Defina o template do WhatsApp que deve ser enviado.</p>
					<SelectInput
						label="TELEFONE DO WHATSAPP"
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
					<div className="flex items-end gap-2">
						<div className="flex-1 min-w-0">
							<SelectInput
								label="TEMPLATE DO WHATSAPP"
								value={campaign.whatsappTemplateId}
								editable={!!campaign.whatsappConexaoTelefoneId}
								resetOptionLabel={campaign.whatsappConexaoTelefoneId ? "SELECIONE O TEMPLATE" : "SELECIONE UM TELEFONE PRIMEIRO"}
								options={compatibleTemplates.map((template) => ({ id: template.id, label: template.nome, value: template.id }))}
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
										PREVIEW
									</Button>
								</HoverCardTrigger>
								<HoverCardContent className="w-[360px] p-2 overflow-auto max-h-[70vh]" side="left" align="end">
									<TemplatePreview components={selectedTemplateComponents} />
								</HoverCardContent>
							</HoverCard>
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
									<div className="flex cursor-help items-center gap-2 rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted/60">
										<Info className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
										<span>
											{hiddenCount} {hiddenCount === 1 ? "template foi ocultado" : "templates foram ocultados"} por uso de variáveis incompatíveis com o gatilho
											selecionado.
										</span>
									</div>
								</TooltipTrigger>
								<TooltipContent
									side="top"
									align="start"
									className="w-[360px] rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-xl"
								>
									<div className="flex max-h-72 flex-col gap-3 overflow-y-auto overscroll-y-contain pr-1 scrollbar-thin scrollbar-track-primary/10 scrollbar-thumb-primary/30">
										<p className="text-xs font-semibold uppercase tracking-wide text-foreground">Motivos do bloqueio</p>
										<div className="flex flex-col gap-2">
											{hiddenTemplates.map((template) => (
												<div key={template.id} className="rounded-lg border border-border/60 bg-muted/35 px-2.5 py-2">
													<p className="text-xs font-semibold text-foreground">{template.nome}</p>
													<p className="mt-1 text-xs text-muted-foreground">
														Variáveis incompatíveis: {template.incompatibleVariables.join(", ")}.
													</p>
												</div>
											))}
										</div>
									</div>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					)}
					{selectedTemplate && (
						<div className="flex flex-wrap items-center gap-2 rounded-md border border-primary/10 bg-muted/30 px-3 py-2">
							<span className="text-xs text-muted-foreground">Status:</span>
							<StatusBadge status={selectedTemplate.statusGeral} />
							<span className="text-xs text-muted-foreground ml-1">Qualidade:</span>
							<QualityBadge quality={selectedTemplate.qualidadeGeral} />
							{selectedTemplate.statusGeral === "REJEITADO" && rejectionReason && (
								<p className="w-full text-xs text-red-600 dark:text-red-400 mt-1">Motivo da rejeição: {rejectionReason}</p>
							)}
							{selectedTemplate.statusGeral === "PENDENTE" && (
								<p className="w-full text-xs text-yellow-600 dark:text-yellow-400 mt-1">Este template está aguardando aprovação da Meta.</p>
							)}
						</div>
					)}
				</div>
			</ResponsiveMenuSection>
		</>
	);
}

function StatusBadge({ status }: { status: string }) {
	const colorMap: Record<string, string> = {
		APROVADO: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
		PENDENTE: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
		REJEITADO: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
		RASCUNHO: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
		PAUSADO: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
		DESABILITADO: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
	};
	return (
		<span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${colorMap[status] ?? "bg-gray-100 text-gray-700"}`}>{status}</span>
	);
}

function QualityBadge({ quality }: { quality: string }) {
	const colorMap: Record<string, string> = {
		ALTA: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
		MEDIA: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
		BAIXA: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
		PENDENTE: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
	};
	return (
		<span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${colorMap[quality] ?? "bg-gray-100 text-gray-700"}`}>{quality}</span>
	);
}
