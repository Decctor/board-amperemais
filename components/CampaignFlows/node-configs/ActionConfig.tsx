import NumberInput from "@/components/Inputs/NumberInput";
import SelectInput from "@/components/Inputs/SelectInput";
import TextInput from "@/components/Inputs/TextInput";
import NewWhatsappTemplate from "@/components/Modals/WhatsappTemplates/NewWhatsappTemplate";
import { Button } from "@/components/ui/button";
import { useWhatsappConnection } from "@/lib/queries/whatsapp-connections";
import { useWhatsappTemplates } from "@/lib/queries/whatsapp-templates";
import { validateTemplateForTrigger } from "@/lib/whatsapp/template-variables";
import { useQueryClient } from "@tanstack/react-query";
import { Info, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { FLOW_TRIGGER_TO_CAMPAIGN_TRIGGER } from "./shared";
import type { TActionNodeConfigComponentProps } from "./types";

export function ActionConfig({ node, nodes, organizationId, updateConfig }: TActionNodeConfigComponentProps) {
	switch (node.subtipo) {
		case "ENVIAR-WHATSAPP":
			return <WhatsappActionConfig node={node} nodes={nodes} organizationId={organizationId} updateConfig={updateConfig} />;

		case "GERAR-CASHBACK":
			return (
				<div className="flex flex-col gap-2">
					<SelectInput
						label="TIPO"
						value={node.configuracao.tipo}
						handleChange={(value) => updateConfig({ tipo: value as "FIXO" | "PERCENTUAL" })}
						onReset={() => updateConfig({ tipo: "FIXO" })}
						resetOptionLabel="SELECIONE O TIPO"
						options={[
							{ id: 1, value: "FIXO", label: "VALOR FIXO" },
							{ id: 2, value: "PERCENTUAL", label: "PERCENTUAL" },
						]}
					/>
					<NumberInput label="VALOR" value={node.configuracao.valor} handleChange={(value) => updateConfig({ valor: value })} placeholder="0.00" />
				</div>
			);

		case "NOTIFICACAO-INTERNA":
			return (
				<TextInput
					label="MENSAGEM"
					value={node.configuracao.mensagem ?? ""}
					handleChange={(value) => updateConfig({ mensagem: value })}
					placeholder="Mensagem da notificacao"
				/>
			);

		default:
			return <p className="text-xs text-muted-foreground italic">Acao sem configuracao adicional.</p>;
	}
}

function WhatsappActionConfig({
	node,
	nodes,
	organizationId,
	updateConfig,
}: {
	node: Extract<TActionNodeConfigComponentProps["node"], { subtipo: "ENVIAR-WHATSAPP" }>;
	nodes: TActionNodeConfigComponentProps["nodes"];
	organizationId: string;
	updateConfig: TActionNodeConfigComponentProps["updateConfig"];
}) {
	const queryClient = useQueryClient();
	const [showCreateTemplate, setShowCreateTemplate] = useState(false);

	const triggerNode = nodes.find((item) => item.tipo === "GATILHO" && !item.deletar);
	const triggerContext = triggerNode?.subtipo ? FLOW_TRIGGER_TO_CAMPAIGN_TRIGGER[triggerNode.subtipo] : undefined;

	const { data: whatsappConnection } = useWhatsappConnection();
	const { data: whatsappTemplatesResult, updateParams } = useWhatsappTemplates({
		initialParams: {
			page: 1,
			search: "",
			whatsappConnectionPhoneId: node.configuracao.whatsappConexaoTelefoneId || undefined,
		},
	});

	const whatsappConnectionPhones =
		whatsappConnection?.telefones.map((telefone) => ({
			id: telefone.id,
			label: `(${telefone.numero}) - ${telefone.nome}`,
			value: telefone.id,
		})) ?? [];

	const allTemplates = whatsappTemplatesResult?.whatsappTemplates ?? [];

	const { compatibleTemplates, hiddenCount } = useMemo(() => {
		if (!triggerContext) return { compatibleTemplates: allTemplates, hiddenCount: 0 };
		const compatible = allTemplates.filter((template) => {
			const validation = validateTemplateForTrigger(template.bodyParametros, triggerContext);
			return validation.valid;
		});
		return { compatibleTemplates: compatible, hiddenCount: allTemplates.length - compatible.length };
	}, [allTemplates, triggerContext]);

	useEffect(() => {
		const selectedTemplateId = node.configuracao.whatsappTemplateId;
		if (!selectedTemplateId || !triggerContext || allTemplates.length === 0) return;

		const selectedTemplate = allTemplates.find((template) => template.id === selectedTemplateId);
		if (!selectedTemplate) return;

		const validation = validateTemplateForTrigger(selectedTemplate.bodyParametros, triggerContext);
		if (!validation.valid) {
			updateConfig({ whatsappTemplateId: "" });
			toast.warning("Template removido: variaveis incompativeis com o gatilho atual.");
		}
	}, [allTemplates, node.configuracao.whatsappTemplateId, triggerContext, updateConfig]);

	const selectedTemplate = useMemo(
		() => allTemplates.find((template) => template.id === node.configuracao.whatsappTemplateId),
		[allTemplates, node.configuracao.whatsappTemplateId],
	);
	return (
		<>
			{showCreateTemplate && (
				<NewWhatsappTemplate
					organizationId={organizationId}
					triggerContext={triggerContext}
					closeMenu={() => setShowCreateTemplate(false)}
					callbacks={{
						onSuccess: ({ templateId }) => {
							if (templateId) updateConfig({ whatsappTemplateId: templateId });
							queryClient.invalidateQueries({ queryKey: ["whatsapp-templates"] });
							setShowCreateTemplate(false);
						},
					}}
				/>
			)}

			<div className="flex flex-col gap-2">
				<SelectInput
					label="TELEFONE WHATSAPP"
					value={node.configuracao.whatsappConexaoTelefoneId || undefined}
					resetOptionLabel="SELECIONE O TELEFONE"
					options={whatsappConnectionPhones}
					handleChange={(value) => {
						updateConfig({
							whatsappConexaoTelefoneId: value,
							whatsappTemplateId: "",
						});
						updateParams({ whatsappConnectionPhoneId: value });
					}}
					onReset={() => {
						updateConfig({
							whatsappConexaoTelefoneId: "",
							whatsappTemplateId: "",
						});
						updateParams({ whatsappConnectionPhoneId: undefined });
					}}
				/>

				<div className="flex items-end gap-2">
					<div className="flex-1 min-w-0">
						<SelectInput
							label="TEMPLATE WHATSAPP"
							value={node.configuracao.whatsappTemplateId || undefined}
							editable={!!node.configuracao.whatsappConexaoTelefoneId}
							resetOptionLabel={node.configuracao.whatsappConexaoTelefoneId ? "SELECIONE O TEMPLATE" : "SELECIONE UM TELEFONE PRIMEIRO"}
							options={compatibleTemplates.map((template) => ({ id: template.id, label: template.nome, value: template.id }))}
							handleChange={(value) => updateConfig({ whatsappTemplateId: value })}
							onReset={() => updateConfig({ whatsappTemplateId: "" })}
						/>
					</div>
					<Button
						type="button"
						size="sm"
						variant="outline"
						className="mb-0.5 gap-1.5 shrink-0"
						onClick={() => setShowCreateTemplate(true)}
						disabled={!node.configuracao.whatsappConexaoTelefoneId}
					>
						<Plus className="w-3.5 h-3.5" />
						CRIAR
					</Button>
				</div>

				{hiddenCount > 0 && (
					<div className="flex items-center gap-2 rounded-md bg-blue-50 dark:bg-blue-950/30 px-3 py-2 text-xs text-blue-700 dark:text-blue-400">
						<Info className="w-3.5 h-3.5 shrink-0" />
						<span>
							{hiddenCount} {hiddenCount === 1 ? "template foi ocultado" : "templates foram ocultados"} por incompatibilidade com o gatilho.
						</span>
					</div>
				)}

				{selectedTemplate && (
					<div className="flex flex-wrap items-center gap-2 rounded-md border border-primary/10 bg-muted/30 px-3 py-2">
						<span className="text-xs text-muted-foreground">Status:</span>
						<StatusBadge status={selectedTemplate.statusGeral} />
						<span className="text-xs text-muted-foreground ml-1">Qualidade:</span>
						<QualityBadge quality={selectedTemplate.qualidadeGeral} />
					</div>
				)}
			</div>
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
