import type { CSSProperties, ReactNode } from "react";

type ReportCardProps = {
	children: ReactNode;
	style?: CSSProperties;
};

export function ReportCard({ children, style }: ReportCardProps) {
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				backgroundColor: "rgba(255,255,255,0.94)",
				border: "1px solid rgba(15,23,42,0.08)",
				borderRadius: 28,
				boxShadow: "0 18px 50px rgba(15,23,42,0.08)",
				padding: 28,
				...style,
			}}
		>
			{children}
		</div>
	);
}
