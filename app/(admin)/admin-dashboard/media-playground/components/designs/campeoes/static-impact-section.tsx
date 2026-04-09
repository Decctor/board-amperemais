type ImpactRowData = {
	label: string;
	value: string;
	positive: boolean;
};

type StaticImpactSectionProps = {
	title: string;
	rows: ImpactRowData[];
	scale?: number;
};

export default function StaticImpactSection({ title, rows, scale = 1 }: StaticImpactSectionProps) {
	const titleSize = Math.round(11 * scale);
	const labelSize = Math.round(12 * scale);
	const padX = Math.round(12 * scale);
	const padY = Math.round(14 * scale);
	const gap = Math.round(8 * scale);
	const rowGap = Math.round(8 * scale);
	const borderRadius = Math.round(12 * scale);
	const borderWidth = Math.round(1 * scale);
	const iconSize = Math.round(16 * scale);

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: `${gap}px`,
				borderRadius: `${borderRadius}px`,
				border: `${borderWidth}px solid rgba(36, 84, 156, 0.2)`,
				padding: `${padY}px ${padX}px`,
				backgroundColor: "#ffffff",
				boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
				width: "100%",
				boxSizing: "border-box",
			}}
		>
			{/* Header */}
			<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
				<span
					style={{
						fontSize: `${titleSize}px`,
						fontWeight: 500,
						letterSpacing: "-0.01em",
						textTransform: "uppercase",
						color: "#111827",
					}}
				>
					{title}
				</span>
				<svg
					width={iconSize}
					height={iconSize}
					viewBox="0 0 24 24"
					fill="none"
					stroke="#6B7280"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<path d="M6 12h12M6 8h12M6 16h12" />
				</svg>
			</div>

			{/* Rows */}
			<div style={{ display: "flex", flexDirection: "column", gap: `${rowGap}px` }}>
				{rows.map((row) => (
					<div key={row.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
						<span style={{ fontSize: `${labelSize}px`, fontWeight: 500, color: "#111827" }}>{row.label}</span>
						<span
							style={{
								fontSize: `${labelSize}px`,
								fontWeight: 700,
								color: row.positive ? "#16A34A" : "#DC2626",
							}}
						>
							{row.value}
						</span>
					</div>
				))}
			</div>
		</div>
	);
}
