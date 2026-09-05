"use client";
import { getAppRouteIcon } from "@/config/app-route-icons";
import { getAppRouteDescription, getAppRouteTitle } from "@/config";
import { HeaderUtilities, type THeaderSession } from "@/components/Layouts/HeaderUtilities";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Button } from "../ui/button";
import { SidebarTrigger } from "../ui/sidebar";

type AppHeaderProps = {
	showSidebarTrigger?: boolean;
	/** Sessão de organização: habilita a paleta de comandos no trilho de utilidades. */
	session?: THeaderSession;
};

export default function AppHeader({ showSidebarTrigger = true, session }: AppHeaderProps) {
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const title = getAppRouteTitle(pathname || "");
	const description = getAppRouteDescription(pathname || "");
	const RouteIcon = getAppRouteIcon(pathname || "");
	const redirectBackTo = searchParams?.get("redirectBackTo");
	return (
		<header className="flex flex-col gap-0.5">
			<div className="flex items-center justify-between w-full">
				{/* min-w-0 + truncate: sem isso um título de rota longo empurra o trilho de utilidades para fora. */}
				<div className="flex min-w-0 items-center gap-2">
					{showSidebarTrigger ? <SidebarTrigger /> : null}
					{redirectBackTo ? (
						<Button variant="ghost" size="fit" asChild className="rounded-full hover:bg-brand/10 flex items-center gap-1 px-2 py-2 short:px-1.5 short:py-1">
							<Link href={redirectBackTo} className="flex items-center gap-1">
								<ArrowLeft className="w-5 h-5 short:w-3.5 short:h-3.5" />
								<span className="short:text-xs">VOLTAR</span>
							</Link>
						</Button>
					) : null}
					{/* Decorativo: o título ao lado já nomeia a rota. */}
					{RouteIcon ? <RouteIcon aria-hidden className="size-4 shrink-0 text-foreground md:size-5" /> : null}
					<h1 className="truncate text-lg font-black leading-none tracking-tight text-foreground md:text-xl">{title}</h1>
				</div>
				<HeaderUtilities session={session} />
			</div>
			<p className="pl-2 text-xs leading-tight text-muted-foreground">{description}</p>
		</header>
	);
}
