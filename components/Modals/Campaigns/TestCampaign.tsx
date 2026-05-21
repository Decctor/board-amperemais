"use client";

import SelectMultipleClientsInput from "@/components/Inputs/SelectMultipleClientsInput";
import TemplatePreview from "@/components/Modals/WhatsappTemplates/Blocks/TemplatePreview";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/errors";
import { whatsappTemplateComponentsToMessageContent } from "@/lib/message-templates";
import { formatDateAsLocale } from "@/lib/formatting";
import { testCampaign } from "@/lib/mutations/campaigns";
import { useCampaignById } from "@/lib/queries/campaigns";
import { CampaignTriggerTypeOptions } from "@/utils/select-options";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, MessageCircle, Phone, Sparkles, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type TestCampaignProps = {
	campaignId: string;
	closeModal: () => void;
	callbacks?: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: () => void;
		onSettled?: () => void;
	};
};

export default function TestCampaign({ campaignId, closeModal, callbacks }: TestCampaignProps) {
	const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
	const { data: campaign, isLoading, error } = useCampaignById({ id: campaignId, enabled: Boolean(campaignId) });

	const triggerType = useMemo(() => {
		return CampaignTriggerTypeOptions.find((option) => option.value === campaign?.gatilhoTipo);
	}, [campaign?.gatilhoTipo]);

	const { mutate: handleTestCampaign, isPending } = useMutation({
		mutationKey: ["test-campaign", campaignId],
		mutationFn: testCampaign,
		onMutate: () => {
			callbacks?.onMutate?.();
		},
		onSuccess: (response) => {
			callbacks?.onSuccess?.();
			toast.success(response.message);
			closeModal();
		},
		onError: (error) => {
			callbacks?.onError?.();
			toast.error(getErrorMessage(error));
		},
		onSettled: () => {
			callbacks?.onSettled?.();
		},
	});

	function handleSubmit() {
		if (selectedClientIds.length === 0) {
			toast.error("Selecione pelo menos um cliente para enviar o teste.");
			return;
		}

		handleTestCampaign({
			campaignId,
			clientIds: selectedClientIds,
		});
	}

	const phone = campaign?.whatsappConexaoTelefone;
	const template = campaign?.whatsappTemplate;

	return (
		<ResponsiveMenu
			menuTitle="TESTAR CAMPANHA"
			menuDescription="Revise a campanha e selecione os clientes que receberão o envio de teste."
			menuActionButtonText="ENVIAR TESTE"
			menuCancelButtonText="CANCELAR"
			actionFunction={handleSubmit}
			actionIsLoading={isPending}
			stateIsLoading={isLoading}
			stateError={error ? getErrorMessage(error) : null}
			closeMenu={closeModal}
			dialogVariant="lg"
			drawerVariant="lg"
			lockClose={isPending}
		>
			<ResponsiveMenuSection title="CAMPANHA" icon={<Sparkles size={15} />}>
				<div className="grid w-full gap-2 rounded-lg border border-border bg-muted/20 p-3 lg:grid-cols-[1fr_auto]">
					<div className="flex min-w-0 flex-col gap-1">
						<h2 className="truncate text-sm font-bold tracking-tight">{campaign?.titulo}</h2>
						<p className="text-xs font-medium text-muted-foreground">{campaign?.descricao || "Sem descrição."}</p>
					</div>
					<div className="flex flex-wrap items-center gap-1.5 lg:justify-end">
						<div className="rounded-md bg-secondary px-2 py-1 text-[0.65rem] font-bold uppercase text-foreground">
							{triggerType?.label ?? "Gatilho não definido"}
						</div>
						<div className="rounded-md bg-secondary px-2 py-1 text-[0.65rem] font-bold uppercase text-foreground">
							Criada em {campaign?.dataInsercao ? formatDateAsLocale(campaign.dataInsercao, false) : "--"}
						</div>
					</div>
				</div>
			</ResponsiveMenuSection>

			<ResponsiveMenuSection title="WHATSAPP" icon={<MessageCircle size={15} />}>
				<div className="grid w-full gap-2 lg:grid-cols-2">
					<div className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 p-3">
						<Phone className="h-4 w-4 min-w-4 text-foreground" />
						<div className="flex min-w-0 flex-col">
							<p className="truncate text-xs font-bold tracking-tight">{phone?.nome ?? "Telefone não configurado"}</p>
							<p className="text-xs text-muted-foreground">{phone?.numero ?? "Configure um telefone antes de testar."}</p>
						</div>
					</div>
					<div className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 p-3">
						<CheckCircle2 className="h-4 w-4 min-w-4 text-foreground" />
						<div className="flex min-w-0 flex-col">
							<p className="truncate text-xs font-bold tracking-tight">{template?.nome ?? "Template não configurado"}</p>
							<p className="text-xs text-muted-foreground">Modelo usado no envio de teste.</p>
						</div>
					</div>
				</div>
				{!phone || !template ? (
					<div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-700 dark:text-amber-300">
						<AlertTriangle className="h-4 w-4 min-w-4" />
						<p className="text-xs font-medium">A campanha precisa ter telefone e template configurados para enviar testes.</p>
					</div>
				) : null}
			</ResponsiveMenuSection>

			<ResponsiveMenuSection title="CLIENTES DO TESTE" icon={<UserRound size={15} />}>
				<SelectMultipleClientsInput
					label="Clientes"
					selected={selectedClientIds}
					handleChange={setSelectedClientIds}
					onReset={() => setSelectedClientIds([])}
				/>
				<div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2">
					<p className="text-xs font-medium text-muted-foreground">
						{selectedClientIds.length === 1 ? "1 cliente selecionado" : `${selectedClientIds.length} clientes selecionados`}
					</p>
					<Button type="button" variant="ghost" size="sm" className="h-7 text-[0.65rem]" onClick={() => setSelectedClientIds([])}>
						LIMPAR
					</Button>
				</div>
			</ResponsiveMenuSection>

			<TemplatePreview content={template?.componentes ? whatsappTemplateComponentsToMessageContent(template.componentes) : null} />
		</ResponsiveMenu>
	);
}
