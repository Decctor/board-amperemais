import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "../ui/sidebar";
import LogoIcon from "@/utils/images/logo-icon.png";
import Image from "next/image";
export default function AppSidebarHeader() {
	return (
		<SidebarMenu>
			<SidebarMenuItem className="flex items-center justify-center">
				<div className="flex items-center gap-2 w-full self-center">
					<div className="relative w-8 h-8 min-w-8 min-h-8 max-w-8 max-h-8 self-center">
						<Image src={LogoIcon} alt="Logo Ampère Mais" fill />
					</div>
					<div className="grid flex-1 text-left text-sm leading-tight">
						<span className="truncate font-medium">Board Ampère Mais</span>
					</div>
				</div>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
