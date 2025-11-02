"use client";
import SettingsMain from "@/components/Admin/SettingsMain";
import SettingsSegments from "@/components/Settings/SettingsSegments";
import SettingsUsers from "@/components/Settings/SettingsUsers";
import { Button } from "@/components/ui/button";
import type { TUserSession } from "@/schemas/users";
import { Grid3x3, UsersRound } from "lucide-react";
import { useState } from "react";

type SettingsPageProps = {
	user: TUserSession;
};
export default function SettingsPage({ user }: SettingsPageProps) {
	const [settingsView, setSettingsView] = useState<"users" | "segments">("users");
	return (
		<div className="w-full h-full flex flex-col gap-3">
			<div className="w-full flex items-center justify-start gap-2">
				<Button
					variant={settingsView === "users" ? "secondary" : "ghost"}
					className="flex items-center gap-2"
					size="sm"
					onClick={() => setSettingsView("users")}
				>
					<UsersRound className="w-4 h-4 min-w-4 min-h-4" />
					USUÁRIOS
				</Button>
				<Button
					variant={settingsView === "segments" ? "secondary" : "ghost"}
					className="flex items-center gap-2"
					size="sm"
					onClick={() => setSettingsView("segments")}
				>
					<Grid3x3 className="w-4 h-4 min-w-4 min-h-4" />
					SEGMENTAÇÕES
				</Button>
			</div>
			{settingsView === "users" ? <SettingsUsers user={user} /> : null}
			{settingsView === "segments" ? <SettingsSegments user={user} /> : null}
		</div>
	);
}
