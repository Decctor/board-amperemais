"use client";

import type React from "react";
import { Button } from "@/components/ui/button";
import { formatToMoney } from "@/lib/formatting";
import { CheckCircle2 } from "lucide-react";

type StatItem = {
	label: string;
	value: number;
	variant: "green" | "brand";
	formatValue?: (value: number) => string;
};

type ActionButton = {
	label: string;
	onClick: () => void;
};

type SuccessCelebrationProps = {
	title: string;
	subtitle: string;
	stats: StatItem[];
	primaryAction: ActionButton;
	secondaryAction: ActionButton;
	children?: React.ReactNode;
};

export function SuccessCelebration({ title, subtitle, stats, primaryAction, secondaryAction, children }: SuccessCelebrationProps) {
	return (
		<div className="flex flex-col items-center text-center space-y-8 short:space-y-2 animate-in fade-in duration-300">
			<div className="relative">
				<div className="relative bg-green-600 p-6 short:p-3 rounded-full text-white shadow-sm">
					<CheckCircle2 className="w-20 h-20 short:w-8 short:h-8" />
				</div>
			</div>

			<div className="space-y-2 short:space-y-0.5">
				<h2 className="text-3xl short:text-lg font-extrabold tracking-tight text-green-700">{title}</h2>
				<p className="text-muted-foreground font-medium text-lg short:text-sm">{subtitle}</p>
			</div>

			{children}

			<div className="w-full flex flex-col md:flex-row gap-2 flex-wrap justify-center">
				{stats.map((stat) => (
					<div
						key={stat.label}
						className={
							stat.variant === "green"
								? "bg-green-50 border border-green-200 rounded-2xl short:rounded-xl p-5 short:p-2"
								: "bg-brand/5 border border-brand/20 rounded-2xl short:rounded-xl p-5 short:p-2"
						}
					>
						<p
							className={
								stat.variant === "green"
									? "text-[0.7rem] short:text-[0.6rem] font-black text-green-600 uppercase tracking-widest mb-1 short:mb-0"
									: "text-[0.7rem] short:text-[0.6rem] font-black text-brand uppercase tracking-widest mb-1 short:mb-0"
							}
						>
							{stat.label}
						</p>
						<p className={stat.variant === "green" ? "text-4xl short:text-xl font-black text-green-700" : "text-4xl short:text-xl font-black text-brand"}>
							{stat.formatValue ? stat.formatValue(stat.value) : formatToMoney(stat.value)}
						</p>
					</div>
				))}
			</div>

			<div className="flex flex-col sm:flex-row gap-4 short:gap-2 w-full max-w-xl">
				<Button onClick={primaryAction.onClick} size="lg" className="flex-1 rounded-2xl short:rounded-lg h-12 short:h-11 text-base font-bold shadow-sm">
					{primaryAction.label}
				</Button>
				<Button
					onClick={secondaryAction.onClick}
					variant="outline"
					size="lg"
					className="flex-1 rounded-2xl short:rounded-lg h-11 text-sm font-bold border hover:bg-muted"
				>
					{secondaryAction.label}
				</Button>
			</div>
		</div>
	);
}
