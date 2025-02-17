import type { TUserSession } from "@/schemas/users";
import React, { useState } from "react";
import Header from "../Layouts/Header";
import ErrorComponent from "../Layouts/ErrorComponent";
import { cn } from "@/lib/utils";
import UsersView from "./UsersView";
import SaleGoalsView from "./SaleGoalsView";
import MarketingControlView from "./MarketingControlsView";
import SettingsView from "./SettingsView";

type ConfigurationPageProps = {
	session: TUserSession;
};
function ConfigurationPage({ session }: ConfigurationPageProps) {
	const [view, setView] = useState<
		"users" | "goals" | "marketing-controls" | "settings"
	>("users");

	if (session.visualizacao !== "GERAL")
		return (
			<div className="flex h-full flex-col">
				<Header session={session} />
				<ErrorComponent msg="Oops, você não possui permissão para acessar essa área." />
			</div>
		);

	return (
		<div className="flex h-full flex-col">
			<Header session={session} />
			<div className="flex w-full max-w-full grow flex-col overflow-x-hidden bg-[#f8f9fa] p-6">
				<div className="w-full flex items-center justify-center gap-4 flex-wrap">
					<button
						type="button"
						onClick={() => setView("users")}
						className={cn(
							"px-2 py-1 rounded-lg bg-transparent font-bold tracking-tight duration-300 ease-in-out",
							view === "users"
								? "bg-[#fead41] text-[#15599a]"
								: "hover:bg-gray-100",
						)}
					>
						Painel de Usuários
					</button>
					<button
						type="button"
						onClick={() => setView("goals")}
						className={cn(
							"px-2 py-1 rounded-lg bg-transparent font-bold tracking-tight duration-300 ease-in-out",
							view === "goals"
								? "bg-[#fead41] text-[#15599a]"
								: "hover:bg-gray-100",
						)}
					>
						Painel de Metas
					</button>
					<button
						type="button"
						onClick={() => setView("marketing-controls")}
						className={cn(
							"px-2 py-1 rounded-lg bg-transparent font-bold tracking-tight duration-300 ease-in-out",
							view === "marketing-controls"
								? "bg-[#fead41] text-[#15599a]"
								: "hover:bg-gray-100",
						)}
					>
						Painel de Marketing
					</button>
					<button
						type="button"
						onClick={() => setView("settings")}
						className={cn(
							"px-2 py-1 rounded-lg bg-transparent font-bold tracking-tight duration-300 ease-in-out",
							view === "settings"
								? "bg-[#fead41] text-[#15599a]"
								: "hover:bg-gray-100",
						)}
					>
						Configurações
					</button>
				</div>
				{view === "users" ? <UsersView session={session} /> : null}
				{view === "goals" ? <SaleGoalsView session={session} /> : null}
				{view === "marketing-controls" ? (
					<MarketingControlView session={session} />
				) : null}
				{view === "settings" ? <SettingsView /> : null}
			</div>
		</div>
	);
}

export default ConfigurationPage;
