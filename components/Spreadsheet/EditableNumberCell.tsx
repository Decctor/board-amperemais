"use client";

import { Input } from "@/components/ui/input";
import {
	consumeProgrammaticSpreadsheetFocus,
	handleSpreadsheetNavigationKeyDown,
	type SpreadsheetGridBounds,
} from "@/lib/spreadsheet-navigation";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useRef, useState, type FocusEvent, type KeyboardEvent } from "react";
import { formatNumericInputValue } from "@/lib/formatting";
import SpreadsheetCellWrapper from "./SpreadsheetCellWrapper";

const NUMERIC_PATTERN = /[^0-9,.-]/g;

type EditableNumberCellProps = {
	value: number | null | undefined;
	ariaLabel: string;
	format?: (value: number) => string;
	min: number;
	onCommit: (value: number) => void;
	gridRow?: number;
	gridCol?: number;
	gridBounds?: SpreadsheetGridBounds;
	emptyDisplay?: string;
	align?: "left" | "center";
};

export default function EditableNumberCell({
	value,
	ariaLabel,
	format,
	min,
	onCommit,
	gridRow,
	gridCol,
	gridBounds,
	emptyDisplay,
	align = "center",
}: EditableNumberCellProps) {
	const hasGridNavigation = gridRow !== undefined && gridCol !== undefined && gridBounds !== undefined;
	const inputRef = useRef<HTMLInputElement>(null);
	const skipNextBlurCommitRef = useRef(false);
	const normalizedValue = Number(value) || 0;
	const [isEditing, setIsEditing] = useState(false);
	const [inputValue, setInputValue] = useState(formatNumericInputValue(normalizedValue));
	const [isInvalid, setIsInvalid] = useState(false);

	useEffect(() => {
		if (!isEditing) setInputValue(formatNumericInputValue(normalizedValue));
	}, [isEditing, normalizedValue]);

	useEffect(() => {
		if (isEditing) inputRef.current?.select();
	}, [isEditing]);

	const displayValue = useMemo(() => {
		if (format) return format(normalizedValue);
		if (normalizedValue === 0 && emptyDisplay !== undefined) return emptyDisplay;
		return formatNumericInputValue(normalizedValue);
	}, [emptyDisplay, format, normalizedValue]);

	function parseValue(rawValue: string) {
		const normalizedRawValue = rawValue.replace(",", ".");
		const numericValue = Number.parseFloat(normalizedRawValue);
		if (Number.isNaN(numericValue)) return null;
		return numericValue;
	}

	function commitValue(options?: { skipNextBlurCommit?: boolean }) {
		const numericValue = parseValue(inputValue);
		if (numericValue === null || numericValue < min) {
			setIsInvalid(true);
			inputRef.current?.focus();
			return false;
		}

		setIsInvalid(false);
		onCommit(numericValue);
		setIsEditing(false);
		if (options?.skipNextBlurCommit) skipNextBlurCommitRef.current = true;
		return true;
	}

	function cancelEdit() {
		setIsInvalid(false);
		setInputValue(formatNumericInputValue(normalizedValue));
		setIsEditing(false);
	}

	function handleGridNavigation(event: KeyboardEvent<HTMLElement>) {
		if (!hasGridNavigation) return;

		const handled = handleSpreadsheetNavigationKeyDown(event, {
			coords: { row: gridRow, col: gridCol },
			bounds: gridBounds,
			isEditing,
			onCommit: commitValue,
			onCancel: cancelEdit,
		});

		if (handled) consumeProgrammaticSpreadsheetFocus();
	}

	function handleDisplayButtonFocus(event: FocusEvent<HTMLButtonElement>) {
		if (!hasGridNavigation || !consumeProgrammaticSpreadsheetFocus()) return;
		if (event.target === document.activeElement) setIsEditing(true);
	}

	const alignClass = align === "left" ? "text-left" : "text-center";

	const editingInput = (
		<Input
			ref={inputRef}
			value={inputValue}
			aria-label={ariaLabel}
			type="text"
			inputMode="decimal"
			pattern="[0-9]*[,.]?[0-9]*"
			onChange={(event) => {
				setInputValue(event.target.value.replace(NUMERIC_PATTERN, ""));
				setIsInvalid(false);
			}}
			onBlur={() => {
				if (skipNextBlurCommitRef.current) {
					skipNextBlurCommitRef.current = false;
					return;
				}

				commitValue();
			}}
			onKeyDown={(event) => {
				if (
					hasGridNavigation &&
					handleSpreadsheetNavigationKeyDown(event, {
						coords: { row: gridRow, col: gridCol },
						bounds: gridBounds,
						isEditing: true,
						onCommit: () => commitValue({ skipNextBlurCommit: true }),
						onCancel: cancelEdit,
					})
				) {
					return;
				}

				if (event.key === "Escape") {
					event.preventDefault();
					cancelEdit();
				}
			}}
			className={cn(
				"h-8 rounded-md border-border px-2 text-xs shadow-none focus-visible:ring-2 focus-visible:ring-ring/40",
				alignClass,
				isInvalid && "border-destructive focus-visible:ring-destructive/30",
			)}
		/>
	);

	const displayButton = (
		<button
			type="button"
			aria-label={ariaLabel}
			onClick={() => setIsEditing(true)}
			onFocus={handleDisplayButtonFocus}
			onKeyDown={(event) => {
				if (event.key === "Enter" || event.key === " ") {
					event.preventDefault();
					setIsEditing(true);
					return;
				}

				handleGridNavigation(event);
			}}
			className={cn(
				"h-8 w-full rounded-md px-2 font-mono text-xs tabular-nums text-foreground/80 transition-colors hover:bg-muted/60 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/40",
				alignClass,
			)}
		>
			{displayValue}
		</button>
	);

	const cellContent = isEditing ? editingInput : displayButton;

	if (!hasGridNavigation) return cellContent;

	return (
		<SpreadsheetCellWrapper gridRow={gridRow} gridCol={gridCol}>
			{cellContent}
		</SpreadsheetCellWrapper>
	);
}
