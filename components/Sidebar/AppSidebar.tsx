import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail } from "@/components/ui/sidebar";
import { Goal, Grid3X3, Home, Megaphone, MessageCircle, Tag, UserRound, Users, UsersRound } from "lucide-react";
import AppSidebarContentGroup from "./AppSidebarContentGroup";
import type { TUserSession } from "@/schemas/users";
import AppSidebarFooter from "./AppSidebarFooter";
import AppSidebarHeader from "./AppSidebarHeader";

export type TSidebarConfigItem = {
	group: string;
	items: TSidebarItem[];
};

export type TSidebarItem = {
	title: string;
	url: string | null;
	icon: React.ReactNode;
	items: TSidebarItem[] | null;
};
export const SidebarConfig: TSidebarConfigItem[] = [
	{
		group: "Geral",
		items: [
			{
				title: "Dashboard",
				url: "/dashboard",
				icon: <Home className="w-4 h-4" />,
				items: null,
			},
		],
	},
	{
		group: "Comercial",
		items: [
			{
				title: "Segmentações",
				url: "/dashboard/commercial/segments",
				icon: <Grid3X3 className="w-4 h-4" />,
				items: null,
			},
			{
				title: "Clientes",
				url: "/dashboard/commercial/clients",
				icon: <UsersRound className="w-4 h-4" />,
				items: null,
			},
			{
				title: "Campanhas",
				url: "/dashboard/commercial/campaigns",
				icon: <Megaphone className="w-4 h-4" />,
				items: null,
			},
		],
	},
	{
		group: "Time",
		items: [
			{
				title: "Vendedores",
				url: "/dashboard/team/sellers",
				icon: <UserRound className="w-4 h-4" />,
				items: null,
			},
			{
				title: "Metas",
				url: "/dashboard/team/goals",
				icon: <Goal className="w-4 h-4" />,
				items: null,
			},
		],
	},
	{
		group: "Atendimentos",
		items: [
			{
				title: "Conversas",
				url: "/dashboard/chats",
				icon: <MessageCircle className="w-4 h-4" />,
				items: null,
			},
		],
	},
];
export function AppSidebar({ user, ...props }: React.ComponentProps<typeof Sidebar> & { user: TUserSession }) {
	return (
		<Sidebar variant="inset" collapsible="icon" {...props}>
			<SidebarHeader>
				<AppSidebarHeader />
			</SidebarHeader>
			<SidebarContent>
				{SidebarConfig.map((group) => (
					<AppSidebarContentGroup key={group.group} group={group} />
				))}
			</SidebarContent>
			<SidebarFooter>
				<AppSidebarFooter user={user} />
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}
