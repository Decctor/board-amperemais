"use client";
import { getAppRouteTitle } from "@/config";
import { SidebarTrigger } from "../ui/sidebar";
import { usePathname } from "next/navigation";

export default function AppHeader() {
	const pathname = usePathname();
	const title = getAppRouteTitle(pathname || "");
	return (
		<header className="flex items-center gap-2">
			<SidebarTrigger />
			<h1 className="text-xl font-black leading-none tracking-tight md:text-2xl text-primary">{title}</h1>
		</header>
	);
}
