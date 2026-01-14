import type { TAuthUserSession } from "@/lib/authentication/types";
import LogoIcon from "@/utils/images/logo-icon.png";
import Image from "next/image";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "../ui/sidebar";

type AppSidebarHeaderProps = {
	sessionUserOrg: TAuthUserSession["organization"];
};
export default function AppSidebarHeader({ sessionUserOrg }: AppSidebarHeaderProps) {
	return (
		<SidebarMenu>
			<SidebarMenuItem className="flex items-center justify-center">
				{sessionUserOrg ? (
					<div className="flex items-center gap-2 w-full self-center">
						<div className="relative w-8 h-8 min-w-8 min-h-8 max-w-8 max-h-8 self-center rounded-lg overflow-hidden">
							<Image src={sessionUserOrg.logoUrl ?? LogoIcon} alt={sessionUserOrg.nome} fill />
						</div>
						<div className="grid flex-1 text-left text-sm leading-tight">
							<span className="truncate font-medium">{sessionUserOrg.nome}</span>
						</div>
					</div>
				) : (
					<div className="flex items-center gap-2 w-full self-center">
						<div className="relative w-8 h-8 min-w-8 min-h-8 max-w-8 max-h-8 self-center rounded-lg overflow-hidden">
							<Image src={LogoIcon} alt="Logo Ampère Mais" fill />
						</div>
						<div className="grid flex-1 text-left text-sm leading-tight">
							<span className="truncate font-medium">RecompraCRM</span>
						</div>
					</div>
				)}
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
