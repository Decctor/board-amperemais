"use client";

import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

const DAYS_PT = ["DOMINGO", "SEGUNDA", "TERÇA", "QUARTA", "QUINTA", "SEXTA", "SÁBADO"];
const MONTHS_PT = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

function pad(n: number) {
	return n.toString().padStart(2, "0");
}

type LiveClockProps = {
	className?: string;
	showDate?: boolean;
	showSeconds?: boolean;
};

export function LiveClock({ className, showDate = true, showSeconds = true }: LiveClockProps) {
	const [now, setNow] = useState<Date | null>(null);

	useEffect(() => {
		setNow(new Date());
		const id = setInterval(() => setNow(new Date()), 1000);
		return () => clearInterval(id);
	}, []);

	if (!now) {
		return (
			<span className={cn("ledger-tabular font-mono", className)}>
				{showDate ? "—— · —— · ———— · " : ""}
				—:—{showSeconds ? ":—" : ""}
			</span>
		);
	}

	const day = DAYS_PT[now.getDay()];
	const date = pad(now.getDate());
	const month = MONTHS_PT[now.getMonth()];
	const year = now.getFullYear();
	const h = pad(now.getHours());
	const m = pad(now.getMinutes());
	const s = pad(now.getSeconds());

	return (
		<span className={cn("ledger-tabular", className)}>
			{showDate && (
				<>
					{day} · {date} {month} {year} ·{" "}
				</>
			)}
			{h}:{m}
			{showSeconds && `:${s}`}
		</span>
	);
}
