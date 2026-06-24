import {
	SPREADSHEET_CELL_ATTR,
	SPREADSHEET_COL_ATTR,
	SPREADSHEET_ROW_ATTR,
} from "@/lib/spreadsheet-navigation";

export default function SpreadsheetCellWrapper({
	gridRow,
	gridCol,
	className,
	children,
}: {
	gridRow: number;
	gridCol: number;
	className?: string;
	children: React.ReactNode;
}) {
	return (
		<div
			{...{
				[SPREADSHEET_CELL_ATTR]: "true",
				[SPREADSHEET_ROW_ATTR]: String(gridRow),
				[SPREADSHEET_COL_ATTR]: String(gridCol),
			}}
			className={className}
		>
			{children}
		</div>
	);
}
