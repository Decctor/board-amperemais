"use client";

import { CalendarClock, FileSpreadsheet, Scale } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { appRoutes } from "@/lib/navigation/routes";
import { cn } from "@/lib/utils";

const REPORT_LINKS = [
	{ href: appRoutes.finance.reports.incomeStatement(), label: "DRE", icon: <FileSpreadsheet className="h-4 w-4 min-h-4 min-w-4" /> },
	{ href: appRoutes.finance.reports.cashFlow(), label: "Fluxo de Caixa", icon: <CalendarClock className="h-4 w-4 min-h-4 min-w-4" /> },
	{ href: appRoutes.finance.reports.receivablesPayables(), label: "Recebíveis & Pagáveis", icon: <Scale className="h-4 w-4 min-h-4 min-w-4" /> },
];

/** Navegação local entre os relatórios financeiros — links reais, cada relatório é uma rota. */
export function ReportsNav() {
	const pathname = usePathname();
	return (
		<nav aria-label="Relatórios financeiros" className="flex w-fit items-center gap-1 rounded-lg bg-muted/70 p-1">
			{REPORT_LINKS.map((link) => {
				const isActive = pathname === link.href;
				return (
					<Link
						key={link.href}
						href={link.href}
						aria-current={isActive ? "page" : undefined}
						className={cn("flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium duration-300 ease-in-out", {
							"bg-background shadow-sm": isActive,
							"text-muted-foreground hover:text-foreground": !isActive,
						})}
					>
						{link.icon}
						{link.label}
					</Link>
				);
			})}
		</nav>
	);
}
