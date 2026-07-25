export const SPREADSHEET_TABLE_ATTR = "data-spreadsheet-table";
export const SPREADSHEET_CELL_ATTR = "data-spreadsheet-cell";
export const SPREADSHEET_ROW_ATTR = "data-spreadsheet-row";
export const SPREADSHEET_COL_ATTR = "data-spreadsheet-col";

export type SpreadsheetNavDirection = "right" | "left" | "down" | "up";

export type SpreadsheetGridBounds = {
	rowCount: number;
	colCount: number;
};

export type SpreadsheetCellCoords = {
	row: number;
	col: number;
};

let programmaticFocusFlag = false;

export function markProgrammaticSpreadsheetFocus() {
	programmaticFocusFlag = true;
}

export function consumeProgrammaticSpreadsheetFocus() {
	const wasProgrammatic = programmaticFocusFlag;
	programmaticFocusFlag = false;
	return wasProgrammatic;
}

export function getSpreadsheetTableRoot(element: HTMLElement | null): HTMLElement | null {
	return element?.closest(`[${SPREADSHEET_TABLE_ATTR}="true"]`) ?? null;
}

export function getNextSpreadsheetCoords(
	coords: SpreadsheetCellCoords,
	direction: SpreadsheetNavDirection,
	bounds: SpreadsheetGridBounds,
): SpreadsheetCellCoords | null {
	const { row, col } = coords;
	const lastRow = bounds.rowCount - 1;
	const lastCol = bounds.colCount - 1;

	if (direction === "right") {
		if (col < lastCol) return { row, col: col + 1 };
		if (row < lastRow) return { row: row + 1, col: 0 };
		return null;
	}

	if (direction === "left") {
		if (col > 0) return { row, col: col - 1 };
		if (row > 0) return { row: row - 1, col: lastCol };
		return null;
	}

	if (direction === "down") {
		if (row < lastRow) return { row: row + 1, col };
		return null;
	}

	if (row > 0) return { row: row - 1, col };
	return null;
}

export function directionFromKeyboardKey(key: string, shiftKey: boolean): SpreadsheetNavDirection | null {
	if (key === "Tab") return shiftKey ? "left" : "right";
	if (key === "ArrowRight") return "right";
	if (key === "ArrowLeft") return "left";
	if (key === "ArrowDown") return "down";
	if (key === "ArrowUp") return "up";
	if (key === "Enter") return "down";
	return null;
}

export function isSpreadsheetNavigationKey(key: string, shiftKey: boolean) {
	return directionFromKeyboardKey(key, shiftKey) !== null;
}

function getSpreadsheetCellElement(container: HTMLElement, coords: SpreadsheetCellCoords) {
	return container.querySelector<HTMLElement>(
		`[${SPREADSHEET_CELL_ATTR}="true"][${SPREADSHEET_ROW_ATTR}="${coords.row}"][${SPREADSHEET_COL_ATTR}="${coords.col}"]`,
	);
}

function getSpreadsheetCellFocusTarget(cell: HTMLElement) {
	return cell.querySelector<HTMLElement>(
		'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
	);
}

export function focusSpreadsheetCell(container: HTMLElement, coords: SpreadsheetCellCoords) {
	const cell = getSpreadsheetCellElement(container, coords);
	if (!cell) return false;

	const focusTarget = getSpreadsheetCellFocusTarget(cell);
	if (!focusTarget) return false;

	markProgrammaticSpreadsheetFocus();
	focusTarget.focus();
	return true;
}

export function navigateSpreadsheetCell(options: {
	container: HTMLElement;
	coords: SpreadsheetCellCoords;
	direction: SpreadsheetNavDirection;
	bounds: SpreadsheetGridBounds;
}) {
	const nextCoords = getNextSpreadsheetCoords(options.coords, options.direction, options.bounds);
	if (!nextCoords) return false;
	return focusSpreadsheetCell(options.container, nextCoords);
}

export function handleSpreadsheetNavigationKeyDown(
	event: {
		key: string;
		shiftKey: boolean;
		preventDefault: () => void;
		currentTarget: EventTarget | null;
	},
	options: {
		coords: SpreadsheetCellCoords;
		bounds: SpreadsheetGridBounds;
		isEditing?: boolean;
		onCommit?: () => boolean | void;
		onCancel?: () => void;
	},
): boolean {
	if (event.key === "Escape") {
		if (!options.isEditing) return false;
		event.preventDefault();
		options.onCancel?.();
		return true;
	}

	const direction = directionFromKeyboardKey(event.key, event.shiftKey);
	if (!direction) return false;

	const container = getSpreadsheetTableRoot(event.currentTarget as HTMLElement | null);
	if (!container) return false;

	if (options.isEditing && (event.key === "ArrowLeft" || event.key === "ArrowRight" || event.key === "ArrowUp" || event.key === "ArrowDown")) {
		return false;
	}

	const nextCoords = getNextSpreadsheetCoords(options.coords, direction, options.bounds);
	if (!nextCoords) {
		if (event.key === "Tab") return false;
		if (options.isEditing && event.key === "Enter") {
			event.preventDefault();
			return options.onCommit?.() ?? true;
		}
		return false;
	}

	// Um destino declarado nos bounds mas sem celula registrada (coluna que ainda nao virou celula do grid)
	// nao pode engolir a tecla: sem isso o Tab morre na celula atual. Deixamos o navegador seguir e o
	// commit acontece no blur da propria celula.
	const nextCell = getSpreadsheetCellElement(container, nextCoords);
	const nextFocusTarget = nextCell ? getSpreadsheetCellFocusTarget(nextCell) : null;
	if (!nextFocusTarget) {
		if (event.key === "Tab") return false;
		if (options.isEditing && event.key === "Enter") {
			event.preventDefault();
			return options.onCommit?.() ?? true;
		}
		return false;
	}

	event.preventDefault();

	if (options.isEditing && (event.key === "Tab" || event.key === "Enter")) {
		const committed = options.onCommit?.() ?? true;
		if (!committed) return true;
	}

	return focusSpreadsheetCell(container, nextCoords);
}
