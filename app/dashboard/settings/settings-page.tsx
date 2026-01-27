"use client";
import SettingsMetaOAuth from "@/components/Settings/SettingsMetaOAuth";
import SettingsOrgColors from "@/components/Settings/SettingsOrgColors";
import SettingsSalesPromoCampaigns from "@/components/Settings/SettingsSalesPromoCampaigns";
import SettingsSegments from "@/components/Settings/SettingsSegments";
import SettingsUsers from "@/components/Settings/SettingsUsers";
import SettingsWhatsappTemplates from "@/components/Settings/SettingsWhatsappTemplates";
import UnauthorizedPage from "@/components/Utils/UnauthorizedPage";
import { Button } from "@/components/ui/button";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { copyToClipboard } from "@/lib/utils";
import { Grid3x3, Key, MessageCircleIcon, Palette, Presentation, Trophy, UsersRound } from "lucide-react";
import { parseAsStringEnum, useQueryState } from "nuqs";
type SettingsPageProps = {
	user: TAuthUserSession["user"];
	membership: NonNullable<TAuthUserSession["membership"]>;
};
export default function SettingsPage({ user, membership }: SettingsPageProps) {
	const [view, setView] = useQueryState("view", parseAsStringEnum(["users", "meta-oauth", "whatsapp-templates", "segments", "sales-promo-campaigns", "org-colors"]));
	return (
		<div className="w-full h-full flex flex-col gap-3">
			<div className="w-full flex items-center justify-end">
				<Button
					variant="ghost"
					className="flex items-center gap-2"
					size="sm"
					onClick={() => copyToClipboard(`${process.env.NEXT_PUBLIC_APP_URL}/point-of-interaction/${membership.organizacao.id}`)}
				>
					<Presentation className="w-4 h-4 min-w-4 min-h-4" />
					PONTO DE INTERAÇÃO
				</Button>
			</div>

			<div className="w-full overflow-x-auto overflow-y-hidden scroll-smooth">
				<div className="flex items-center justify-start gap-2 min-w-max">
					<Button
						variant={!view || view === "users" ? "secondary" : "ghost"}
						className="flex items-center gap-2 whitespace-nowrap"
						size="sm"
						onClick={() => setView("users")}
					>
						<UsersRound className="w-4 h-4 min-w-4 min-h-4" />
						USUÁRIOS
					</Button>
					<Button
						variant={view === "meta-oauth" ? "secondary" : "ghost"}
						className="flex items-center gap-2 whitespace-nowrap"
						size="sm"
						onClick={() => setView("meta-oauth")}
					>
						<Key className="w-4 h-4 min-w-4 min-h-4" />
						CONEXÃO META
					</Button>
					<Button
						variant={view === "whatsapp-templates" ? "secondary" : "ghost"}
						className="flex items-center gap-2 whitespace-nowrap"
						size="sm"
						onClick={() => setView("whatsapp-templates")}
					>
						<MessageCircleIcon className="w-4 h-4 min-w-4 min-h-4" />
						TEMPLATES WHATSAPP
					</Button>
					<Button
						variant={view === "segments" ? "secondary" : "ghost"}
						className="flex items-center gap-2 whitespace-nowrap"
						size="sm"
						onClick={() => setView("segments")}
					>
						<Grid3x3 className="w-4 h-4 min-w-4 min-h-4" />
						SEGMENTAÇÕES
					</Button>
					<Button
						variant={view === "sales-promo-campaigns" ? "secondary" : "ghost"}
						className="flex items-center gap-2 whitespace-nowrap"
						size="sm"
						onClick={() => setView("sales-promo-campaigns")}
					>
						<Trophy className="w-4 h-4 min-w-4 min-h-4" />
						CAMPANHAS DE PROMOÇÃO DE VENDAS
					</Button>
					<Button
						variant={view === "org-colors" ? "secondary" : "ghost"}
						className="flex items-center gap-2 whitespace-nowrap"
						size="sm"
						onClick={() => setView("org-colors")}
					>
						<Palette className="w-4 h-4 min-w-4 min-h-4" />
						CORES
					</Button>
				</div>
			</div>
			{!view || view === "users" ? membership.permissoes.usuarios.visualizar ? <SettingsUsers user={user} membership={membership} /> : <UnauthorizedPage /> : null}
			{view === "meta-oauth" ? <SettingsMetaOAuth user={user} /> : null}
			{view === "whatsapp-templates" ? <SettingsWhatsappTemplates user={user} /> : null}
			{view === "segments" ? <SettingsSegments user={user} /> : null}
			{view === "sales-promo-campaigns" ? <SettingsSalesPromoCampaigns user={user} /> : null}
			{view === "org-colors" ? <SettingsOrgColors user={user} membership={membership} /> : null}
		</div>
	);
}
