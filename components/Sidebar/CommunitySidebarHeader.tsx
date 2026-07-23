"use client";

import { BrandLogo } from "@/components/Brand/BrandLogo";
import { SidebarMenu, SidebarMenuItem } from "@/components/ui/sidebar";
import Link from "next/link";
export default function CommunitySidebarHeader() {
	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<Link href="/community" className="flex w-full items-center gap-2 px-2 py-1 group-data-[collapsible=icon]:justify-center">
					<div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#24549C]">
						<BrandLogo lockup="icon" tone="color-on-dark" alt="RecompraCRM Logo" fill className="object-cover" />
					</div>
					<div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
						<span className="truncate font-bold">RecompraCRM</span>
					</div>
				</Link>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
