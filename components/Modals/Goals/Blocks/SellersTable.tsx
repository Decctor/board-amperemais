"use client";

import SelectInput from "@/components/Inputs/SelectInput";
import DeleteRowButton from "@/components/Spreadsheet/DeleteRowButton";
import EditableNumberCell from "@/components/Spreadsheet/EditableNumberCell";
import MobileEditableField from "@/components/Spreadsheet/MobileEditableField";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { TGetSellersOutputDefault } from "@/app/api/sellers/route";
import { getErrorMessage } from "@/lib/errors";
import { formatDecimalPlaces, formatNameAsInitials, formatToMoney } from "@/lib/formatting";
import {
	distributeGoalEqually,
	resolveGoalDistribution,
	resolveSellerGoalShare,
	resolveSellerGoalValueFromShare,
} from "@/lib/goals/distribution";
import { useSellers } from "@/lib/queries/sellers";
import { SPREADSHEET_TABLE_ATTR, type SpreadsheetGridBounds } from "@/lib/spreadsheet-navigation";
import { cn } from "@/lib/utils";
import type { TUseGoalsState } from "@/state-hooks/use-goal-state";
import { CheckCircle2, CircleAlert, Plus, TriangleAlert, UsersRound } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";

/**
 * Metas por vendedor como planilha.
 *
 * A repartição de uma meta é trabalho tabular: as mesmas três colunas repetidas por pessoa, lidas na
 * vertical para conferir a soma. A lista de cards anterior obrigava a somar de cabeça e não tinha
 * como dizer "este vendedor não participa desta meta" — todo vendedor da organização virava linha,
 * a maioria em zero.
 *
 * A coluna de **fatia (%)** é editável, e é o motivo de a tabela existir: o gerente pensa em "a Ana
 * leva 40% do mês", não em reais. Digitar de um lado recalcula o outro; são duas leituras do mesmo
 * número, e qualquer uma governa.
 */

const CELL_TRIGGER_CLASSNAME =
	"h-8 justify-between rounded-md border-transparent bg-transparent px-2 text-xs font-medium shadow-none hover:border-border hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/40";

type TGoalSellerRow = TUseGoalsState["state"]["goalSellers"][number];
type TSellerOption = TGetSellersOutputDefault["sellers"][number];

/**
 * Índices de navegação das colunas visíveis.
 *
 * Quantidade de vendas e novos clientes só existem quando a meta define esses objetivos, então a
 * grade encolhe. Numerar as colunas fixamente deixaria buracos por onde as setas do teclado cairiam
 * em células que não estão na tela.
 */
function resolveGridColumns({ hasQtdeVendas, hasNovosClientes }: { hasQtdeVendas: boolean; hasNovosClientes: boolean }) {
	const columns = { VALOR: 0, SHARE: 1, QTDE: -1, NOVOS: -1 };
	let next = 2;
	if (hasQtdeVendas) columns.QTDE = next++;
	if (hasNovosClientes) columns.NOVOS = next++;
	return { columns, colCount: next };
}

type GoalSellersTableProps = {
	objetivoValor: number;
	objetivoQtdeVendas?: number | null;
	objetivoNovosClientes?: number | null;
	goalSellers: TGoalSellerRow[];
	updateGoal: TUseGoalsState["updateGoal"];
	addGoalSeller: TUseGoalsState["addGoalSeller"];
	updateGoalSeller: TUseGoalsState["updateGoalSeller"];
	updateManyGoalSellers: TUseGoalsState["updateManyGoalSellers"];
	removeGoalSellerByVendedorId: TUseGoalsState["removeGoalSellerByVendedorId"];
	restoreGoalSeller: TUseGoalsState["restoreGoalSeller"];
};

