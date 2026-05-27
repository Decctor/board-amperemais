import { motion } from "framer-motion";
import type { ReactNode } from "react";

type ProductFieldRowProps = {
	icon: ReactNode;
	label: string;
	value: ReactNode;
};

export default function ProductFieldRow({ icon, label, value }: ProductFieldRowProps) {
	return (
		<div className="flex w-full items-center gap-1.5">
			{icon}
			<h3 className="text-sm font-semibold tracking-tighter text-foreground/80 shrink-0">{label}</h3>
			<h3 className="text-sm font-semibold tracking-tight">{value}</h3>
		</div>
	);
}
