"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Fragment } from "react";
import RecompraCRMLogo from "@/utils/svgs/logos/RECOMPRA - COMPLETE - HORIZONTAL- COLORFUL.svg";
import Image from "next/image";
export type TCommunityBreadcrumbItem = {
	label: string;
	href?: string;
};

type CommunityHeaderProps = {
	breadcrumbs?: TCommunityBreadcrumbItem[];
};

export function CommunityHeader({ breadcrumbs }: CommunityHeaderProps) {
	return (
		<header className="flex items-center gap-3 w-full">
			<div className="flex items-center px-4 py-1 bg-[#24549C] rounded-full">
				<div className="w-24 h-10 min-w-24 min-h-10 relative">
					<Image src={RecompraCRMLogo} alt="RecompraCRM Logo" fill />
				</div>
			</div>

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
