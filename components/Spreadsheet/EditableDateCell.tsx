"use client";

import { Input } from "@/components/ui/input";
import {
	consumeProgrammaticSpreadsheetFocus,
	handleSpreadsheetNavigationKeyDown,
	type SpreadsheetGridBounds,
} from "@/lib/spreadsheet-navigation";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState, type FocusEvent, type KeyboardEvent } from "react";
import SpreadsheetCellWrapper from "./SpreadsheetCellWrapper";

type EditableDateCellProps = {
	value: Date | string | null | undefined;
	ariaLabel: string;
	/** Recebe a data já normalizada para meio-dia local, evitando deslocamento de fuso. */
	onCommit: (value: Date | null) => void;
	gridRow?: number;
	gridCol?: number;
	gridBounds?: SpreadsheetGridBounds;
	emptyDisplay?: string;
	editable?: boolean;
	/** Impede limpar a data quando o campo é obrigatório. */
	allowEmpty?: boolean;
};

export default function EditableDateCell({
	value,
	ariaLabel,
	onCommit,
	gridRow,
	gridCol,
	gridBounds,
	emptyDisplay = "-",
	editable = true,
	allowEmpty = false,
}: EditableDateCellProps) {
	const hasGridNavigation = gridRow !== undefined && gridCol !== undefined && gridBounds !== undefined;
	const inputRef = useRef<HTMLInputElement>(null);
	const skipNextBlurCommitRef = useRef(false);
	const normalizedValue = formatDateAsInputValue(value);
	const [isEditing, setIsEditing] = useState(false);
	const [inputValue, setInputValue] = useState(normalizedValue);
	const [isInvalid, setIsInvalid] = useState(false);

	useEffect(() => {
		if (!isEditing) setInputValue(normalizedValue);
	}, [isEditing, normalizedValue]);

	useEffect(() => {
		if (isEditing) inputRef.current?.focus();
	}, [isEditing]);

	const displayValue = formatDateAsLabel(value) ?? emptyDisplay;

	function commitValue(options?: { skipNextBlurCommit?: boolean }) {
		if (!inputValue) {
			if (!allowEmpty) {
				setIsInvalid(true);
				inputRef.current?.focus();
				return false;
			}

			setIsInvalid(false);
			onCommit(null);
			setIsEditing(false);
			if (options?.skipNextBlurCommit) skipNextBlurCommitRef.current = true;
			return true;
		}

		// Meio-dia local: um date input entrega "YYYY-MM-DD", e interpretar como UTC deslocaria o dia.
		const parsed = new Date(`${inputValue}T12:00:00`);
		if (Number.isNaN(parsed.getTime())) {
			setIsInvalid(true);
			inputRef.current?.focus();
			return false;
		}

		setIsInvalid(false);
		onCommit(parsed);
		setIsEditing(false);
		if (options?.skipNextBlurCommit) skipNextBlurCommitRef.current = true;
		return true;
	}

	function cancelEdit() {
		setIsInvalid(false);
		setInputValue(normalizedValue);
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

	const editingInput = (
		<Input
			ref={inputRef}
			value={inputValue}
			aria-label={ariaLabel}
			type="date"
			onChange={(event) => {
				setInputValue(event.target.value);
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
				"h-8 rounded-md border-border px-2 text-center text-xs shadow-none focus-visible:ring-2 focus-visible:ring-ring/40",
				isInvalid && "border-destructive focus-visible:ring-destructive/30",
			)}
		/>
	);

	const displayButton = (
		<button
			type="button"
			aria-label={ariaLabel}
			disabled={!editable}
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
				"h-8 w-full truncate rounded-md px-2 text-center font-mono text-xs tabular-nums transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/40",
				editable ? "text-foreground/80 hover:bg-muted/60" : "cursor-not-allowed text-muted-foreground",
				!formatDateAsLabel(value) && "text-muted-foreground",
			)}
		>
			{displayValue}
		</button>
	);

	const cellContent = isEditing && editable ? editingInput : displayButton;

	if (!hasGridNavigation) return cellContent;

	return (
		<SpreadsheetCellWrapper gridRow={gridRow} gridCol={gridCol}>
			{cellContent}
		</SpreadsheetCellWrapper>
	);
}

function formatDateAsInputValue(value: Date | string | null | undefined) {
	if (!value) return "";
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return "";
	const year = date.getFullYear().toString().padStart(4, "0");
	const month = (date.getMonth() + 1).toString().padStart(2, "0");
	const day = date.getDate().toString().padStart(2, "0");
	return `${year}-${month}-${day}`;
}

function formatDateAsLabel(value: Date | string | null | undefined) {
	if (!value) return null;
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return null;
	return date.toLocaleDateString("pt-BR");
}
