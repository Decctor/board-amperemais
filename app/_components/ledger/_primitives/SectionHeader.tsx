import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { Reveal } from "./Reveal";

type SectionHeaderProps = {
	eyebrow: string;
	title: ReactNode;
	description?: ReactNode;
	align?: "left" | "center";
	className?: string;
};

/** Cabeçalho padrão das seções da landing: rótulo, título e descrição opcional. */
export function SectionHeader({ eyebrow, title, description, align = "left", className }: SectionHeaderProps) {
	const centered = align === "center";
	return (
		<Reveal className={cn("mb-12 lg:mb-16", centered && "text-center", className)}>
			<div className={cn("mb-5 flex items-center gap-3", centered && "justify-center")}>
				<span className="ledger-fade inline-block h-1.5 w-1.5 rounded-full bg-[#ffb900]" aria-hidden />
				<span className="ledger-fade text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#24549c]" style={{ "--i": 1 } as React.CSSProperties} data-stagger>
					{eyebrow}
				</span>
				{centered ? null : <span className="ledger-fade h-px flex-1 bg-[#24549c]/15" style={{ "--i": 2 } as React.CSSProperties} data-stagger />}
			</div>
			<h2
				className={cn(
					"max-w-[20ch] font-extrabold leading-[1.05] tracking-[-0.02em] text-[#171717] text-[32px] sm:text-[42px] lg:text-[54px]",
					centered && "mx-auto",
				)}
			>
				{title}
			</h2>
			{description ? (
				<p
					className={cn("ledger-fade mt-5 max-w-[54ch] text-[15px] leading-[1.65] text-[#171717]/65 lg:text-[17px]", centered && "mx-auto")}
					style={{ "--i": 6 } as React.CSSProperties}
					data-stagger
				>
					{description}
				</p>
			) : null}
		</Reveal>
	);
}
