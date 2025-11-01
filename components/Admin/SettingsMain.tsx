import { cn } from "@/lib/utils";
import type { TUserSession } from "@/schemas/users";
import React, { useState } from "react";
import MarketingControlView from "./MarketingControlsView";
import SaleGoalsView from "./SaleGoalsView";
import SettingsView from "./SettingsView";
import UsersView from "./UsersView";

type SettingsMainProps = {
	session: TUserSession;
};
function SettingsMain({ session }: SettingsMainProps) {
	const [view, setView] = useState<"users" | "goals" | "marketing-controls" | "settings">("users");

	return (
		<>
			<div className="w-full flex items-center justify-center gap-4 flex-wrap">
				<button
					type="button"
					onClick={() => setView("users")}
					className={cn(
						"px-2 py-1 rounded-lg bg-transparent font-bold tracking-tight duration-300 ease-in-out",
						view === "users" ? "bg-[#fead41] text-[#15599a]" : "hover:bg-gray-100",
					)}
				>
					Painel de Usuários
				</button>
				<button
					type="button"
					onClick={() => setView("goals")}
					className={cn(
						"px-2 py-1 rounded-lg bg-transparent font-bold tracking-tight duration-300 ease-in-out",
						view === "goals" ? "bg-[#fead41] text-[#15599a]" : "hover:bg-gray-100",
					)}
				>
					Painel de Metas
				</button>
				<button
					type="button"
					onClick={() => setView("marketing-controls")}
					className={cn(
						"px-2 py-1 rounded-lg bg-transparent font-bold tracking-tight duration-300 ease-in-out",
						view === "marketing-controls" ? "bg-[#fead41] text-[#15599a]" : "hover:bg-gray-100",
					)}
				>
					Painel de Marketing
				</button>
				<button
					type="button"
					onClick={() => setView("settings")}
					className={cn(
						"px-2 py-1 rounded-lg bg-transparent font-bold tracking-tight duration-300 ease-in-out",
						view === "settings" ? "bg-[#fead41] text-[#15599a]" : "hover:bg-gray-100",
					)}
				>
					Configurações
				</button>
			</div>
			{view === "users" ? <UsersView session={session} /> : null}
			{view === "goals" ? <SaleGoalsView session={session} /> : null}
			{view === "marketing-controls" ? <MarketingControlView session={session} /> : null}
			{view === "settings" ? <SettingsView /> : null}
		</>
	);
}

export default SettingsMain;