export default function GoalSellersTable({
	objetivoValor,
	objetivoQtdeVendas,
	objetivoNovosClientes,
	goalSellers,
	updateGoal,
	addGoalSeller,
	updateGoalSeller,
	updateManyGoalSellers,
	removeGoalSellerByVendedorId,
	restoreGoalSeller,
}: GoalSellersTableProps) {
	const { data: sellersData, isLoading, isError, error } = useSellers({});

	const hasQtdeVendas = Boolean(objetivoQtdeVendas);
	const hasNovosClientes = Boolean(objetivoNovosClientes);
	const { columns, colCount } = resolveGridColumns({ hasQtdeVendas, hasNovosClientes });

	const visibleRows = useMemo(() => goalSellers.filter((goalSeller) => !goalSeller.deletar), [goalSellers]);
	const distribution = resolveGoalDistribution({ objetivoValor, goalSellers });

	const availableSellers = useMemo(
		() => (sellersData?.sellers ?? []).filter((seller) => !visibleRows.some((row) => row.vendedorId === seller.id)),
		[sellersData, visibleRows],
	);

	const gridBounds: SpreadsheetGridBounds = useMemo(() => ({ rowCount: visibleRows.length, colCount }), [visibleRows.length, colCount]);

	// A tabela é a mesma para 3 e para 30 vendedores; só a coluna de nome precisa de espaço fixo.
	const gridTemplate = ["minmax(0, 2.2fr)", "minmax(0, 1.4fr)", "minmax(0, 1fr)", hasQtdeVendas ? "minmax(0, 1fr)" : null, hasNovosClientes ? "minmax(0, 1.1fr)" : null, "44px"]
		.filter(Boolean)
		.join(" ");

	function handleAddSeller(vendedorId: string) {
		const seller = (sellersData?.sellers ?? []).find((item) => item.id === vendedorId);
		if (!seller) return;
		addGoalSeller({
			vendedorId: seller.id,
			objetivoValor: 0,
			objetivoQtdeVendas: null,
			objetivoNovosClientes: null,
			vendedor: { nome: seller.nome, avatarUrl: seller.avatarUrl, telefone: seller.telefone, email: seller.email },
		});
	}

	function handleRemove(row: TGoalSellerRow) {
		removeGoalSellerByVendedorId(row.vendedorId);
		toast.success(`${row.vendedor?.nome ?? "Vendedor"} removido da meta.`, {
			action: { label: "DESFAZER", onClick: () => restoreGoalSeller(row) },
		});
	}

	function handleDistributeEqually() {
		if (visibleRows.length === 0) return;
		const amounts = distributeGoalEqually(objetivoValor, visibleRows.length);
		const qtdeAmounts = objetivoQtdeVendas ? distributeGoalEqually(objetivoQtdeVendas, visibleRows.length) : null;
		const clientesAmounts = objetivoNovosClientes ? distributeGoalEqually(objetivoNovosClientes, visibleRows.length) : null;

		let visibleIndex = 0;
		updateManyGoalSellers(
			goalSellers.map((goalSeller) => {
				if (goalSeller.deletar) return goalSeller;
				const index = visibleIndex++;
				return {
					...goalSeller,
					objetivoValor: amounts[index] ?? 0,
					objetivoQtdeVendas: qtdeAmounts ? Math.round(qtdeAmounts[index] ?? 0) : goalSeller.objetivoQtdeVendas,
					objetivoNovosClientes: clientesAmounts ? Math.round(clientesAmounts[index] ?? 0) : goalSeller.objetivoNovosClientes,
				};
			}),
		);
		toast.success(`${formatToMoney(objetivoValor)} distribuídos entre ${visibleRows.length} vendedores.`);
	}

	function handleAdoptSellersTotal() {
		updateGoal({ objetivoValor: distribution.total });
		toast.success(`Meta geral ajustada para ${formatToMoney(distribution.total)}.`);
	}

	const statusLabel =
		distribution.status === "SEM_VENDEDORES"
			? "SEM VENDEDORES"
			: distribution.status === "DISTRIBUIDO"
				? "DISTRIBUÍDO"
				: distribution.status === "EXCEDENTE"
					? "EXCEDENTE"
					: "PENDENTE";

	return (
		<ResponsiveMenuSection title="VENDEDORES" icon={<UsersRound className="h-4 min-h-4 w-4 min-w-4" />}>
			<div className="flex w-full flex-col gap-2">
				<div
					className={cn("flex w-full flex-col gap-3 rounded-md border p-3", {
						"border-border bg-muted/30": distribution.status === "SEM_VENDEDORES" || distribution.fechado,
						"border-brand/40 bg-brand/10": !distribution.fechado && distribution.status !== "SEM_VENDEDORES",
					})}
				>
					<div className="flex w-full flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
						<div className="flex min-w-0 flex-col gap-1">
							<div className="flex flex-wrap items-center gap-2">
								<p className="text-sm font-bold tracking-tight">Repartição da meta</p>
								<Badge
									variant={distribution.fechado ? "secondary" : "outline"}
									className={cn("flex h-fit items-center gap-1.5 rounded-md py-1", {
										"bg-success/10 text-success": distribution.fechado,
									})}
								>
									{distribution.fechado ? (
										<CheckCircle2 className="h-4 min-h-4 w-4 min-w-4" />
									) : distribution.status === "SEM_VENDEDORES" ? (
										<TriangleAlert className="h-4 min-h-4 w-4 min-w-4" />
									) : (
										<CircleAlert className="h-4 min-h-4 w-4 min-w-4" />
									)}
									{statusLabel}
								</Badge>
							</div>
							<p aria-live="polite" className="text-xs font-medium tabular-nums text-muted-foreground">
								{formatToMoney(distribution.total)} de {formatToMoney(objetivoValor)} em {distribution.quantidadeVendedores}{" "}
								{distribution.quantidadeVendedores === 1 ? "vendedor" : "vendedores"}
							</p>
						</div>

						<div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
							<p
								className={cn("text-xs font-bold tabular-nums", {
									"text-success": distribution.fechado,
									"text-muted-foreground": distribution.status === "SEM_VENDEDORES",
								})}
							>
								{distribution.status === "SEM_VENDEDORES"
									? "META NÃO REPARTIDA"
									: distribution.fechado
										? "SEM DIFERENÇA"
										: distribution.excedente
											? `${formatToMoney(Math.abs(distribution.restante))} ACIMA`
											: `FALTAM ${formatToMoney(distribution.restante)}`}
							</p>
							{/* As duas conciliações possíveis, lado a lado e nomeadas pelo que fazem. Antes
							    elas viviam em blocos diferentes do formulário, puxando em sentidos opostos. */}
							{!distribution.fechado && visibleRows.length > 0 ? (
								<div className="flex flex-wrap gap-1.5">
									<Button type="button" size="sm" variant="secondary" className="h-8 text-xs" onClick={handleDistributeEqually}>
										DISTRIBUIR IGUALMENTE
									</Button>
									<Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={handleAdoptSellersTotal}>
										USAR SOMA DOS VENDEDORES
									</Button>
								</div>
							) : null}
						</div>
					</div>
				</div>

				{isLoading ? <p className="w-full animate-pulse text-center text-sm text-muted-foreground">Carregando vendedores...</p> : null}
				{isError ? <p className="w-full text-center text-sm text-destructive">{getErrorMessage(error)}</p> : null}

				<div {...{ [SPREADSHEET_TABLE_ATTR]: "true" }} className="flex w-full flex-col overflow-hidden rounded-md border border-border bg-background">
					<div
						className="hidden min-h-9 w-full items-center gap-1 border-b border-border bg-muted/60 px-2 py-1.5 text-[0.68rem] font-medium uppercase text-muted-foreground lg:grid"
						style={{ gridTemplateColumns: gridTemplate }}
					>
						<p className="px-2 text-start">Vendedor</p>
						<p className="px-2 text-center">Meta (R$)</p>
						<p className="px-2 text-center">Fatia</p>
						{hasQtdeVendas ? <p className="px-2 text-center">Qtde vendas</p> : null}
						{hasNovosClientes ? <p className="px-2 text-center">Novos clientes</p> : null}
						<p className="px-2 text-center">Ações</p>
					</div>

					<div className="flex w-full flex-col bg-background">
						{visibleRows.map((row, rowIndex) => (
							<GoalSellerTableRow
								key={row.id ?? row.vendedorId}
								row={row}
								objetivoValor={objetivoValor}
								gridTemplate={gridTemplate}
								gridRow={rowIndex}
								gridBounds={gridBounds}
								columns={columns}
								hasQtdeVendas={hasQtdeVendas}
								hasNovosClientes={hasNovosClientes}
								handleUpdate={(item) => updateGoalSeller({ ...row, ...item })}
								handleRemove={() => handleRemove(row)}
							/>
						))}

						<DraftSellerRow
							availableSellers={availableSellers}
							hasAnySeller={(sellersData?.sellers ?? []).length > 0}
							onSelect={handleAddSeller}
						/>

						{visibleRows.length === 0 ? (
							<div className="flex w-full flex-col items-center gap-1 border-t border-border px-3 py-3">
								<p className="text-center text-xs font-bold tracking-tight text-foreground/80">Nenhum vendedor nesta meta.</p>
								<p className="max-w-[52ch] text-center text-xs text-muted-foreground">
									A meta funciona sem repartir. Adicione vendedores para acompanhar o resultado individual de cada um.
								</p>
							</div>
						) : null}
					</div>
				</div>
			</div>
		</ResponsiveMenuSection>
	);
}

