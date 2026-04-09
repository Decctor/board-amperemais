import {
	BadgeDollarSign,
	CircleX,
	Clock,
	MessageCircle,
	MousePointerClick,
	RefreshCw,
	Rocket,
	Send,
	TrendingUp,
	UserPlus,
	UserRoundCheck,
	Users,
	Zap,
} from "lucide-react";

const ICON_MAP = {
	"message-circle": MessageCircle,
	"mouse-pointer-click": MousePointerClick,
	"trending-up": TrendingUp,
	"badge-dollar-sign": BadgeDollarSign,
	clock: Clock,
	users: Users,
	"user-round-check": UserRoundCheck,
	send: Send,
	"circle-x": CircleX,
	"user-plus": UserPlus,
	"refresh-cw": RefreshCw,
	zap: Zap,
	rocket: Rocket,
} as const;

export type StatIconKey = keyof typeof ICON_MAP;

type StaticStatCardProps = {
	title: string;
	value: string;
	icon: StatIconKey;
	/** Scale factor for font sizes relative to the base 1080px design */
	scale?: number;
};

export default function StaticStatCard({ title, value, icon, scale = 1 }: StaticStatCardProps) {
	const IconComponent = ICON_MAP[icon];
	const iconSize = Math.round(16 * scale);
	const titleSize = Math.round(11 * scale);
	const valueSize = Math.round(22 * scale);
	const padX = Math.round(12 * scale);
	const padY = Math.round(14 * scale);
	const gap = Math.round(4 * scale);
	const borderRadius = Math.round(12 * scale);
	const borderWidth = Math.round(1 * scale);

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
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
				}}
			>
				<span
					style={{
						fontSize: `${titleSize}px`,
						fontWeight: 500,
						letterSpacing: "-0.01em",
						textTransform: "uppercase",
						color: "#111827",
						lineHeight: 1.3,
					}}
				>
					{title}
				</span>
				{IconComponent && (
					<IconComponent
						style={{
							width: `${iconSize}px`,
							height: `${iconSize}px`,
							minWidth: `${iconSize}px`,
							minHeight: `${iconSize}px`,
							color: "#6B7280",
						}}
					/>
				)}
			</div>
			<span
				style={{
					fontSize: `${valueSize}px`,
					fontWeight: 700,
					color: "#24549C",
					lineHeight: 1.2,
				}}
			>
				{value}
			</span>
		</div>
	);
}
