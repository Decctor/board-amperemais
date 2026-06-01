import type { ReactNode } from "react";

type DetailFieldProps = {
	label: string;
	value?: ReactNode;
	children?: ReactNode;
};

export default function DetailField({ label, value, children }: DetailFieldProps) {
	return (
		<div className="flex w-full min-w-0 flex-col gap-0.5 py-1.5">
			<span className="text-[0.65rem] font-bold tracking-wide text-muted-foreground uppercase">{label}</span>
			{children ?? <span className="text-sm font-medium break-words">{value}</span>}
		</div>
	);
}
