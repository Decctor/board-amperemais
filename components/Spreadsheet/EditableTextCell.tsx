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

type EditableTextCellProps = {
	value: string;
	ariaLabel: string;
	onCommit: (value: string) => void;
	gridRow?: number;
	gridCol?: number;
	gridBounds?: SpreadsheetGridBounds;
	emptyDisplay?: string;
	align?: "left" | "center";
	validate?: (value: string) => boolean;
};

export default function EditableTextCell({
	value,
	ariaLabel,
	onCommit,
	gridRow,
	gridCol,
	gridBounds,
	emptyDisplay = "-",
	align = "left",
	validate,
}: EditableTextCellProps) {
	const hasGridNavigation = gridRow !== undefined && gridCol !== undefined && gridBounds !== undefined;
	const inputRef = useRef<HTMLInputElement>(null);
	const skipNextBlurCommitRef = useRef(false);
	const normalizedValue = value ?? "";
	const [isEditing, setIsEditing] = useState(false);
	const [inputValue, setInputValue] = useState(normalizedValue);
	const [isInvalid, setIsInvalid] = useState(false);

	useEffect(() => {
		if (!isEditing) setInputValue(normalizedValue);
	}, [isEditing, normalizedValue]);

	useEffect(() => {
		if (isEditing) inputRef.current?.select();
	}, [isEditing]);

	const displayValue = normalizedValue.trim() ? normalizedValue : emptyDisplay;
	const alignClass = align === "left" ? "text-left" : "text-center";

	function commitValue(options?: { skipNextBlurCommit?: boolean }) {
		const trimmed = inputValue.trim();
		if (validate && !validate(trimmed)) {
			setIsInvalid(true);
			inputRef.current?.focus();
			return false;
		}

		setIsInvalid(false);
		onCommit(trimmed);
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
			type="text"
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
				"h-8 w-full truncate rounded-md px-2 text-xs text-foreground/80 transition-colors hover:bg-muted/60 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/40",
				alignClass,
				!normalizedValue.trim() && "text-muted-foreground",
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
