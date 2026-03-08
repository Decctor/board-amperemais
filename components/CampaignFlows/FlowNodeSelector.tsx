"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
	ACTION_SUBTYPES,
	CONDITION_SUBTYPES,
	DELAY_SUBTYPES,
	FILTER_SUBTYPES,
	NODE_TYPE_COLORS,
	TRIGGER_SUBTYPES,
	type TFlowNodeSubtype,
} from "./flow-node-types";
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
	X,
	Zap,
	GitBranch,
	Clock3,
	SlidersVertical,
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

type NodeTypeSection = {
	tipo: string;
	label: string;
	icon: ReactNode;
	subtypes: TFlowNodeSubtype[];
};

const NODE_SECTIONS: NodeTypeSection[] = [
	{ tipo: "GATILHO", label: "Gatilhos", icon: <Zap className="w-4 h-4" />, subtypes: TRIGGER_SUBTYPES },
	{ tipo: "ACAO", label: "Ações", icon: <MessageCircle className="w-4 h-4" />, subtypes: ACTION_SUBTYPES },
	{ tipo: "DELAY", label: "Delays", icon: <Clock3 className="w-4 h-4" />, subtypes: DELAY_SUBTYPES },
	{ tipo: "CONDICAO", label: "Condições", icon: <GitBranch className="w-4 h-4" />, subtypes: CONDITION_SUBTYPES },
	{ tipo: "FILTRO", label: "Filtros", icon: <SlidersVertical className="w-4 h-4" />, subtypes: FILTER_SUBTYPES },
];

type FlowNodeSelectorProps = {
	onSelectNode: (tipo: string, subtipo: string) => void;
	onClose: () => void;
	hasTrigger: boolean;
};

export function FlowNodeSelector({ onSelectNode, onClose, hasTrigger }: FlowNodeSelectorProps) {
	return (
		<div className="w-[320px] bg-card border rounded-xl shadow-lg flex flex-col max-h-[80vh] overflow-hidden">
			<div className="flex items-center justify-between px-4 py-3 border-b">
				<h3 className="text-sm font-bold tracking-tight">ADICIONAR NO</h3>
				<Button variant="ghost" size="icon" className="w-7 h-7" onClick={onClose}>
					<X className="w-4 h-4" />
				</Button>
			</div>

			<div className="overflow-y-auto flex-1 p-3 flex flex-col gap-4">
				{NODE_SECTIONS.map((section) => {
					const colors = NODE_TYPE_COLORS[section.tipo];
					const isDisabled = section.tipo === "GATILHO" && hasTrigger;

					return (
						<div key={section.tipo} className="flex flex-col gap-1.5">
							<div className="flex items-center gap-2 px-1">
								<span className={cn("flex items-center gap-1.5 text-[0.65rem] font-bold tracking-widest uppercase", colors?.text)}>
									{section.icon}
									{section.label}
								</span>
								{isDisabled && (
									<span className="text-[0.6rem] text-muted-foreground italic">(max 1)</span>
								)}
							</div>
							<div className="flex flex-col gap-1">
								{section.subtypes.map((subtype) => (
									<button
										type="button"
										key={subtype.subtipo}
										disabled={isDisabled}
										onClick={() => onSelectNode(section.tipo, subtype.subtipo)}
										className={cn(
											"flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors",
											"hover:bg-accent/50 cursor-pointer",
											isDisabled && "opacity-40 cursor-not-allowed hover:bg-transparent",
										)}
									>
										<div className={cn("flex items-center justify-center w-7 h-7 rounded-md shrink-0", colors?.badge)}>
											{ICON_MAP[subtype.icon]}
										</div>
										<div className="flex flex-col gap-0 min-w-0">
											<p className="text-xs font-medium truncate">{subtype.rotulo}</p>
											<p className="text-[0.6rem] text-muted-foreground truncate">{subtype.descricao}</p>
										</div>
									</button>
								))}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
