"use client";
import { ChevronsUpDown, LogOut, UserRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { formatNameAsInitials } from "@/lib/formatting";
import Link from "next/link";
import { ThemeToggle } from "@/components/Utils/ThemeToggle";
import type { TUserSession } from "@/schemas/users";

export default function AppSidebarFooter({
	user,
}: {
	user: TUserSession;
}) {
	const { isMobile } = useSidebar();

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<SidebarMenuButton>
					<ThemeToggle />
				</SidebarMenuButton>
			</SidebarMenuItem>

			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
							<Avatar className="h-8 w-8 rounded-lg">
								<AvatarImage src={user.avatar ?? undefined} alt={user.nome} />
								<AvatarFallback className="rounded-lg">{formatNameAsInitials(user.nome)}</AvatarFallback>
							</Avatar>
							<div className="grid flex-1 text-left text-sm leading-tight">
								<span className="truncate font-medium">{user.nome}</span>
								<span className="truncate text-xs">{user.email}</span>
							</div>
							<ChevronsUpDown className="ml-auto size-4" />
						</SidebarMenuButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
						side={isMobile ? "bottom" : "right"}
						align="end"
						sideOffset={4}
					>
						<DropdownMenuLabel className="p-0 font-normal">
							<div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
								<Avatar className="h-8 w-8 rounded-lg">
									<AvatarImage src={user.avatar ?? undefined} alt={user.nome} />
									<AvatarFallback className="rounded-lg">{formatNameAsInitials(user.nome)}</AvatarFallback>
								</Avatar>
								<div className="grid flex-1 text-left text-sm leading-tight">
									<span className="truncate font-medium">{user.nome}</span>
									<span className="truncate text-xs">{user.email}</span>
								</div>
							</div>
						</DropdownMenuLabel>

						<DropdownMenuGroup>
							<DropdownMenuItem>
								<SidebarMenuButton asChild>
									<Link href="/dashboard/settings">
										<UserRound />
										Configurações
									</Link>
								</SidebarMenuButton>
							</DropdownMenuItem>
						</DropdownMenuGroup>
						<DropdownMenuSeparator />
						<DropdownMenuItem>
							<SidebarMenuButton asChild>
								<Link href="/api/auth/logout" prefetch={false}>
									<LogOut />
									Sair
								</Link>
							</SidebarMenuButton>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
