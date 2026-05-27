import { cn } from "@/lib/utils";
import type { CSSProperties, ReactNode } from "react";

type StampProps = {
	children: ReactNode;
	variant?: "blue" | "amber" | "soft-blue" | "soft-amber" | "success" | "danger" | "outline";
	size?: "xs" | "sm" | "md" | "lg";
	rotate?: number;
	className?: string;
	style?: CSSProperties;
};

const sizeClasses: Record<NonNullable<StampProps["size"]>, string> = {
	xs: "px-2 py-[3px] text-[9px] gap-1",
	sm: "px-2.5 py-1 text-[10px] gap-1",
	md: "px-3 py-1.5 text-[11px] gap-1.5",
	lg: "px-4 py-2 text-[12px] gap-2",
};

const variantClasses: Record<NonNullable<StampProps["variant"]>, string> = {
	blue: "bg-[#24549c] text-white",
	amber: "bg-[#ffb900] text-[#171717]",
	"soft-blue": "bg-[#24549c]/10 text-[#24549c] border border-[#24549c]/20",
	"soft-amber": "bg-[#ffb900]/18 text-[#171717] border border-[#ffb900]/40",
	success: "bg-[#16a34a]/12 text-[#16a34a] border border-[#16a34a]/25",
	danger: "bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/25",
	outline: "bg-transparent text-[#171717]/65 border border-[#171717]/15",
};

export function Stamp({ children, variant = "soft-blue", size = "md", rotate = 0, className, style }: StampProps) {
	return (
		<span className="ledger-stamp-wrap inline-block" style={{ transform: rotate ? `rotate(${rotate}deg)` : undefined, ...style }}>
			<span className={cn("ledger-stamp ledger-stamp-inner", sizeClasses[size], variantClasses[variant], className)}>{children}</span>
		</span>
	);
}
