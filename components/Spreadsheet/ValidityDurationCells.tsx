"use client";

import EditableNumberCell from "@/components/Spreadsheet/EditableNumberCell";
import SpreadsheetCellWrapper from "@/components/Spreadsheet/SpreadsheetCellWrapper";
import { SelectGroup, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatNumericInputValue } from "@/lib/formatting";
import { consumeProgrammaticSpreadsheetFocus, handleSpreadsheetNavigationKeyDown, type SpreadsheetGridBounds } from "@/lib/spreadsheet-navigation";
import type { KeyboardEvent } from "react";

export type ValidityDurationMeasure = "MINUTOS" | "HORAS" | "DIAS";

export const VALIDITY_DURATION_OPTIONS: { id: string; label: string; value: ValidityDurationMeasure }[] = [
	{ id: "MINUTOS", label: "Minutos", value: "MINUTOS" },
	{ id: "HORAS", label: "Horas", value: "HORAS" },
	{ id: "DIAS", label: "Dias", value: "DIAS" },
];

export function normalizeValidityDurationMeasure(value: string | null | undefined): ValidityDurationMeasure | null {
	if (value === "MINUTOS" || value === "HORAS" || value === "DIAS") return value;
	return null;
}

export function formatValidityDurationDisplay(value: number, measure: ValidityDurationMeasure | null | undefined) {
	if (value <= 0) return "-";
	if (measure) {
		const measureLabel = VALIDITY_DURATION_OPTIONS.find((option) => option.value === measure)?.label;
		return `${formatNumericInputValue(value)} ${measureLabel ?? measure}`;
	}
	return formatNumericInputValue(value);
}

type ValidityDurationValueCellProps = {
	value: number | null | undefined;
	measure: ValidityDurationMeasure | null | undefined;
	gridRow: number;
	gridCol: number;
	gridBounds: SpreadsheetGridBounds;
	onCommit: (value: number) => void;
};

export function ValidityDurationValueCell({ value, measure, gridRow, gridCol, gridBounds, onCommit }: ValidityDurationValueCellProps) {
	return (
		<EditableNumberCell
			value={value ?? 0}
			ariaLabel="Editar prazo de validade"
			min={0}
			gridRow={gridRow}
			gridCol={gridCol}
			gridBounds={gridBounds}
			emptyDisplay="-"
			format={(nextValue) => formatValidityDurationDisplay(nextValue, measure)}
			onCommit={onCommit}
		/>
	);
}

type ValidityDurationMeasureCellProps = {
	measure: ValidityDurationMeasure | null | undefined;
	gridRow: number;
	gridCol: number;
	gridBounds: SpreadsheetGridBounds;
	onMeasureChange: (value: ValidityDurationMeasure) => void;
	onReset: () => void;
};

export function ValidityDurationMeasureCell({ measure, gridRow, gridCol, gridBounds, onMeasureChange, onReset }: ValidityDurationMeasureCellProps) {
	function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
		if (event.currentTarget.getAttribute("data-state") === "open") return;

		const handled = handleSpreadsheetNavigationKeyDown(event, {
			coords: { row: gridRow, col: gridCol },
			bounds: gridBounds,
		});

		if (handled) consumeProgrammaticSpreadsheetFocus();
	}

	return (
		<SpreadsheetCellWrapper gridRow={gridRow} gridCol={gridCol}>
			<Select
				items={[...VALIDITY_DURATION_OPTIONS.map((option) => ({ value: option.value, label: option.label })), { value: "__reset__", label: "Limpar" }]}
				value={measure ?? null}
				onValueChange={(nextMeasure) => {
					if (nextMeasure === null) return;
					if (nextMeasure === "__reset__") {
						onReset();
						return;
					}
					onMeasureChange(nextMeasure as ValidityDurationMeasure);
				}}
			>
				<SelectTrigger
					className="h-8 w-full border-border px-1.5 text-[0.65rem] shadow-none"
					onFocus={() => {
						consumeProgrammaticSpreadsheetFocus();
					}}
					onKeyDown={handleKeyDown}
				>
					<SelectValue placeholder="Med." />
				</SelectTrigger>
				<SelectContent>
					<SelectGroup>
						{VALIDITY_DURATION_OPTIONS.map((option) => (
							<SelectItem key={option.id} value={option.value} className="text-xs">
								{option.label}
							</SelectItem>
						))}
						<SelectItem value="__reset__" className="text-xs text-muted-foreground">
							Limpar
						</SelectItem>
					</SelectGroup>
				</SelectContent>
			</Select>
		</SpreadsheetCellWrapper>
	);
}
