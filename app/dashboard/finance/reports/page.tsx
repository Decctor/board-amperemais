import { redirect } from "next/navigation";
import { appRoutes } from "@/lib/navigation/routes";

export default function FinanceReports() {
	redirect(appRoutes.finance.reports.incomeStatement());
}
