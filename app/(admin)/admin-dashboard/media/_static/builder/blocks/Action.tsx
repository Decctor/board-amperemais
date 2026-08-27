"use client";
/*
 * CÓPIA ESTÁTICA — não é o componente de produção.
 * Origem: app/dashboard/growth/campaigns/_module/shared/form/Blocks/Action.tsx (commit 19d8578).
 *
 * Mesmo JSX do original, sem `useWhatsappConnections`, `useMessageTemplates`, o
 * `queryClient` e os dois modais de template (nunca abertos numa captura). A lista de
 * remetentes, os templates compatíveis e os escondidos vêm da fixture.
 * Ao mexer no original, refaça o diff contra este arquivo.
 */
import SelectInput from "@/components/Inputs/SelectInput";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { TUseCampaignState } from "@/state-hooks/use-campaign-state";
import { getMessageTemplatePhoneStatusUIDetails } from "@/utils/select-options";
import { Eye, Info, Pencil, Plus, Send } from "lucide-react";
import {
	STATIC_HIDDEN_TEMPLATES,
	STATIC_MESSAGE_TEMPLATES,
	STATIC_WHATSAPP_PHONES,
} from "../../../_fixtures/campaign-builder";

const noop = () => {};

type CampaignsActionBlockProps = {
	campaign: TUseCampaignState["state"]["campaign"];
	updateCampaign: TUseCampaignState["updateCampaign"];
};

export default function CampaignsActionBlock({ campaign, updateCampaign }: CampaignsActionBlockProps) {
	const whatsappConnectionPhones = STATIC_WHATSAPP_PHONES;
	const compatibleTemplates = STATIC_MESSAGE_TEMPLATES;
	const hiddenTemplates = STATIC_HIDDEN_TEMPLATES;
	const hiddenCount = hiddenTemplates.length;
	const selectedTemplate = compatibleTemplates.find((template) => template.id === campaign.whatsappTemplateId);

	return (
		<ResponsiveMenuSection title="AÇÃO" icon={<Send className="h-4 min-h-4 w-4 min-w-4" />}>
			<div className="flex w-full flex-col gap-3">
				<p className="text-muted-foreground text-center text-sm leading-snug tracking-tight">
					Quando o gatilho disparar para um cliente elegível, esta campanha tenta enviar o template pelo WhatsApp e por e-mail. O telefone abaixo define o
					remetente do WhatsApp; se o cliente não tiver telefone ou e-mail, aquele canal é ignorado.
				</p>

				<SelectInput
					label="TELEFONE DO WHATSAPP (REMETENTE)"
					value={campaign.whatsappConexaoTelefoneId}
					resetOptionLabel="SEM REMETENTE WHATSAPP"
					options={whatsappConnectionPhones}
					handleChange={(value) => updateCampaign({ whatsappConexaoTelefoneId: value })}
					onReset={noop}
				/>

				<p className="text-muted-foreground text-center text-xs leading-snug">
					A lista de templates é filtrada pelo tipo de gatilho da campanha: só entram modelos cujas variáveis esse gatilho consegue preencher.
				</p>

				<SelectInput
					label="TEMPLATE DE MENSAGEM"
					value={campaign.whatsappTemplateId}
					resetOptionLabel="SELECIONE O TEMPLATE"
					options={compatibleTemplates.map((template) => {
						const details = getMessageTemplatePhoneStatusUIDetails(template.statusGeral);
						return {
							startContent: details ? (
								<div className={cn("flex items-center gap-1.5 rounded-lg px-2 py-1", details.colors.background)}>
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
					onReset={noop}
				/>

				<div className="flex w-full items-center justify-end gap-3">
					{selectedTemplate ? (
						<Button type="button" size="sm" variant="ghost" className="flex items-center gap-1.5" onClick={noop}>
							<Eye className="h-3.5 w-3.5" />
							PRÉ-VISUALIZAR
						</Button>
					) : null}

					{selectedTemplate ? (
						<Button type="button" size="sm" variant="ghost" className="flex items-center gap-1.5" onClick={noop}>
							<Pencil className="h-3.5 w-3.5" />
							EDITAR
						</Button>
					) : null}

					<Button type="button" size="sm" variant="ghost" className="flex items-center gap-1.5" onClick={noop}>
						<Plus className="h-3.5 w-3.5" />
						CRIAR
					</Button>
				</div>

				{hiddenCount > 0 ? (
					<TooltipProvider>
						<Tooltip delayDuration={150}>
							<TooltipTrigger asChild>
								<div className="text-muted-foreground hover:bg-muted/60 flex cursor-help items-center gap-2 rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-xs leading-snug transition-colors">
									<Info className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
									<span>
										{hiddenCount === 1
											? "Mais um template não aparece aqui porque usa variáveis que este tipo de gatilho não fornece."
											: `Mais ${hiddenCount} templates não aparecem aqui porque usam variáveis que este tipo de gatilho não fornece.`}{" "}
										Passe o cursor para ver o nome de cada um e quais variáveis são.
									</span>
								</div>
							</TooltipTrigger>
							<TooltipContent side="top" align="start" className="w-[360px] rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-xl">
								<div className="scrollbar-thin scrollbar-track-primary/10 scrollbar-thumb-primary/30 flex max-h-72 flex-col gap-3 overflow-y-auto overscroll-y-contain pr-1">
									<p className="text-xs font-semibold uppercase tracking-wide text-foreground">Templates fora da lista</p>
									<div className="flex flex-col gap-2">
										{hiddenTemplates.map((template) => (
											<div key={template.id} className="rounded-lg border border-border/60 bg-muted/35 px-2.5 py-2">
												<p className="text-xs font-semibold text-foreground">{template.nome}</p>
												<p className="text-muted-foreground mt-1 text-xs leading-snug">
													Variáveis que este gatilho não preenche: {template.incompatibleVariables.join(", ")}.
												</p>
											</div>
										))}
									</div>
								</div>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				) : null}
			</div>
		</ResponsiveMenuSection>
	);
}
