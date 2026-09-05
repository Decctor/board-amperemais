import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail } from "@/components/ui/sidebar";
import type { TAuthUserSession } from "@/lib/authentication/types";
import AppSidebarContentGroup from "./AppSidebarContentGroup";
import AppSidebarFooter from "./AppSidebarFooter";
import AppSidebarHeader from "./AppSidebarHeader";
import { AppSidebarConfig, filterSidebarConfig } from "./app-sidebar-config";

export type { TSidebarAccessContext, TSidebarConfigItem, TSidebarItem } from "./app-sidebar-config";

export function AppSidebar({
	user,
	organization,
	permissions,
	...props
}: React.ComponentProps<typeof Sidebar> & {
	user: TAuthUserSession["user"];
	organization: NonNullable<TAuthUserSession["membership"]>["organizacao"];
	permissions: NonNullable<TAuthUserSession["membership"]>["permissoes"];
}) {
	const filteredConfig = filterSidebarConfig(AppSidebarConfig, { organization, permissions });
	return (
		<Sidebar variant="inset" collapsible="icon" {...props}>
			<SidebarHeader>
				<AppSidebarHeader sessionUserOrg={organization} user={user} />
			</SidebarHeader>
			<SidebarContent>
				{filteredConfig.map((group) => (
					<AppSidebarContentGroup key={group.group} group={group} />
				))}
			</SidebarContent>
			<SidebarFooter>
				<AppSidebarFooter user={user} organization={organization} />
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}
