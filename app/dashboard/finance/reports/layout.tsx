import { ReportsNav } from "../_components/reports-nav";

export default function FinanceReportsLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex w-full flex-col gap-3">
			<ReportsNav />
			{children}
		</div>
	);
}
