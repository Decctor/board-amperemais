"use client";

import {
  Background,
  Controls,
  type Edge,
  type EdgeTypes,
  MarkerType,
  MiniMap,
  type Node,
  type NodeTypes,
  type OnConnect,
  Panel,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import "@xyflow/react/dist/style.css";

import { Button } from "@/components/ui/button";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { getErrorMessage } from "@/lib/errors";
import { createCampaignFlow, updateCampaignFlow } from "@/lib/mutations/campaign-flows";
import { useCampaignFlowById } from "@/lib/queries/campaign-flows";
import type { TCampaignFlowState } from "@/schemas/campaign-flows";
import { useCampaignFlowState } from "@/state-hooks/use-campaign-flow-state";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { FlowConditionEdge } from "@/components/CampaignFlows/FlowConditionEdge";
import {
  FlowCustomNode,
  type TFlowCustomNodeData,
} from "@/components/CampaignFlows/FlowCustomNode";
import { FlowDetailsSidebar } from "@/components/CampaignFlows/FlowDetailsSidebar";
import { FlowNodeSelector } from "@/components/CampaignFlows/FlowNodeSelector";
import { getNodeSubtype } from "@/components/CampaignFlows/flow-node-types";

import type { TGetCampaignFlowsOutputById } from "@/app/api/campaign-flows/route";
import { ArrowLeft, FileText, Info, Loader2, Plus, Save, Upload, X } from "lucide-react";
import Link from "next/link";

// ─── React Flow node/edge type registrations ──────────────────────────────────

const nodeTypes: NodeTypes = {
  flowNode: FlowCustomNode as unknown as NodeTypes[string],
};

const edgeTypes: EdgeTypes = {
  conditionEdge: FlowConditionEdge as unknown as EdgeTypes[string],
};

// ─── Conversion helpers: state <-> React Flow ─────────────────────────────────

function stateNodesToFlowNodes(nos: TCampaignFlowState["nos"]): Node[] {
  return nos
    .filter((n) => !n.deletar)
    .map((n, index) => ({
      id: n.id || `temp-${index}`,
      type: "flowNode",
      position: { x: n.posicaoX ?? 0, y: n.posicaoY ?? index * 180 },
      data: {
        tipo: n.tipo,
        subtipo: n.subtipo,
        rotulo: n.rotulo ?? null,
        configuracao: n.configuracao,
        dbNodeIndex: index,
      } satisfies TFlowCustomNodeData,
    }));
}

function stateEdgesToFlowEdges(
  arestas: TCampaignFlowState["arestas"],
  _nos: TCampaignFlowState["nos"],
): Edge[] {
  return arestas
    .filter((a) => !a.deletar)
    .map((a, index) => {
      return {
        id: a.id || `edge-${index}`,
        source: a.noOrigemId,
        target: a.noDestinoId,
        sourceHandle: a.condicaoLabel ?? undefined,
        type: a.condicaoLabel ? "conditionEdge" : "default",
        data: { condicaoLabel: a.condicaoLabel },
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
        style: { strokeWidth: 2, stroke: "var(--color-muted-foreground)", opacity: 0.3 },
      };
    });
}

function parseNumberArrayOrNull(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;
  const parsed = value.map((item) => Number(item)).filter((item) => Number.isFinite(item));
  return parsed.length > 0 ? parsed : null;
}

// ─── Main Component ───────────────────────────────────────────────────────────

type CampaignFlowCanvasPageProps = {
  flowId: string | null;
  user: TAuthUserSession["user"];
  membership: NonNullable<TAuthUserSession["membership"]>;
};

export default function CampaignFlowCanvasPage({
  flowId,
  user: _user,
  membership,
}: CampaignFlowCanvasPageProps) {
  if (!flowId) return <CampaignFlowCanvasPageCreating organizationId={membership.organizacao.id} />;
  return (
    <CampaignFlowCanvasPageEditing flowId={flowId} organizationId={membership.organizacao.id} />
  );
}

function CampaignFlowCanvasPageEditing({
  flowId,
  organizationId,
}: {
  flowId: string;
  organizationId: string;
}) {
  const queryClient = useQueryClient();
  // ── Fetch existing flow if editing ──────────────────────────────────────
  const {
    data: existingFlow,
    queryKey,
    isLoading: flowIsLoading,
    isSuccess: flowIsSuccess,
    isError: flowIsError,
    error: flowError,
  } = useCampaignFlowById({ id: flowId ?? "" });

  if (flowIsLoading) {
    // ── Loading / error states ──────────────────────────────────────────────
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (flowIsError) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-2">
        <p className="text-sm text-destructive">{getErrorMessage(flowError)}</p>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/commercial/campaigns">Voltar</Link>
        </Button>
      </div>
    );
  }

  const handleOnMutate = async () => await queryClient.cancelQueries({ queryKey });
  const handleOnSuccess = async () => await queryClient.invalidateQueries({ queryKey });
  if (flowIsSuccess)
    return (
      <CampaignFlowCanvasContent
        flowId={flowId}
        organizationId={organizationId}
        initialFlow={existingFlow}
        callbacks={{ onMutate: handleOnMutate, onSuccess: handleOnSuccess }}
      />
    );
  return <></>;
}
function CampaignFlowCanvasPageCreating({ organizationId }: { organizationId: string }) {
  return (
    <CampaignFlowCanvasContent
      flowId={null}
      organizationId={organizationId}
      initialFlow={null}
      callbacks={{}}
    />
  );
}

