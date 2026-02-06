"use client";

import { ChevronRight, type LucideIcon } from "lucide-react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import Link from "next/link";
import type { TSidebarConfigItem, TSidebarItem } from "./AppSidebar";

function AppSidebarContentGroup({
	group,
}: {
	group: TSidebarConfigItem;
}) {
	return (
		<SidebarGroup>
			<SidebarGroupLabel>{group.group}</SidebarGroupLabel>
			<SidebarMenu>
				{group.items.map((item) => (
					<AppSidebarContentGroupItem key={item.title} item={item} />
				))}
			</SidebarMenu>
		</SidebarGroup>
	);
}
export default AppSidebarContentGroup;

type AppSidebarContentGroupItemProps = {
	item: TSidebarItem;
};
function AppSidebarContentGroupItem({ item }: AppSidebarContentGroupItemProps) {
	if (item.items && item.items.length > 0)
		return (
			<Collapsible asChild defaultOpen={false} className="group/collapsible">
				<SidebarMenuItem>
					<CollapsibleTrigger asChild>
						<SidebarMenuButton tooltip={item.title}>
							{item.icon ? item.icon : null}
							<span>{item.title}</span>
							<ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
						</SidebarMenuButton>
					</CollapsibleTrigger>
					<CollapsibleContent>
						<SidebarMenuSub>
							{item.items?.map((subItem) => (
								<SidebarMenuSubItem key={subItem.title}>
									<SidebarMenuSubButton asChild>
										{subItem.url ? (
											<Link href={subItem.url}>
												<span>{subItem.title}</span>
											</Link>
										) : (
											<span>{subItem.title}</span>
										)}
									</SidebarMenuSubButton>
								</SidebarMenuSubItem>
							))}
						</SidebarMenuSub>
					</CollapsibleContent>
				</SidebarMenuItem>
			</Collapsible>
		);
	return (
		<SidebarMenuItem>
			<SidebarMenuButton tooltip={item.title} asChild>
				{item.url ? (
					<Link href={item.url}>
						{item.icon ? item.icon : null}
						<span>{item.title}</span>
					</Link>
				) : (
					<span>{item.title}</span>
				)}
			</SidebarMenuButton>
		</SidebarMenuItem>
	);
}
