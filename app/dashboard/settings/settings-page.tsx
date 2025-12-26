"use client";
import SettingsMetaOAuth from "@/components/Settings/SettingsMetaOAuth";
import SettingsSalesPromoCampaigns from "@/components/Settings/SettingsSalesPromoCampaigns";
import SettingsSegments from "@/components/Settings/SettingsSegments";
import SettingsUsers from "@/components/Settings/SettingsUsers";
import SettingsWhatsappTemplates from "@/components/Settings/SettingsWhatsappTemplates";
import UnauthorizedPage from "@/components/Utils/UnauthorizedPage";
import { Button } from "@/components/ui/button";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { Grid3x3, Key, MessageCircleIcon, Trophy, UsersRound } from "lucide-react";
import { useState } from "react";

type SettingsPageProps = {
	user: TAuthUserSession["user"];
};
export default function SettingsPage({ user }: SettingsPageProps) {
	const [settingsView, setSettingsView] = useState<"users" | "meta-oauth" | "whatsapp-templates" | "segments" | "sales-promo-campaigns">("users");
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
					variant={settingsView === "meta-oauth" ? "secondary" : "ghost"}
					className="flex items-center gap-2"
					size="sm"
					onClick={() => setSettingsView("meta-oauth")}
				>
					<Key className="w-4 h-4 min-w-4 min-h-4" />
					CONEXÃO META
				</Button>
				<Button
					variant={settingsView === "whatsapp-templates" ? "secondary" : "ghost"}
					className="flex items-center gap-2"
					size="sm"
					onClick={() => setSettingsView("whatsapp-templates")}
				>
					<MessageCircleIcon className="w-4 h-4 min-w-4 min-h-4" />
					TEMPLATES WHATSAPP
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
				<Button
					variant={settingsView === "sales-promo-campaigns" ? "secondary" : "ghost"}
					className="flex items-center gap-2"
					size="sm"
					onClick={() => setSettingsView("sales-promo-campaigns")}
				>
					<Trophy className="w-4 h-4 min-w-4 min-h-4" />
					CAMPANHAS DE PROMOÇÃO DE VENDAS
				</Button>
			</div>
			{settingsView === "users" ? user.permissoes.usuarios.visualizar ? <SettingsUsers user={user} /> : <UnauthorizedPage /> : null}
			{settingsView === "meta-oauth" ? <SettingsMetaOAuth /> : null}
			{settingsView === "whatsapp-templates" ? <SettingsWhatsappTemplates user={user} /> : null}
			{settingsView === "segments" ? <SettingsSegments user={user} /> : null}
			{settingsView === "sales-promo-campaigns" ? <SettingsSalesPromoCampaigns user={user} /> : null}
		</div>
	);
}
