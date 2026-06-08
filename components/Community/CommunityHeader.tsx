"use client";

import { CommunityThemeToggle } from "@/components/Community/CommunityThemeToggle";
import { ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Fragment } from "react";
import RecompraCRMLogo from "@/utils/svgs/logos/RECOMPRA - COMPLETE - HORIZONTAL- COLORFUL.svg";

export type TCommunityBreadcrumbItem = {
	label: string;
	href?: string;
};

type CommunityHeaderProps = {
	breadcrumbs?: TCommunityBreadcrumbItem[];
	showThemeToggle?: boolean;
};

export function CommunityHeader({ breadcrumbs, showThemeToggle = true }: CommunityHeaderProps) {
	return (
		<header className="flex w-full items-center justify-between gap-3">
			<div className="flex min-w-0 items-center gap-3">
				<Link href="/community" className="flex shrink-0 items-center rounded-full bg-primary px-3 py-1.5 transition-opacity hover:opacity-90">
					<div className="relative h-8 w-20 min-h-8 min-w-20">
						<Image src={RecompraCRMLogo} alt="RecompraCRM" fill className="object-contain" />
					</div>
				</Link>

				{breadcrumbs && breadcrumbs.length > 0 ? (
					<nav className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground" aria-label="Breadcrumb">
						{breadcrumbs.map((item, index) => {
							const isLast = index === breadcrumbs.length - 1;
							return (
								<Fragment key={`breadcrumb-${index.toString()}`}>
									{index > 0 && <ChevronRight className="size-3 shrink-0" aria-hidden />}
									{isLast || !item.href ? (
										<span className={`max-w-[200px] truncate ${isLast ? "font-medium text-foreground" : ""}`}>{item.label}</span>
									) : (
										<Link href={item.href} className="max-w-[200px] truncate transition-colors hover:text-foreground">
											{item.label}
										</Link>
									)}
								</Fragment>
							);
						})}
					</nav>
				) : null}
			</div>

			{showThemeToggle ? <CommunityThemeToggle variant="header" /> : null}
		</header>
	);
}