type GoalSellerTableRowProps = {
	row: TGoalSellerRow;
	objetivoValor: number;
	gridTemplate: string;
	gridRow: number;
	gridBounds: SpreadsheetGridBounds;
	columns: { VALOR: number; SHARE: number; QTDE: number; NOVOS: number };
	hasQtdeVendas: boolean;
	hasNovosClientes: boolean;
	handleUpdate: (item: Partial<TGoalSellerRow>) => void;
	handleRemove: () => void;
};

function GoalSellerTableRow({
	row,
	objetivoValor,
	gridTemplate,
	gridRow,
	gridBounds,
	columns,
	hasQtdeVendas,
	hasNovosClientes,
	handleUpdate,
	handleRemove,
}: GoalSellerTableRowProps) {
	const share = resolveSellerGoalShare({ objetivoValor, objetivoValorVendedor: row.objetivoValor });

	const valueCell = (
		<EditableNumberCell
			value={row.objetivoValor}
			ariaLabel={`Editar meta de valor de ${row.vendedor?.nome ?? "vendedor"}`}
			min={0}
			gridRow={gridRow}
			gridCol={columns.VALOR}
			gridBounds={gridBounds}
			format={(value) => (value > 0 ? formatToMoney(value) : "-")}
			onCommit={(objetivoValorVendedor) => handleUpdate({ objetivoValor: objetivoValorVendedor })}
		/>
	);

	const shareCell = (
		<EditableNumberCell
			value={share}
			ariaLabel={`Editar fatia da meta de ${row.vendedor?.nome ?? "vendedor"}`}
			min={0}
			gridRow={gridRow}
			gridCol={columns.SHARE}
			gridBounds={gridBounds}
			format={(value) => (value > 0 ? `${formatDecimalPlaces(value)}%` : "-")}
			onCommit={(fatiaPercentual) => handleUpdate({ objetivoValor: resolveSellerGoalValueFromShare({ objetivoValor, fatiaPercentual }) })}
		/>
	);

	const qtdeCell = (
		<EditableNumberCell
			value={row.objetivoQtdeVendas ?? 0}
			ariaLabel={`Editar meta de quantidade de vendas de ${row.vendedor?.nome ?? "vendedor"}`}
			min={0}
			gridRow={gridRow}
			gridCol={columns.QTDE}
			gridBounds={gridBounds}
			format={(value) => (value > 0 ? formatDecimalPlaces(value, 0, 0) : "-")}
			onCommit={(value) => handleUpdate({ objetivoQtdeVendas: value || null })}
		/>
	);

	const novosCell = (
		<EditableNumberCell
			value={row.objetivoNovosClientes ?? 0}
			ariaLabel={`Editar meta de novos clientes de ${row.vendedor?.nome ?? "vendedor"}`}
			min={0}
			gridRow={gridRow}
			gridCol={columns.NOVOS}
			gridBounds={gridBounds}
			format={(value) => (value > 0 ? formatDecimalPlaces(value, 0, 0) : "-")}
			onCommit={(value) => handleUpdate({ objetivoNovosClientes: value || null })}
		/>
	);

	const sellerIdentity = (
		<div className="flex min-w-0 items-center gap-2">
			<Avatar className="h-6 w-6 min-h-6 min-w-6 shrink-0">
				<AvatarImage src={row.vendedor?.avatarUrl ?? undefined} />
				<AvatarFallback className="text-[0.5rem]">{formatNameAsInitials(row.vendedor?.nome ?? "?")}</AvatarFallback>
			</Avatar>
			<span className="truncate text-xs font-bold">{row.vendedor?.nome ?? "Vendedor"}</span>
		</div>
	);

	return (
		<div className="border-t border-border first:border-t-0">
			<div
				className="hidden min-h-11 w-full items-center gap-1 px-2 py-1 text-xs transition-colors hover:bg-muted/40 lg:grid"
				style={{ gridTemplateColumns: gridTemplate }}
			>
				<div className="px-1">{sellerIdentity}</div>
				<div className="px-1">{valueCell}</div>
				<div className="px-1">{shareCell}</div>
				{hasQtdeVendas ? <div className="px-1">{qtdeCell}</div> : null}
				{hasNovosClientes ? <div className="px-1">{novosCell}</div> : null}
				<div className="flex justify-center px-1">
					<DeleteRowButton onRemove={handleRemove} ariaLabel={`Remover ${row.vendedor?.nome ?? "vendedor"} da meta`} />
				</div>
			</div>

			<div className="flex w-full flex-col gap-2 p-2 lg:hidden">
				<div className="flex w-full items-start justify-between gap-2">
					{sellerIdentity}
					<DeleteRowButton onRemove={handleRemove} ariaLabel={`Remover ${row.vendedor?.nome ?? "vendedor"} da meta`} />
				</div>
				<div className="grid w-full grid-cols-2 gap-2">
					<MobileEditableField label="Meta (R$)">
						<EditableNumberCell
							value={row.objetivoValor}
							ariaLabel={`Editar meta de valor de ${row.vendedor?.nome ?? "vendedor"}`}
							min={0}
							format={(value) => (value > 0 ? formatToMoney(value) : "-")}
							onCommit={(objetivoValorVendedor) => handleUpdate({ objetivoValor: objetivoValorVendedor })}
						/>
					</MobileEditableField>
					<MobileEditableField label="Fatia">
						<EditableNumberCell
							value={share}
							ariaLabel={`Editar fatia da meta de ${row.vendedor?.nome ?? "vendedor"}`}
							min={0}
							format={(value) => (value > 0 ? `${formatDecimalPlaces(value)}%` : "-")}
							onCommit={(fatiaPercentual) => handleUpdate({ objetivoValor: resolveSellerGoalValueFromShare({ objetivoValor, fatiaPercentual }) })}
						/>
					</MobileEditableField>
					{hasQtdeVendas ? (
						<MobileEditableField label="Qtde vendas">
							<EditableNumberCell
								value={row.objetivoQtdeVendas ?? 0}
								ariaLabel={`Editar meta de quantidade de vendas de ${row.vendedor?.nome ?? "vendedor"}`}
								min={0}
								format={(value) => (value > 0 ? formatDecimalPlaces(value, 0, 0) : "-")}
								onCommit={(value) => handleUpdate({ objetivoQtdeVendas: value || null })}
							/>
						</MobileEditableField>
					) : null}
					{hasNovosClientes ? (
						<MobileEditableField label="Novos clientes">
							<EditableNumberCell
								value={row.objetivoNovosClientes ?? 0}
								ariaLabel={`Editar meta de novos clientes de ${row.vendedor?.nome ?? "vendedor"}`}
								min={0}
								format={(value) => (value > 0 ? formatDecimalPlaces(value, 0, 0) : "-")}
								onCommit={(value) => handleUpdate({ objetivoNovosClientes: value || null })}
							/>
						</MobileEditableField>
					) : null}
				</div>
			</div>
		</div>
	);
}

