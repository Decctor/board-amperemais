"use client";
/*
 * CÓPIA ESTÁTICA — não é o componente de produção.
 * Origem: app/dashboard/growth/campaigns/_module/shared/form/Blocks/Filters.tsx (commit 19d8578).
 *
 * Cópia só do que aparece na tela com a árvore já preenchida: o mesmo JSX do grupo,
 * dos cards de condição, dos botões de adicionar e da prévia de audiência.
 *
 * Fica de fora tudo que só existe para EDITAR o filtro — o `useState` do editor, os
 * modais `LocationEditor`/`TopBuyersProductEditor` (409 linhas que nunca aparecem numa
 * captura) e as duas queries (`useCampaignUtilPreviewAudience`, `useProductById`).
 * Os botões continuam desenhados, mas são inertes.
 * Ao mexer no original, refaça o diff contra este arquivo.
 */
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
	TCampaignFilterCondition,
	TCampaignFilterLogicOperatorEnum,
	TCampaignFilterTreeNode,
	TCampaignFiltersTree,
} from "@/schemas/campaigns";
import type { TUseCampaignState } from "@/state-hooks/use-campaign-state";
import { Building2, Crown, Filter, FolderPlus, MapPin, MapPinned, Pencil, Plus, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { STATIC_AUDIENCE_TOTAL, STATIC_PRODUCT_NAMES } from "../../../_fixtures/campaign-builder";

const noop = () => {};

type CampaignsFiltersBlockProps = {
	filtros: TUseCampaignState["state"]["filtros"];
};

const OPERATOR_LABELS: Record<TCampaignFilterLogicOperatorEnum, { label: string; description: string }> = {
	AND: { label: "TODOS", description: "Cliente deve satisfazer todos os filtros do grupo" },
	OR: { label: "QUALQUER", description: "Cliente deve satisfazer ao menos um filtro do grupo" },
	NOT: { label: "NÃO", description: "Exclui clientes que satisfaçam o filtro (exatamente 1 item)" },
};

export default function CampaignsFiltersBlock({ filtros }: CampaignsFiltersBlockProps) {
	const rootIsFullNot = filtros.operador === "NOT" && filtros.itens.length >= 1;

	return (
		<ResponsiveMenuSection title="FILTROS" icon={<Filter className="h-4 min-h-4 w-4 min-w-4" />}>
			<p className="text-xs italic text-muted-foreground">Combine filtros para refinar a audiência além das segmentações.</p>

			<StructuralWarnings filtros={filtros} />

			<FilterGroupBody node={filtros} path={[]} isRoot />

			<div className="flex w-full flex-wrap items-center gap-2 border-t border-border pt-3">
				<FastAddButton icon={<MapPinned className="h-3.5 w-3.5" />} label="ADICIONAR FILTRO DE ESTADO" disabled={rootIsFullNot} />
				<FastAddButton icon={<Building2 className="h-3.5 w-3.5" />} label="ADICIONAR FILTRO DE CIDADE" disabled={rootIsFullNot} />
				<FastAddButton icon={<MapPin className="h-3.5 w-3.5" />} label="ADICIONAR FILTRO DE BAIRRO" disabled={rootIsFullNot} />
				<FastAddButton icon={<Crown className="h-3.5 w-3.5" />} label="ADICIONAR TOP COMPRADORES DE PRODUTO" disabled={rootIsFullNot} />
			</div>

			<div className="flex items-center justify-between gap-2 rounded-md border border-border bg-primary/5 px-3 py-2">
				<p className="text-xs font-semibold uppercase tracking-wide text-foreground/80">PRÉVIA DA AUDIÊNCIA</p>
				<div className="flex flex-col gap-1">
					<p className="text-sm">
						<strong>{STATIC_AUDIENCE_TOTAL}</strong> CLIENTE(S)
					</p>
				</div>
			</div>
		</ResponsiveMenuSection>
	);
}

function StructuralWarnings({ filtros }: { filtros: TCampaignFiltersTree }) {
	const issues: string[] = [];

	function walk(node: TCampaignFilterTreeNode | TCampaignFiltersTree, label: string, isRoot: boolean) {
		if (node.tipo !== "GRUPO") return;
		if (node.operador === "NOT" && node.itens.length !== 1) {
			issues.push(`${label}: grupo NÃO deve conter exatamente 1 item.`);
		}
		if ((node.operador === "AND" || node.operador === "OR") && node.itens.length === 0 && !isRoot) {
			issues.push(`${label}: grupo vazio - adicione ao menos um filtro ou remova o grupo.`);
		}
		node.itens.forEach((child, idx) => walk(child, `${label} > item ${idx + 1}`, false));
	}
	walk(filtros, "Raiz", true);

	if (issues.length === 0) return null;
	return (
		<div className="rounded-md border border-amber-400/40 bg-amber-50 p-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
			<ul className="list-disc pl-4">
				{issues.map((issue) => (
					<li key={issue}>{issue}</li>
				))}
			</ul>
		</div>
	);
}

function FastAddButton({ icon, label, disabled }: { icon: ReactNode; label: string; disabled?: boolean }) {
	return (
		<Button
			type="button"
			size="sm"
			variant="ghost"
			className="flex items-center gap-1.5"
			disabled={disabled}
			title={disabled ? "Remova itens até restar um para usar NÃO" : undefined}
			onClick={noop}
		>
			<Plus className="h-3.5 w-3.5" />
			{icon}
			<span>{label}</span>
		</Button>
	);
}

type FilterGroupBodyProps = {
	node: TCampaignFiltersTree | Extract<TCampaignFilterTreeNode, { tipo: "GRUPO" }>;
	path: number[];
	isRoot?: boolean;
};
function FilterGroupBody({ node, path, isRoot }: FilterGroupBodyProps) {
	if (isRoot && node.itens.length === 0) {
		return (
			<div className="rounded-md border border-dashed border-border/30 p-3 text-center text-xs italic text-muted-foreground">
				Nenhum filtro adicionado. Use os botões abaixo para começar.
			</div>
		);
	}

	const groupIsFullNot = node.operador === "NOT" && node.itens.length >= 1;

	return (
		<div className={cn("flex w-full flex-col gap-2", !isRoot && "border-l-2 border-border pl-3")}>
			{!isRoot ? <GroupHeader operador={node.operador} itemCount={node.itens.length} /> : null}

			{node.itens.map((child, idx) => {
				const childPath = [...path, idx];
				if (child.tipo === "GRUPO") {
					return <FilterGroupBody key={childPath.join("-")} node={child} path={childPath} />;
				}
				return <FilterConditionCard key={childPath.join("-")} condicao={child.condicao} />;
			})}

			{!isRoot ? (
				<div className="flex flex-wrap items-center gap-2">
					<FastAddButton icon={<MapPin className="h-3.5 w-3.5" />} label="LOCALIZAÇÃO" disabled={groupIsFullNot} />
					<FastAddButton icon={<Crown className="h-3.5 w-3.5" />} label="TOP COMPRADORES" disabled={groupIsFullNot} />
					<FastAddButton icon={<FolderPlus className="h-3.5 w-3.5" />} label="SUBGRUPO" disabled={groupIsFullNot} />
				</div>
			) : null}
		</div>
	);
}

function GroupHeader({ operador, itemCount }: { operador: TCampaignFilterLogicOperatorEnum; itemCount: number }) {
	return (
		<div className="flex w-full flex-wrap items-center justify-between gap-2 rounded-md bg-primary/5 px-2 py-1">
			<div className="flex flex-wrap items-center gap-1">
				{(Object.keys(OPERATOR_LABELS) as TCampaignFilterLogicOperatorEnum[]).map((op) => {
					const disabled = op === "NOT" && itemCount > 1;
					const active = operador === op;
					return (
						<button
							key={op}
							type="button"
							disabled={disabled}
							title={disabled ? "Remova itens até restar um para usar NÃO" : OPERATOR_LABELS[op].description}
							className={cn(
								"rounded border px-2 py-0.5 text-[10px] font-semibold tracking-wide transition-colors",
								active ? "border-border bg-primary text-foreground-foreground" : "border-border text-foreground/70 hover:bg-primary/10",
								disabled && "cursor-not-allowed opacity-50",
							)}
						>
							{OPERATOR_LABELS[op].label}
						</button>
					);
				})}
			</div>
			<button
				type="button"
				aria-label="Remover grupo"
				className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
				onClick={noop}
			>
				<Trash2 className="h-3.5 w-3.5" />
			</button>
		</div>
	);
}

function FilterConditionCard({ condicao }: { condicao: TCampaignFilterCondition }) {
	return (
		<div className="flex w-full items-start justify-between gap-2 rounded-md border border-border/15 bg-background p-2">
			<div className="flex min-w-0 flex-1 items-start gap-2">
				{condicao.tipo === "LOCALIZAÇÃO" ? (
					<MapPin className="h-4 min-h-4 w-4 min-w-4 text-foreground/70" />
				) : (
					<Crown className="h-4 min-h-4 w-4 min-w-4 text-foreground/70" />
				)}
				<ConditionSummary condicao={condicao} />
			</div>
			<div className="flex shrink-0 items-center gap-1">
				<button
					type="button"
					aria-label="Editar filtro"
					onClick={noop}
					className="rounded p-1 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
				>
					<Pencil className="h-3.5 w-3.5" />
				</button>
				<button
					type="button"
					aria-label="Remover filtro"
					onClick={noop}
					className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
				>
					<Trash2 className="h-3.5 w-3.5" />
				</button>
			</div>
		</div>
	);
}

function ConditionSummary({ condicao }: { condicao: TCampaignFilterCondition }) {
	if (condicao.tipo === "LOCALIZAÇÃO") {
		return (
			<div className="flex min-w-0 flex-col">
				<span className="text-xs font-semibold uppercase tracking-wide text-foreground/80">Localização</span>
				<LocationDetails condicao={condicao} />
			</div>
		);
	}
	return (
		<div className="flex min-w-0 flex-col">
			<span className="text-xs font-semibold uppercase tracking-wide text-foreground/80">Top compradores de produto</span>
			<TopBuyersDetails condicao={condicao} />
		</div>
	);
}

function LocationDetails({ condicao }: { condicao: Extract<TCampaignFilterCondition, { tipo: "LOCALIZAÇÃO" }> }) {
	const rows: { label: string; values: string[] | undefined }[] = [
		{ label: "ESTADOS", values: condicao.configuracao.estados },
		{ label: "CIDADES", values: condicao.configuracao.cidades },
		{ label: "BAIRROS", values: condicao.configuracao.bairros },
	];
	const nonEmpty = rows.filter((row) => row.values && row.values.length > 0);
	if (nonEmpty.length === 0) return null;
	return (
		<div className="mt-1 flex flex-col gap-0.5 text-[11px] text-muted-foreground">
			{nonEmpty.map((row) => (
				<div key={row.label} className="truncate">
					<span className="font-medium text-foreground/60">{row.label}:</span> <strong>{row.values?.join(", ")}</strong>
				</div>
			))}
		</div>
	);
}

function TopBuyersDetails({ condicao }: { condicao: Extract<TCampaignFilterCondition, { tipo: "TOP_COMPRADORES_PRODUTO" }> }) {
	const { produtoId, janela, top } = condicao.configuracao;
	const productName = STATIC_PRODUCT_NAMES[produtoId] ?? "produto não encontrado";
	const janelaLabel = janela === "GERAL" ? "geral" : janela === "30_DIAS" ? "últimos 30 dias" : "últimos 90 dias";
	return (
		<span className="truncate text-sm">
			Top {top} compradores de <strong>{productName}</strong> <span className="text-muted-foreground">({janelaLabel})</span>
		</span>
	);
}
