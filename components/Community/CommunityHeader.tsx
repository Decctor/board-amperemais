"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Fragment } from "react";
export type TCommunityBreadcrumbItem = {
	label: string;
	href?: string;
};

type CommunityHeaderProps = {
	breadcrumbs?: TCommunityBreadcrumbItem[];
};

export function CommunityHeader({ breadcrumbs }: CommunityHeaderProps) {
	return (
		<header className="w-full">
			{breadcrumbs && breadcrumbs.length > 0 ? (
				<nav className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground" aria-label="Breadcrumb">
						{breadcrumbs.map((item, index) => {
							const isLast = index === breadcrumbs.length - 1;
							return (
								<Fragment key={`breadcrumb-${index.toString()}`}>
									{index > 0 && <ChevronRight className="w-3 h-3 min-w-3 min-h-3 shrink-0" />}
									{isLast || !item.href ? (
										<span className={`truncate max-w-[200px] ${isLast ? "text-foreground font-medium" : ""}`}>{item.label}</span>
									) : (
										<Link href={item.href} className="hover:text-foreground transition-colors truncate max-w-[200px]">
											{item.label}
										</Link>
									)}
								</Fragment>
							);
						})}
				</nav>
			) : null}
		</header>
	);
}
