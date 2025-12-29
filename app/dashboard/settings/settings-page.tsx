"use client";
import SettingsMetaOAuth from "@/components/Settings/SettingsMetaOAuth";
import SettingsSalesPromoCampaigns from "@/components/Settings/SettingsSalesPromoCampaigns";
import SettingsSegments from "@/components/Settings/SettingsSegments";
import SettingsUsers from "@/components/Settings/SettingsUsers";
import SettingsWhatsappTemplates from "@/components/Settings/SettingsWhatsappTemplates";
import UnauthorizedPage from "@/components/Utils/UnauthorizedPage";
import { Button } from "@/components/ui/button";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { copyToClipboard } from "@/lib/utils";
import { Grid3x3, Key, MessageCircleIcon, Presentation, Trophy, UsersRound } from "lucide-react";
import { parseAsStringEnum, useQueryState } from "nuqs";
import { useState } from "react";
type SettingsPageProps = {
	user: TAuthUserSession["user"];
};
export default function SettingsPage({ user }: SettingsPageProps) {
	const [view, setView] = useQueryState("view", parseAsStringEnum(["users", "meta-oauth", "whatsapp-templates", "segments", "sales-promo-campaigns"]));
	return (
		<div className="w-full h-full flex flex-col gap-3">
			<div className="w-full flex items-center justify-end">
				<Button
					variant="ghost"
					className="flex items-center gap-2"
					size="sm"
					onClick={() => copyToClipboard(`${process.env.NEXT_PUBLIC_APP_URL}/point-of-interaction/${user.organizacaoId}`)}
				>
					<Presentation className="w-4 h-4 min-w-4 min-h-4" />
					PONTO DE INTERAÇÃO
				</Button>
			</div>

			<div className="w-full flex items-center justify-start gap-2">
				<Button
					variant={!view || view === "users" ? "secondary" : "ghost"}
					className="flex items-center gap-2"
					size="sm"
					onClick={() => setView("users")}
				>
					<UsersRound className="w-4 h-4 min-w-4 min-h-4" />
					USUÁRIOS
				</Button>
				<Button
					variant={view === "meta-oauth" ? "secondary" : "ghost"}
					className="flex items-center gap-2"
					size="sm"
					onClick={() => setView("meta-oauth")}
				>
					<Key className="w-4 h-4 min-w-4 min-h-4" />
					CONEXÃO META
				</Button>
				<Button
					variant={view === "whatsapp-templates" ? "secondary" : "ghost"}
					className="flex items-center gap-2"
					size="sm"
					onClick={() => setView("whatsapp-templates")}
				>
					<MessageCircleIcon className="w-4 h-4 min-w-4 min-h-4" />
					TEMPLATES WHATSAPP
				</Button>
				<Button variant={view === "segments" ? "secondary" : "ghost"} className="flex items-center gap-2" size="sm" onClick={() => setView("segments")}>
					<Grid3x3 className="w-4 h-4 min-w-4 min-h-4" />
					SEGMENTAÇÕES
				</Button>
				<Button
					variant={view === "sales-promo-campaigns" ? "secondary" : "ghost"}
					className="flex items-center gap-2"
					size="sm"
					onClick={() => setView("sales-promo-campaigns")}
				>
					<Trophy className="w-4 h-4 min-w-4 min-h-4" />
					CAMPANHAS DE PROMOÇÃO DE VENDAS
				</Button>
			</div>
			{!view || view === "users" ? user.permissoes.usuarios.visualizar ? <SettingsUsers user={user} /> : <UnauthorizedPage /> : null}
			{view === "meta-oauth" ? <SettingsMetaOAuth user={user} /> : null}
			{view === "whatsapp-templates" ? <SettingsWhatsappTemplates user={user} /> : null}
			{view === "segments" ? <SettingsSegments user={user} /> : null}
			{view === "sales-promo-campaigns" ? <SettingsSalesPromoCampaigns user={user} /> : null}
		</div>
	);
}
