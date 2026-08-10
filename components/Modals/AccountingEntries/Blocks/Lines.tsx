"use client";

import SelectInput from "@/components/Inputs/SelectInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { formatToMoney } from "@/lib/formatting";
import { useAccountCharts } from "@/lib/queries/finances";
import type { TUseInternalAccountingEntryState } from "@/state-hooks/use-internal-accounting-entry-state";
import { CheckCircle2, Plus, Table2, Trash2, TriangleAlert } from "lucide-react";
import { useMemo } from "react";

type AccountingEntryLinesBlockProps = {
	entry: TUseInternalAccountingEntryState["state"]["entry"];
	entryLines: TUseInternalAccountingEntryState["state"]["entryLines"];
	updateEntry: TUseInternalAccountingEntryState["updateEntry"];
	addEntryLine: TUseInternalAccountingEntryState["addEntryLine"];
	updateEntryLine: TUseInternalAccountingEntryState["updateEntryLine"];
	removeEntryLine: TUseInternalAccountingEntryState["removeEntryLine"];
	editable?: boolean;
};

function roundTo2(value: number) {
	return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function getEntryLinesTotals(entryLines: AccountingEntryLinesBlockProps["entryLines"]) {
	const debitos = roundTo2(entryLines.filter((line) => line.natureza === "DEBITO").reduce((total, line) => total + (Number(line.valor) || 0), 0));
	const creditos = roundTo2(entryLines.filter((line) => line.natureza === "CREDITO").reduce((total, line) => total + (Number(line.valor) || 0), 0));
	return { debitos, creditos };
}

/** Erro que impede o envio, na mesma linguagem que o servidor usaria — evita o round-trip. */
export function getEntryLinesError(entry: { valor: number }, entryLines: AccountingEntryLinesBlockProps["entryLines"]) {
	if (entryLines.length < 2) return "O lançamento precisa de ao menos uma linha de débito e uma de crédito.";
	if (entryLines.some((line) => !line.contaContabilId)) return "Toda linha contábil precisa de uma conta.";
	if (entryLines.some((line) => !(Number(line.valor) > 0))) return "Toda linha contábil precisa de um valor maior que zero.";
	const { debitos, creditos } = getEntryLinesTotals(entryLines);
	if (debitos !== creditos) return "As linhas contábeis não estão balanceadas.";
	if (debitos !== roundTo2(entry.valor)) return "O total das linhas contábeis não corresponde ao valor do lançamento.";
	return null;
}

export default function AccountingEntryLinesBlock({
	entry,
	entryLines,
	updateEntry,
	addEntryLine,
	updateEntryLine,
	removeEntryLine,
	editable = true,
}: AccountingEntryLinesBlockProps) {
	const { data: accountCharts } = useAccountCharts({ initialFilters: {} });

	const accountOptions = useMemo(
		() =>
			accountCharts?.map((chart) => ({
				id: chart.id,
				value: chart.id,
				label: `${chart.codigo ? `${chart.codigo} - ` : ""}${chart.nome}`,
			})) ?? [],
		[accountCharts],
	);

	const { debitos, creditos } = getEntryLinesTotals(entryLines);
	const balanced = debitos === creditos && debitos > 0;
	const matchesEntryValue = balanced && debitos === roundTo2(entry.valor);

	function handleAddLine() {
		// Semeia a linha com o que falta para fechar a partida: natureza no lado mais leve e valor na
		// diferença — o caminho comum é completar o balanceamento, não começar do zero.
		const natureza = debitos <= creditos ? "DEBITO" : "CREDITO";
		const remainder = roundTo2(Math.abs(debitos - creditos));
		addEntryLine({ natureza, valor: remainder > 0 ? remainder : roundTo2(entry.valor) || 0 });
	}

	return (
		<ResponsiveMenuSection title="PARTIDAS DO LANÇAMENTO" icon={<Table2 className="h-4 w-4" />}>
			<p className="text-xs text-muted-foreground">
				Cada linha debita ou credita uma conta contábil. Os débitos e os créditos precisam somar o valor do lançamento.
			</p>
			<div className="flex w-full flex-col overflow-hidden rounded-md border border-border">
				{/* Cabeçalho só onde a linha vira mesmo uma grade; no mobile cada campo carrega o próprio rótulo. */}
				<div className="hidden grid-cols-[minmax(0,1fr)_9rem_9rem_minmax(0,1fr)_2.5rem] items-center gap-3 border-b border-border bg-muted/40 px-3 py-2 text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground lg:grid">
					<span>Conta contábil</span>
					<span>Natureza</span>
					<span className="text-right">Valor</span>
					<span>Descrição</span>
					<span />
				</div>
				{entryLines.map((line, index) => (
					<div
						key={index}
						className="grid grid-cols-1 gap-3 border-b border-border px-3 py-3 last:border-b-0 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_9rem_9rem_minmax(0,1fr)_2.5rem] lg:items-center lg:py-2"
					>
						<div className="min-w-0">
							<SelectInput
								label={`Conta contábil da linha ${index + 1}`}
								showLabel={false}
								editable={editable}
								value={line.contaContabilId || null}
								options={accountOptions}
								resetOptionLabel="NENHUMA CONTA"
								// `holderClassName` compõe com o estilo padrão do gatilho; `triggerProps.className` o substituiria.
								holderClassName="h-9 text-xs font-normal lg:h-8"
								handleChange={(value) => updateEntryLine({ index, changes: { contaContabilId: value } })}
								onReset={() => updateEntryLine({ index, changes: { contaContabilId: "" } })}
							/>
						</div>
						<Select
							disabled={!editable}
							value={line.natureza}
							onValueChange={(value) => updateEntryLine({ index, changes: { natureza: value as "DEBITO" | "CREDITO" } })}
						>
							<SelectTrigger size="sm" aria-label={`Natureza da linha ${index + 1}`} className="w-full text-xs">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="DEBITO">Débito</SelectItem>
								<SelectItem value="CREDITO">Crédito</SelectItem>
							</SelectContent>
						</Select>
						<Input
							type="number"
							aria-label={`Valor da linha ${index + 1}`}
							min={0.01}
							step={0.01}
							disabled={!editable}
							value={line.valor || ""}
							onChange={(event) => updateEntryLine({ index, changes: { valor: Number(event.target.value) || 0 } })}
							className="h-9 text-right text-xs lg:h-8"
						/>
						<Input
							type="text"
							aria-label={`Descrição da linha ${index + 1}`}
							placeholder="Descrição (opcional)"
							disabled={!editable}
							value={line.descricao ?? ""}
							onChange={(event) => updateEntryLine({ index, changes: { descricao: event.target.value || null } })}
							className="h-9 text-xs lg:h-8"
						/>
						{editable ? (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								aria-label={`Remover linha ${index + 1}`}
								className="w-full gap-1.5 text-xs text-muted-foreground hover:text-destructive lg:h-8 lg:w-8 lg:p-0"
								onClick={() => removeEntryLine(index)}
							>
								<Trash2 className="h-3.5 w-3.5" />
								<span className="lg:hidden">REMOVER LINHA</span>
							</Button>
						) : (
							<span className="hidden lg:block" />
						)}
					</div>
				))}
			</div>
			{editable ? (
				<Button type="button" variant="outline" size="sm" className="w-full gap-1.5 text-xs" onClick={handleAddLine}>
					<Plus className="h-3.5 w-3.5" /> ADICIONAR LINHA
				</Button>
			) : null}
			<div className="flex flex-col gap-2 rounded-md border border-border bg-muted/20 px-3 py-2 text-xs sm:flex-row sm:items-center sm:justify-between">
				<div className="flex items-center gap-4 font-mono">
					<span>
						<span className="text-muted-foreground">Débitos </span>
						<span className="font-medium">{formatToMoney(debitos)}</span>
					</span>
					<span>
						<span className="text-muted-foreground">Créditos </span>
						<span className="font-medium">{formatToMoney(creditos)}</span>
					</span>
				</div>
				{matchesEntryValue ? (
					<span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-500">
						<CheckCircle2 className="h-3.5 w-3.5" /> Partida balanceada
					</span>
				) : (
					<span className="flex items-center gap-1 text-amber-700 dark:text-amber-500">
						<TriangleAlert className="h-3.5 w-3.5" />
						{balanced ? "Total difere do valor do lançamento" : "Débitos e créditos não fecham"}
					</span>
				)}
			</div>
			{editable && balanced && !matchesEntryValue ? (
				<Button type="button" variant="outline" size="sm" className="w-fit text-xs" onClick={() => updateEntry({ valor: debitos })}>
					USAR TOTAL DAS LINHAS ({formatToMoney(debitos)})
				</Button>
			) : null}
		</ResponsiveMenuSection>
	);
}
