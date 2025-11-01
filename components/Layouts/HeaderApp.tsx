"use client";
import { SidebarConfig } from "../Sidebar/AppSidebar";
import { SidebarTrigger } from "../ui/sidebar";
import { usePathname } from "next/navigation";

export default function AppHeader() {
	const pathname = usePathname();
	function getPathnameTitle(pathname: string | null) {
		if (!pathname) return "";
		const item = SidebarConfig.flatMap((group) => group.items).find((item) => item.url === pathname);

		return item?.title || "";
	}
	return (
		<header className="flex items-center gap-2">
			<SidebarTrigger />
			<h1 className="text-xl font-black leading-none tracking-tight md:text-2xl text-primary">{getPathnameTitle(pathname)}</h1>
		</header>
	);
}