/**
 * Linha tracejada de rodapé que adiciona um vendedor à meta.
 *
 * Diferente da linha rascunho das compras, a escolha do vendedor **já confirma** a linha, com meta
 * zero. Uma transação sem valor não é um pagamento, mas um vendedor com meta zero é um estado
 * legítimo: adiciona-se todo mundo e depois se distribui pelo rodapé, que é como a repartição de
 * fato acontece.
 */
function DraftSellerRow({
	availableSellers,
	hasAnySeller,
	onSelect,
}: {
	availableSellers: TSellerOption[];
	hasAnySeller: boolean;
	onSelect: (vendedorId: string) => void;
}) {
	if (!hasAnySeller) return null;

	if (availableSellers.length === 0) {
		return (
			<div className="border-t border-dashed border-border bg-muted/20 px-3 py-2.5">
				<p className="text-center text-xs text-muted-foreground">Todos os vendedores da organização já estão nesta meta.</p>
			</div>
		);
	}

	return (
		<div className="border-t border-dashed border-border bg-muted/20 px-2 py-1.5">
			<div className="flex items-center gap-1.5">
				<Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
				<div className="min-w-0 max-w-xs flex-1">
					<SelectInput
						label="Adicionar vendedor à meta"
						showLabel={false}
						resetOptionLabel="ADICIONAR VENDEDOR"
						options={availableSellers.map((seller) => ({ id: seller.id, value: seller.id, label: seller.nome }))}
						value=""
						holderClassName={CELL_TRIGGER_CLASSNAME}
						handleChange={(vendedorId) => onSelect(vendedorId)}
						onReset={() => undefined}
					/>
				</div>
			</div>
		</div>
	);
}
