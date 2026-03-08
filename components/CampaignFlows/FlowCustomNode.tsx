"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { NODE_TYPE_COLORS, NODE_TYPE_LABELS, getNodeSubtype } from "./flow-node-types";
import {
	BadgePercent,
	Bell,
	Cake,
	Calendar,
	Clock,
	Coins,
	Filter,
	Grid3X3,
	Hash,
	MessageCircle,
	MessageSquare,
	RefreshCw,
	ShoppingBag,
	ShoppingCart,
	SlidersHorizontal,
	Timer,
	TrendingUp,
	UserCheck,
	UserPlus,
	Users,
	Wallet,
} from "lucide-react";
import type { ReactNode } from "react";

const ICON_MAP: Record<string, ReactNode> = {
	ShoppingCart: <ShoppingCart className="w-4 h-4" />,
	ShoppingBag: <ShoppingBag className="w-4 h-4" />,
	Cake: <Cake className="w-4 h-4" />,
	UserPlus: <UserPlus className="w-4 h-4" />,
	Users: <Users className="w-4 h-4" />,
	Coins: <Coins className="w-4 h-4" />,
	Clock: <Clock className="w-4 h-4" />,
	TrendingUp: <TrendingUp className="w-4 h-4" />,
	Hash: <Hash className="w-4 h-4" />,
	RefreshCw: <RefreshCw className="w-4 h-4" />,
	MessageCircle: <MessageCircle className="w-4 h-4" />,
	BadgePercent: <BadgePercent className="w-4 h-4" />,
	Bell: <Bell className="w-4 h-4" />,
	Timer: <Timer className="w-4 h-4" />,
	Calendar: <Calendar className="w-4 h-4" />,
	UserCheck: <UserCheck className="w-4 h-4" />,
	MessageSquare: <MessageSquare className="w-4 h-4" />,
	Grid3X3: <Grid3X3 className="w-4 h-4" />,
	Wallet: <Wallet className="w-4 h-4" />,
	Filter: <Filter className="w-4 h-4" />,
	SlidersHorizontal: <SlidersHorizontal className="w-4 h-4" />,
};

export type TFlowCustomNodeData = {
	tipo: string;
	subtipo: string;
	rotulo: string | null;
	configuracao: Record<string, unknown>;
	dbNodeIndex: number;
};

export function FlowCustomNode({ data, selected }: NodeProps & { data: TFlowCustomNodeData }) {
	const tipo = data.tipo;
	const subtypeInfo = getNodeSubtype(tipo, data.subtipo);
	const colors = NODE_TYPE_COLORS[tipo] ?? NODE_TYPE_COLORS.ACAO;
	const typeLabel = NODE_TYPE_LABELS[tipo] ?? tipo;
	const icon = subtypeInfo ? ICON_MAP[subtypeInfo.icon] : null;
	const isCondition = tipo === "CONDICAO";

	return (
		<div
			className={cn(
				"relative rounded-xl border-2 shadow-sm transition-all min-w-[260px] max-w-[320px]",
				colors.bg,
				colors.border,
				selected && "ring-2 ring-primary ring-offset-2",
			)}
		>
			{tipo !== "GATILHO" && (
				<Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-muted-foreground/40 !border-2 !border-background" />
			)}

			<div className="px-4 py-3 flex flex-col gap-1.5">
				{/* Header with type badge and category */}
				<div className="flex items-center justify-between gap-2">
					<span className={cn("text-[0.6rem] font-bold tracking-widest uppercase", colors.text)}>
						{typeLabel}
					</span>
					{subtypeInfo && (
						<span className={cn("text-[0.6rem] font-semibold tracking-wide uppercase text-muted-foreground")}>
							{subtypeInfo.categoria}
						</span>
					)}
				</div>

				{/* Node content */}
				<div className="flex items-center gap-2.5">
					{icon && (
						<div className={cn("flex items-center justify-center w-8 h-8 rounded-lg shrink-0", colors.badge)}>
							{icon}
						</div>
					)}
					<div className="flex flex-col gap-0 min-w-0">
						<p className="text-sm font-semibold tracking-tight truncate">
							{data.rotulo || subtypeInfo?.rotulo || data.subtipo}
						</p>
						{subtypeInfo && (
							<p className="text-[0.65rem] text-muted-foreground leading-tight truncate">
								{subtypeInfo.descricao}
							</p>
						)}
					</div>
				</div>
			</div>

			{/* Output handles */}
			{isCondition ? (
				<>
					<Handle
						type="source"
						position={Position.Bottom}
						id="SIM"
						className="!w-3 !h-3 !bg-green-500 !border-2 !border-background"
						style={{ left: "30%" }}
					/>
					<Handle
						type="source"
						position={Position.Bottom}
						id="NAO"
						className="!w-3 !h-3 !bg-red-500 !border-2 !border-background"
						style={{ left: "70%" }}
					/>
					<div className="absolute -bottom-5 flex w-full justify-between px-[22%] pointer-events-none">
						<span className="text-[0.55rem] font-bold text-green-600 dark:text-green-400">SIM</span>
						<span className="text-[0.55rem] font-bold text-red-600 dark:text-red-400">NAO</span>
					</div>
				</>
			) : (
				<Handle
					type="source"
					position={Position.Bottom}
					className="!w-3 !h-3 !bg-muted-foreground/40 !border-2 !border-background"
				/>
			)}
		</div>
	);
}
