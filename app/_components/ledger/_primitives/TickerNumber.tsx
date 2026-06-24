import { cn } from "@/lib/utils";

type TickerNumberProps = {
	value: number;
	durationMs?: number;
	className?: string;
	prefix?: string;
	suffix?: string;
	decimals?: number;
	thousandsSep?: string;
	decimalSep?: string;
	startOnView?: boolean;
};

function formatNumber(n: number, decimals: number, thousands: string, decimal: string) {
	const fixed = n.toFixed(decimals);
	const [intPart, decPart] = fixed.split(".");
	const intWithSep = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousands);
	return decPart ? `${intWithSep}${decimal}${decPart}` : intWithSep;
}

export function TickerNumber({ value, className, prefix = "", suffix = "", decimals = 0, thousandsSep = ".", decimalSep = "," }: TickerNumberProps) {
	return (
		<span className={cn("ledger-tabular", className)}>
			{prefix}
			{formatNumber(value, decimals, thousandsSep, decimalSep)}
			{suffix}
		</span>
	);
}
