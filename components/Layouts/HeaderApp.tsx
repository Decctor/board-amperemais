import { cn } from "@/lib/utils";
import type { TUserSession } from "@/schemas/users";
import LogoIcon from "@/utils/images/logo-icon.png";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BsDatabaseFill } from "react-icons/bs";
import { MdLogout, MdSettings } from "react-icons/md";
type HeaderProps = {
	session: TUserSession;
};
function Header({ session }: HeaderProps) {
	const pathname = usePathname();
	console.log(pathname);
	return (
		<div className="border-b border-gray-300 shadow-sm rounded-bl rounded-br w-full flex flex-col gap-2 p-3">
			<div className="w-full flex items-center justify-between gap-2">
				<div className="flex items-center gap-2">
					<Link href="/">
						<div className="p-2 flex items-center justify-center rounded-full bg-white">
							<div className="min-w-[25px] w-[25px] min-h-[25px] h-[25px] relative">
								<Image src={LogoIcon} alt="Logo Ampère+" fill={true} />
							</div>
						</div>
					</Link>
					<div className="hidden lg:flex items-center gap-2">
						<Link href="/dashboard">
							<h1 className={cn("text-sm font-bold text-primary px-2 py-1 rounded-lg", pathname === "/" ? "bg-primary text-white" : "text-primary")}>
								Dashboard
							</h1>
						</Link>
						<Link href="/dashboard/commercial/clients">
							<h1
								className={cn(
									"text-sm font-bold text-primary px-2 py-1 rounded-lg",
									pathname === "/dashboard/commercial/clients" ? "bg-primary text-white" : "text-primary",
								)}
							>
								Clientes
							</h1>
						</Link>
						<Link href="/dashboard/commercial/segments">
							<h1
								className={cn(
									"text-sm font-bold text-primary px-2 py-1 rounded-lg",
									pathname === "/dashboard/commercial/segments" ? "bg-primary text-white" : "text-primary",
								)}
							>
								Segmentações
							</h1>
						</Link>
						<Link href="/dashboard/team/sellers">
							<h1
								className={cn(
									"text-sm font-bold text-primary px-2 py-1 rounded-lg",
									pathname === "/dashboard/team/sellers" ? "bg-primary text-white" : "text-primary",
								)}
							>
								Time de Vendas
							</h1>
						</Link>
						<Link href="/dashboard/chats">
							<h1
								className={cn(
									"text-sm font-bold text-primary px-2 py-1 rounded-lg",
									pathname === "/dashboard/chats" ? "bg-primary text-white" : "text-primary",
								)}
							>
								Atendimentos
							</h1>
						</Link>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<div className="text-xs lg:text-sm font-bold">{session.nome}</div>

					{session.visualizacao === "GERAL" ? (
						<Link href={"/dashboard/settings"}>
							<button type="button" className="text-sm hover:bg-gray-200 ease-in-out duration-300 rounded-full p-2">
								<MdSettings />
							</button>
						</Link>
					) : null}

					<Link href={"/api/auth/logout"}>
						<button type="button" className="text-sm hover:bg-gray-200 ease-in-out duration-300 rounded-full p-2">
							<MdLogout />
						</button>
					</Link>
				</div>
			</div>
			<div className="flex lg:hidden items-center justify-center gap-2 flex-wrap">
				<Link href="/dashboard">
					<h1 className={cn("text-xs font-bold text-primary px-2 py-1 rounded-lg", pathname === "/" ? "bg-primary text-white" : "text-primary")}>
						Resultados Comerciais
					</h1>
				</Link>
				<Link href="/dashboard/commercial/segments">
					<h1
						className={cn(
							"text-xs font-bold text-primary px-2 py-1 rounded-lg",
							pathname === "/dashboard/commercial/segments" ? "bg-primary text-white" : "text-primary",
						)}
					>
						Análise RFM
					</h1>
				</Link>
				<Link href="/dashboard/team/sellers">
					<h1
						className={cn(
							"text-xs font-bold text-primary px-2 py-1 rounded-lg",
							pathname === "/dashboard/team/sellers" ? "bg-primary text-white" : "text-primary",
						)}
					>
						Time de Vendas
					</h1>
				</Link>
				<Link href="/dashboard/chats">
					<h1
						className={cn(
							"text-xs font-bold text-primary px-2 py-1 rounded-lg",
							pathname === "/dashboard/chats" ? "bg-primary text-white" : "text-primary",
						)}
					>
						Atendimentos
					</h1>
				</Link>
			</div>
		</div>
	);
}

export default Header;
