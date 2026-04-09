type DistributionItem = {
	type: string;
	count: number;
	percentage: number;
	revenue: string;
	color: string;
};

type StaticDistributionBarProps = {
	items: DistributionItem[];
	scale?: number;
};

export default function StaticDistributionBar({ items, scale = 1 }: StaticDistributionBarProps) {
	const titleSize = Math.round(11 * scale);
	const labelSize = Math.round(12 * scale);
	const smallSize = Math.round(11 * scale);
	const padX = Math.round(12 * scale);
	const padY = Math.round(14 * scale);
	const gap = Math.round(8 * scale);
	const barHeight = Math.round(8 * scale);
	const dotSize = Math.round(10 * scale);
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
					CONVERSÕES POR TIPO
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
					<path d="M2.7 10.3a2.41 2.41 0 0 0 0 3.41l7.59 7.59a2.41 2.41 0 0 0 3.41 0l7.59-7.59a2.41 2.41 0 0 0 0-3.41l-7.59-7.59a2.41 2.41 0 0 0-3.41 0Z" />
				</svg>
			</div>

			{/* Distribution items */}
			<div style={{ display: "flex", flexDirection: "column", gap: `${Math.round(6 * scale)}px` }}>
				{items.map((item) => (
					<div key={item.type} style={{ display: "flex", flexDirection: "column", gap: `${Math.round(3 * scale)}px` }}>
						<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: `${Math.round(8 * scale)}px` }}>
							<div style={{ display: "flex", alignItems: "center", gap: `${Math.round(6 * scale)}px` }}>
								<div
									style={{
										width: `${dotSize}px`,
										height: `${dotSize}px`,
										borderRadius: "50%",
										backgroundColor: item.color,
										flexShrink: 0,
									}}
								/>
								<span style={{ fontSize: `${labelSize}px`, fontWeight: 500, color: "#111827" }}>{item.type}</span>
							</div>
							<div style={{ display: "flex", alignItems: "center", gap: `${Math.round(10 * scale)}px` }}>
								<span style={{ fontSize: `${smallSize}px`, color: "#6B7280" }}>{item.count} conv.</span>
								<span style={{ fontSize: `${smallSize}px`, fontWeight: 700, color: item.color }}>
									{item.percentage.toFixed(2).replace(".", ",")}%
								</span>
								<span style={{ fontSize: `${smallSize}px`, color: "#6B7280" }}>{item.revenue}</span>
							</div>
						</div>
						{/* Progress bar */}
						<div
							style={{
								width: "100%",
								backgroundColor: "#F3F4F6",
								borderRadius: `${barHeight}px`,
								height: `${barHeight}px`,
								overflow: "hidden",
							}}
						>
							<div
								style={{
									width: `${Math.min(item.percentage, 100)}%`,
									height: "100%",
									backgroundColor: item.color,
									borderRadius: `${barHeight}px`,
								}}
							/>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
