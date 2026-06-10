type SectionEyebrowProps = {
	index: string;
	label: string;
	tone?: "light" | "dark";
};

// Eyebrow numerado (igual ao ritmo da landing): selo + rótulo + filete.
export function SectionEyebrow({ index, label, tone = "light" }: SectionEyebrowProps) {
	const isDark = tone === "dark";
	return (
		<div className="mb-6 flex items-center gap-3">
			<span
				className={`ledger-fade inline-flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-extrabold ledger-tabular ${
					isDark ? "bg-[#ffb900] text-[#171717]" : "bg-[#24549c] text-white"
				}`}
			>
				{index}
			</span>
			<span
				className={`ledger-fade text-[11px] font-extrabold uppercase tracking-[0.16em] ${isDark ? "text-[#ffb900]" : "text-[#24549c]"}`}
				style={{ "--i": 1 } as React.CSSProperties}
				data-stagger
			>
				{label}
			</span>
			<span
				className={`ledger-fade h-px flex-1 ${isDark ? "bg-white/20" : "bg-[#24549c]/15"}`}
				style={{ "--i": 2 } as React.CSSProperties}
				data-stagger
			/>
		</div>
	);
}
