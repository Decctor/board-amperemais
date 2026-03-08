"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { TCampaignFlowState } from "@/schemas/campaign-flows";
import { getNodeSubtype, NODE_TYPE_COLORS, NODE_TYPE_LABELS } from "./flow-node-types";
import { FileText, Settings, Trash2, X } from "lucide-react";
import TextInput from "@/components/Inputs/TextInput";
import TextareaInput from "@/components/Inputs/TextareaInput";
import { FlowSimpleSelect } from "./FlowSimpleSelect";

type FlowDetailsSidebarProps = {
	flow: TCampaignFlowState["campaignFlow"];
	updateFlow: (changes: Partial<TCampaignFlowState["campaignFlow"]>) => void;
	selectedNodeIndex: number | null;
	nodes: TCampaignFlowState["nos"];
	updateNode: (args: { index: number; changes: Partial<TCampaignFlowState["nos"][number]> }) => void;
	removeNode: (index: number) => void;
	onClose: () => void;
};

export function FlowDetailsSidebar({
	flow,
	updateFlow,
	selectedNodeIndex,
	nodes,
	updateNode,
	removeNode,
	onClose,
}: FlowDetailsSidebarProps) {
	const selectedNode = selectedNodeIndex != null ? nodes[selectedNodeIndex] : null;

	return (
		<div className="w-[340px] bg-card border-l flex flex-col h-full overflow-hidden">
			<div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
				<div className="flex items-center gap-2">
					{selectedNode ? (
						<>
							<Settings className="w-4 h-4 text-muted-foreground" />
							<h3 className="text-sm font-bold tracking-tight">CONFIGURAR NO</h3>
						</>
					) : (
						<>
							<FileText className="w-4 h-4 text-muted-foreground" />
							<h3 className="text-sm font-bold tracking-tight">DETALHES</h3>
						</>
					)}
				</div>
				<Button variant="ghost" size="icon" className="w-7 h-7" onClick={onClose}>
					<X className="w-4 h-4" />
				</Button>
			</div>

			<div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
				{selectedNode ? (
					<NodeConfigSection
						node={selectedNode}
						nodeIndex={selectedNodeIndex!}
						updateNode={updateNode}
						removeNode={removeNode}
					/>
				) : (
					<FlowConfigSection flow={flow} updateFlow={updateFlow} />
				)}
			</div>
		</div>
	);
}

function FlowConfigSection({
	flow,
	updateFlow,
}: {
	flow: TCampaignFlowState["campaignFlow"];
	updateFlow: (changes: Partial<TCampaignFlowState["campaignFlow"]>) => void;
}) {
	return (
		<>
			<div className="flex flex-col gap-3">
				<h4 className="text-xs font-bold tracking-tight text-muted-foreground uppercase">Informacoes do Fluxo</h4>
				<TextInput
					label="Titulo"
					value={flow.titulo}
					handleChange={(value) => updateFlow({ titulo: value })}
					placeholder="Ex: Boas-vindas novos clientes"
				/>
				<TextareaInput
					label="Descricao"
					value={flow.descricao ?? ""}
					handleChange={(value) => updateFlow({ descricao: value || null })}
					placeholder="Descreva o objetivo deste fluxo..."
				/>
			</div>

			<Separator />

			<div className="flex flex-col gap-3">
				<h4 className="text-xs font-bold tracking-tight text-muted-foreground uppercase">Tipo e Status</h4>
				<FlowSimpleSelect
					label="Tipo do Fluxo"
					value={flow.tipo}
					onChange={(value) => updateFlow({ tipo: value as typeof flow.tipo })}
					options={[
						{ value: "EVENTO", label: "Evento (disparado por acao)" },
						{ value: "RECORRENTE", label: "Recorrente (agendado)" },
						{ value: "UNICA", label: "Unica (execucao manual)" },
					]}
				/>
				<FlowSimpleSelect
					label="Status"
					value={flow.status}
					onChange={(value) => updateFlow({ status: value as typeof flow.status })}
					options={[
						{ value: "RASCUNHO", label: "Rascunho" },
						{ value: "ATIVO", label: "Ativo" },
						{ value: "PAUSADO", label: "Pausado" },
						{ value: "ARQUIVADO", label: "Arquivado" },
					]}
				/>
			</div>

			<Separator />

			<div className="flex flex-col gap-3">
				<h4 className="text-xs font-bold tracking-tight text-muted-foreground uppercase">Atribuicao</h4>
				<FlowSimpleSelect
					label="Modelo de Atribuicao"
					value={flow.atribuicaoModelo}
					onChange={(value) => updateFlow({ atribuicaoModelo: value as typeof flow.atribuicaoModelo })}
					options={[
						{ value: "LAST_TOUCH", label: "Ultimo toque" },
						{ value: "FIRST_TOUCH", label: "Primeiro toque" },
						{ value: "LINEAR", label: "Linear" },
					]}
				/>
				<TextInput
					label="Janela de Atribuicao (dias)"
					value={String(flow.atribuicaoJanelaDias)}
					handleChange={(value) => updateFlow({ atribuicaoJanelaDias: Number(value) || 14 })}
					placeholder="14"
				/>
			</div>
		</>
	);
}