type CampaignFlowCanvasContentProps = {
  flowId: string | null;
  organizationId: string;
  initialFlow: TGetCampaignFlowsOutputById | null;
  callbacks: {
    onMutate?: () => void;
    onSuccess?: () => void;
    onError?: (error: Error) => void;
    onSettled?: () => void;
  };
};
function CampaignFlowCanvasContent({
  flowId,
  organizationId,
  initialFlow,
  callbacks,
}: CampaignFlowCanvasContentProps) {
  const isEditing = !!flowId;
  const router = useRouter();
  // ── Flow state management ───────────────────────────────────────────────
  const {
    state,
    updateCampaignFlow: updateFlowState,
    addNode,
    updateNode,
    updateNodeConfigBySubtype,
    removeNode,
    addEdge: addEdgeState,
    removeEdge,
    redefineState,
  } = useCampaignFlowState({ initialState: {} });

  useEffect(() => {
    if (initialFlow) {
      redefineState({
        campaignFlow: {
          titulo: initialFlow.titulo,
          descricao: initialFlow?.descricao ?? null,
          status: initialFlow.status,
          tipo: initialFlow.tipo,
          recorrenciaTipo: initialFlow.recorrenciaTipo ?? null,
          recorrenciaIntervalo: initialFlow.recorrenciaIntervalo ?? 1,
          recorrenciaDiasSemana: parseNumberArrayOrNull(initialFlow.recorrenciaDiasSemana),
          recorrenciaDiasMes: parseNumberArrayOrNull(initialFlow.recorrenciaDiasMes),
          recorrenciaBlocoHorario: initialFlow.recorrenciaBlocoHorario ?? null,
          unicaDataExecucao: initialFlow.unicaDataExecucao ?? null,
          unicaExecutada: initialFlow.unicaExecutada ?? false,
          atribuicaoModelo: initialFlow.atribuicaoModelo,
          atribuicaoJanelaDias: initialFlow.atribuicaoJanelaDias,
          publicoId: initialFlow.publicoId ?? null,
        },
        nos: initialFlow.nos.map((n) => ({
          id: n.id,
          tipo: n.tipo,
          subtipo: n.subtipo,
          rotulo: n.rotulo ?? null,
          configuracao: (n.configuracao as Record<string, unknown>) ?? {},
          posicaoX: n.posicaoX ?? null,
          posicaoY: n.posicaoY ?? null,
        })) as TCampaignFlowState["nos"],
        arestas: initialFlow.arestas.map((a) => ({
          id: a.id,
          noOrigemId: a.noOrigemId,
          noDestinoId: a.noDestinoId,
          condicaoLabel: a.condicaoLabel ?? null,
          ordem: a.ordem ?? 0,
        })),
      });
    }
  }, [initialFlow, redefineState]);

  // ── React Flow nodes/edges state ────────────────────────────────────────
  const flowNodes = useMemo(() => stateNodesToFlowNodes(state.nos), [state.nos]);
  const flowEdges = useMemo(
    () => stateEdgesToFlowEdges(state.arestas, state.nos),
    [state.arestas, state.nos],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(flowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowEdges);

  // Sync React Flow nodes/edges when state changes
  useEffect(() => {
    setNodes(flowNodes);
  }, [flowNodes, setNodes]);

  useEffect(() => {
    setEdges(flowEdges);
  }, [flowEdges, setEdges]);

  // ── Handle node position changes ────────────────────────────────────────
  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      const dataIndex = (node.data as TFlowCustomNodeData).dbNodeIndex;
      if (dataIndex != null) {
        updateNode({
          index: dataIndex,
          changes: {
            posicaoX: Math.round(node.position.x),
            posicaoY: Math.round(node.position.y),
          },
        });
      }
    },
    [updateNode],
  );

  // ── Handle new connections ──────────────────────────────────────────────
  const onConnect: OnConnect = useCallback(
    (connection) => {
      const sourceNode = state.nos.find((n, i) => (n.id || `temp-${i}`) === connection.source);

      const condicaoLabel =
        sourceNode?.tipo === "CONDICAO" ? (connection.sourceHandle ?? null) : null;

      addEdgeState({
        noOrigemId: connection.source ?? "",
        noDestinoId: connection.target ?? "",
        condicaoLabel,
        ordem: 0,
      });
    },
    [state.nos, addEdgeState],
  );

  // ── UI state ────────────────────────────────────────────────────────────
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedNodeIndex, setSelectedNodeIndex] = useState<number | null>(null);

  const hasTrigger = state.nos.some((n) => n.tipo === "GATILHO" && !n.deletar);

  // ── Add node from selector ──────────────────────────────────────────────
  const handleAddNode = useCallback(
    (tipo: string, subtipo: string) => {
      const subtypeInfo = getNodeSubtype(tipo, subtipo);
      const existingCount = state.nos.filter((n) => !n.deletar).length;

      type TNodeSubtype = TCampaignFlowState["nos"][number]["subtipo"];
      const newNode = {
        tipo: tipo as "GATILHO" | "ACAO" | "DELAY" | "CONDICAO" | "FILTRO",
        subtipo: subtipo as TNodeSubtype,
        rotulo: subtypeInfo?.rotulo ?? null,
        configuracao: {},
        posicaoX: 250,
        posicaoY: existingCount * 180,
      } as TCampaignFlowState["nos"][number];

      addNode(newNode);
      setSelectorOpen(false);
    },
    [addNode, state.nos],
  );

  // ── Node selection ──────────────────────────────────────────────────────
  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    const dataIndex = (node.data as TFlowCustomNodeData).dbNodeIndex;
    setSelectedNodeIndex(dataIndex);
    setSidebarOpen(true);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeIndex(null);
  }, []);

  // ── Handle node removal (sync with state) ───────────────────────────────
  const handleRemoveNode = useCallback(
    (index: number) => {
      const node = state.nos[index];
      const nodeId = node?.id || `temp-${index}`;

      // Remove connected edges
      state.arestas.forEach((a, i) => {
        if (a.noOrigemId === nodeId || a.noDestinoId === nodeId) {
          removeEdge(i);
        }
      });

      removeNode(index);
      setSelectedNodeIndex(null);
    },
    [state.nos, state.arestas, removeNode, removeEdge],
  );

  // ── Mutations ───────────────────────────────────────────────────────────
  const { mutate: saveFlow, isPending: isSaving } = useMutation({
    mutationKey: ["save-campaign-flow"],
    mutationFn: async () => {
      if (isEditing && flowId) {
        return updateCampaignFlow({
          campaignFlowId: flowId,
          campaignFlow: state.campaignFlow,
          nos: state.nos,
          arestas: state.arestas,
        });
      }
      return createCampaignFlow({
        campaignFlow: state.campaignFlow,
        nos: state.nos,
        arestas: state.arestas,
      });
    },
    onSuccess: (data) => {
      toast.success(data.message);
      callbacks?.onSuccess?.();
      if ("insertedId" in data.data) {
        router.replace(`/dashboard/commercial/campaigns-flows/canvas?id=${data.data.insertedId}`);
      }
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <div className="w-full h-[calc(100vh-100px)] flex flex-col">
      {/* ── Top toolbar ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b px-4 py-2.5 bg-card shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="w-8 h-8" asChild>
            <Link href="/dashboard/commercial/campaigns">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-1.5 text-sm">
            <span className="text-muted-foreground">FLUXOS</span>
            <span className="text-muted-foreground">/</span>
            <span className="font-bold tracking-tight uppercase truncate max-w-[300px]">
              {state.campaignFlow.titulo || "NOVO FLUXO"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {state.campaignFlow.status === "RASCUNHO" && (
            <div className="flex items-center gap-1.5 rounded-md bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 px-3 py-1.5">
              <Info className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">RASCUNHO</span>
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-1.5"
            onClick={() => {
              setSidebarOpen(!sidebarOpen);
              setSelectedNodeIndex(null);
            }}
          >
            <FileText className="w-3.5 h-3.5" />
            DETALHES
          </Button>

          <Button
            size="sm"
            className="flex items-center gap-1.5"
            onClick={() => saveFlow()}
            disabled={isSaving || !state.campaignFlow.titulo}
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            {isEditing ? "SALVAR" : "CRIAR"}
          </Button>

          {isEditing && state.campaignFlow.status === "RASCUNHO" && (
            <Button
              size="sm"
              variant="default"
              className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white"
              onClick={() => {
                updateFlowState({ status: "ATIVO" });
                setTimeout(() => saveFlow(), 100);
              }}
              disabled={isSaving}
            >
              <Upload className="w-3.5 h-3.5" />
              PUBLICAR
            </Button>
          )}
        </div>
      </div>

      {/* ── Canvas area ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDragStop={onNodeDragStop}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            snapToGrid
            snapGrid={[20, 20]}
            deleteKeyCode="Delete"
            className="bg-muted/30"
          >
            <Background gap={20} size={1} className="bg-transparent!" />
            <Controls className="rounded-lg! border! shadow-sm!" />
            <MiniMap
              className="rounded-lg! border! shadow-sm!"
              nodeColor={(node) => {
                const tipo = (node.data as TFlowCustomNodeData)?.tipo;
                switch (tipo) {
                  case "GATILHO":
                    return "#f59e0b";
                  case "ACAO":
                    return "#3b82f6";
                  case "DELAY":
                    return "#8b5cf6";
                  case "CONDICAO":
                    return "#f97316";
                  case "FILTRO":
                    return "#22c55e";
                  default:
                    return "#94a3b8";
                }
              }}
            />

            {/* Add node button */}
            <Panel position="top-left" className="m-3!">
              <Button
                size="sm"
                variant="outline"
                className="flex items-center gap-1.5 shadow-sm bg-card"
                onClick={() => setSelectorOpen(!selectorOpen)}
              >
                {selectorOpen ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {selectorOpen ? "FECHAR" : "ADICIONAR NÓ"}
              </Button>
            </Panel>

            {/* Node selector panel */}
            {selectorOpen && (
              <Panel position="top-left" className="m-3! mt-14!">
                <FlowNodeSelector
                  onSelectNode={handleAddNode}
                  onClose={() => setSelectorOpen(false)}
                  hasTrigger={hasTrigger}
                />
              </Panel>
            )}

            {/* Empty state */}
            {state.nos.filter((n) => !n.deletar).length === 0 && (
              <Panel position="top-center" className="mt-[30%]!">
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                    <Plus className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-semibold">Comece adicionando nos</p>
                    <p className="text-xs text-muted-foreground max-w-[280px]">
                      Clique em &quot;Adicionar No&quot; para criar seu primeiro gatilho e depois
                      conecte acoes, condicoes e delays.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setSelectorOpen(true)}
                    className="flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    ADICIONAR PRIMEIRO NO
                  </Button>
                </div>
              </Panel>
            )}
          </ReactFlow>
        </div>

        {/* ── Right sidebar ─────────────────────────────────────────────── */}
        {sidebarOpen && (
          <FlowDetailsSidebar
            flow={state.campaignFlow}
            updateFlow={updateFlowState}
            selectedNodeIndex={selectedNodeIndex}
            nodes={state.nos}
            updateNode={updateNode}
            updateNodeConfigBySubtype={updateNodeConfigBySubtype}
            removeNode={handleRemoveNode}
            organizationId={organizationId}
            onClose={() => {
              setSidebarOpen(false);
              setSelectedNodeIndex(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
