"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatNameAsInitials } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import RecompraCRMLogo from "@/utils/svgs/logos/RECOMPRA - ICON - COLORFUL.svg";
import { BookOpen, BookText, Home, LogOut, UserPlus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

type TCommunityDockNavItem = {
	title: string;
	url: string;
	icon: React.ReactNode;
	exact?: boolean;
};

const DOCK_NAV: TCommunityDockNavItem[] = [
	{ title: "Início", url: "/community", icon: <Home className="size-[18px]" strokeWidth={1.75} />, exact: true },
	{ title: "Cursos", url: "/community/courses", icon: <BookOpen className="size-[18px]" strokeWidth={1.75} /> },
	{ title: "Materiais", url: "/community/materials", icon: <BookText className="size-[18px]" strokeWidth={1.75} /> },
];

type CommunityDockProps = {
	user: {
		nome: string;
		email: string;
		avatarUrl?: string | null;
	} | null;
};

function DockDivider() {
	return <div className="mx-1 h-6 w-px shrink-0 bg-white/15" aria-hidden="true" />;
}

function isNavActive(pathname: string, item: TCommunityDockNavItem) {
	if (item.exact) return pathname === item.url;
	return pathname === item.url || pathname.startsWith(`${item.url}/`);
}

export function CommunityDock({ user }: CommunityDockProps) {
	const pathname = usePathname();

	return (
		<TooltipProvider delayDuration={200}>
			<nav aria-label="Navegação da comunidade" className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-4 sm:pb-6">
				<div className="pointer-events-auto flex items-center gap-1 rounded-full border border-white/10 bg-[#171512] px-2 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-md">
					{/* Usuário / Signup */}
					<div className="flex items-center pl-1">
						{user ? (
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<button
										type="button"
										className="flex size-7 md:size-9 items-center justify-center rounded-full outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/30"
										aria-label="Menu da conta"
									>
										<Avatar className="size-8 ring-2 ring-white/20">
											<AvatarImage src={user.avatarUrl ?? undefined} alt={user.nome} />
											<AvatarFallback className="bg-white/10 text-xs text-white">{formatNameAsInitials(user.nome)}</AvatarFallback>
										</Avatar>
									</button>
								</DropdownMenuTrigger>
								<DropdownMenuContent side="top" align="start" sideOffset={12} className="min-w-52 rounded-xl">
									<DropdownMenuLabel className="p-0 font-normal">
										<div className="flex items-center gap-2 px-2 py-2">
											<Avatar className="size-7 md:size-8">
												<AvatarImage src={user.avatarUrl ?? undefined} alt={user.nome} />
												<AvatarFallback>{formatNameAsInitials(user.nome)}</AvatarFallback>
											</Avatar>
											<div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
												<span className="truncate font-medium">{user.nome}</span>
												<span className="truncate text-xs text-muted-foreground">{user.email}</span>
											</div>
										</div>
									</DropdownMenuLabel>
									<DropdownMenuSeparator />
									<DropdownMenuItem asChild className="cursor-pointer">
										<Link href="/dashboard">Minha conta</Link>
									</DropdownMenuItem>
									<DropdownMenuSeparator />
									<DropdownMenuItem asChild className="cursor-pointer">
										<Link href="/auth/logout" prefetch={false}>
											<LogOut className="size-4" />
											Sair
										</Link>
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						) : (
							<Tooltip>
								<TooltipTrigger asChild>
									<Link
										href="/auth/signup"
										className="flex size-7 md:size-9 items-center justify-center rounded-full text-white/70 outline-none transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/30"
										aria-label="Criar conta"
									>
										<UserPlus className="size-[18px]" strokeWidth={1.75} />
									</Link>
								</TooltipTrigger>
								<TooltipContent side="top" className="text-xs">
									Criar conta
								</TooltipContent>
							</Tooltip>
						)}
					</div>

					<DockDivider />

					{/* Navegação central */}
					<div className="flex items-center gap-0.5 px-1">
						{DOCK_NAV.map((item) => {
							const active = isNavActive(pathname, item);
							return (
								<Tooltip key={item.url}>
									<TooltipTrigger asChild>
										<Link
											href={item.url}
											className={cn(
												"flex size-7 md:size-9 items-center justify-center rounded-full text-white/60 outline-none transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/30",
												active && "bg-white/12 text-white",
											)}
											aria-label={item.title}
											aria-current={active ? "page" : undefined}
										>
											{item.icon}
										</Link>
									</TooltipTrigger>
									<TooltipContent side="top" className="text-xs">
										{item.title}
									</TooltipContent>
								</Tooltip>
							);
						})}
					</div>

					<DockDivider />

					{/* Logo Recompra */}
					<div className="flex items-center pr-1">
						<Tooltip>
							<TooltipTrigger asChild>
								<Link
									href="/community"
									className="flex size-9 items-center justify-center rounded-full outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/30"
									aria-label="RecompraCRM"
								>
									<div className="relative flex size-7 items-center justify-center overflow-hidden rounded-lg bg-[#24549C]">
										<Image src={RecompraCRMLogo} alt="" fill className="object-cover" aria-hidden />
									</div>
								</Link>
							</TooltipTrigger>
							<TooltipContent side="top" className="text-xs">
								RecompraCRM
							</TooltipContent>
						</Tooltip>
					</div>
				</div>
			</nav>
		</TooltipProvider>
	);
}