function NodeConfigSection({
	node,
	nodeIndex,
	updateNode,
	removeNode,
}: {
	node: TCampaignFlowState["nos"][number];
	nodeIndex: number;
	updateNode: (args: { index: number; changes: Partial<TCampaignFlowState["nos"][number]> }) => void;
	removeNode: (index: number) => void;
}) {
	const subtypeInfo = getNodeSubtype(node.tipo, node.subtipo);
	const colors = NODE_TYPE_COLORS[node.tipo] ?? NODE_TYPE_COLORS.ACAO;
	const typeLabel = NODE_TYPE_LABELS[node.tipo] ?? node.tipo;

	return (
		<>
			<div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg", colors.bg, colors.border, "border")}>
				<span className={cn("text-[0.65rem] font-bold tracking-widest uppercase", colors.text)}>
					{typeLabel}
				</span>
				<span className="text-[0.65rem] text-muted-foreground">
					{subtypeInfo?.categoria}
				</span>
			</div>

			<div className="flex flex-col gap-3">
				<h4 className="text-xs font-bold tracking-tight text-muted-foreground uppercase">Rotulo do No</h4>
				<TextInput
					label="Rotulo personalizado"
					value={node.rotulo ?? ""}
					handleChange={(value) => updateNode({ index: nodeIndex, changes: { rotulo: value || null } })}
					placeholder={subtypeInfo?.rotulo ?? "Nome do no"}
				/>
			</div>

			<Separator />

			<div className="flex flex-col gap-3">
				<h4 className="text-xs font-bold tracking-tight text-muted-foreground uppercase">Configuracao</h4>
				<NodeSpecificConfig node={node} nodeIndex={nodeIndex} updateNode={updateNode} />
			</div>

			<Separator />

			<Button
				variant="destructive"
				size="sm"
				className="w-full flex items-center gap-2"
				onClick={() => removeNode(nodeIndex)}
			>
				<Trash2 className="w-4 h-4" />
				REMOVER NO
			</Button>
		</>
	);
}

function NodeSpecificConfig({
	node,
	nodeIndex,
	updateNode,
}: {
	node: TCampaignFlowState["nos"][number];
	nodeIndex: number;
	updateNode: (args: { index: number; changes: Partial<TCampaignFlowState["nos"][number]> }) => void;
}) {
	const config = node.configuracao as Record<string, unknown>;

	const updateConfig = (key: string, value: unknown) => {
		updateNode({
			index: nodeIndex,
			changes: { configuracao: { ...config, [key]: value } },
		});
	};

	switch (node.subtipo) {
		case "ENVIAR-WHATSAPP":
			return (
				<div className="flex flex-col gap-2">
					<TextInput
						label="ID do Template WhatsApp"
						value={(config.whatsappTemplateId as string) ?? ""}
						handleChange={(v) => updateConfig("whatsappTemplateId", v)}
						placeholder="ID do template"
					/>
					<TextInput
						label="ID do Telefone de Conexao"
						value={(config.whatsappConexaoTelefoneId as string) ?? ""}
						handleChange={(v) => updateConfig("whatsappConexaoTelefoneId", v)}
						placeholder="ID do telefone"
					/>
				</div>
			);

		case "GERAR-CASHBACK":
			return (
				<div className="flex flex-col gap-2">
					<FlowSimpleSelect
						label="Tipo"
						value={(config.tipo as string) ?? "FIXO"}
						onChange={(v) => updateConfig("tipo", v)}
						options={[
							{ value: "FIXO", label: "Valor fixo" },
							{ value: "PERCENTUAL", label: "Percentual" },
						]}
					/>
					<TextInput
						label="Valor"
						value={String(config.valor ?? "")}
						handleChange={(v) => updateConfig("valor", Number(v) || 0)}
						placeholder="0.00"
					/>
				</div>
			);

		case "NOTIFICACAO-INTERNA":
			return (
				<TextInput
					label="Mensagem"
					value={(config.mensagem as string) ?? ""}
					handleChange={(v) => updateConfig("mensagem", v)}
					placeholder="Mensagem da notificacao"
				/>
			);

		case "ESPERAR-DURACAO":
			return (
				<div className="flex flex-col gap-2">
					<TextInput
						label="Valor"
						value={String(config.valor ?? "")}
						handleChange={(v) => updateConfig("valor", Number(v) || 1)}
						placeholder="1"
					/>
					<FlowSimpleSelect
						label="Medida"
						value={(config.medida as string) ?? "DIAS"}
						onChange={(v) => updateConfig("medida", v)}
						options={[
							{ value: "HORAS", label: "Horas" },
							{ value: "DIAS", label: "Dias" },
							{ value: "SEMANAS", label: "Semanas" },
							{ value: "MESES", label: "Meses" },
						]}
					/>
				</div>
			);

		case "ESPERAR-ATE-HORARIO":
			return (
				<TextInput
					label="Horario (HH:MM)"
					value={(config.horario as string) ?? ""}
					handleChange={(v) => updateConfig("horario", v)}
					placeholder="09:00"
				/>
			);

		case "ESPERAR-ATE-DATA":
			return (
				<TextInput
					label="Data (YYYY-MM-DD)"
					value={(config.data as string) ?? ""}
					handleChange={(v) => updateConfig("data", v)}
					placeholder="2026-12-31"
				/>
			);

		case "VERIFICAR-ATRIBUTO-CLIENTE":
			return (
				<div className="flex flex-col gap-2">
					<TextInput
						label="Campo"
						value={(config.campo as string) ?? ""}
						handleChange={(v) => updateConfig("campo", v)}
						placeholder="Ex: analiseRFMTitulo"
					/>
					<FlowSimpleSelect
						label="Operador"
						value={(config.operador as string) ?? "IGUAL"}
						onChange={(v) => updateConfig("operador", v)}
						options={[
							{ value: "IGUAL", label: "Igual" },
							{ value: "DIFERENTE", label: "Diferente" },
							{ value: "MAIOR", label: "Maior que" },
							{ value: "MENOR", label: "Menor que" },
							{ value: "CONTEM", label: "Contem" },
						]}
					/>
					<TextInput
						label="Valor"
						value={String(config.valor ?? "")}
						handleChange={(v) => updateConfig("valor", v)}
						placeholder="Valor esperado"
					/>
				</div>
			);

		case "VERIFICAR-COMPRA-RECENTE":
			return (
				<div className="flex flex-col gap-2">
					<TextInput
						label="Dias atras"
						value={String(config.diasAtras ?? "")}
						handleChange={(v) => updateConfig("diasAtras", Number(v) || 30)}
						placeholder="30"
					/>
					<TextInput
						label="Valor minimo (opcional)"
						value={String(config.valorMinimo ?? "")}
						handleChange={(v) => updateConfig("valorMinimo", v ? Number(v) : undefined)}
						placeholder="0.00"
					/>
				</div>
			);

		case "VERIFICAR-SEGMENTO-RFM":
			return (
				<TextInput
					label="Segmentos (separados por virgula)"
					value={(config.segmentos as string[])?.join(", ") ?? ""}
					handleChange={(v) =>
						updateConfig(
							"segmentos",
							v.split(",").map((s: string) => s.trim()).filter(Boolean),
						)
					}
					placeholder="Campeoes, Fieis"
				/>
			);

		case "VERIFICAR-CASHBACK-SALDO":
			return (
				<TextInput
					label="Valor minimo"
					value={String(config.valorMinimo ?? "")}
					handleChange={(v) => updateConfig("valorMinimo", Number(v) || 0)}
					placeholder="0.00"
				/>
			);

		case "FILTRAR-POR-PUBLICO":
			return (
				<TextInput
					label="ID do Publico"
					value={(config.publicoId as string) ?? ""}
					handleChange={(v) => updateConfig("publicoId", v)}
					placeholder="ID do publico salvo"
				/>
			);

		default:
			return (
				<p className="text-xs text-muted-foreground italic">
					Configuracao automatica para este tipo de no.
				</p>
			);
	}
}
