"use client";
import SettingsAiAgent from "@/components/Settings/SettingsAiAgent";
import SettingsDevices from "@/components/Settings/SettingsDevices";
import SettingsIntegration from "@/components/Settings/SettingsIntegration";
import SettingsOrg from "@/components/Settings/SettingsOrg";
import SettingsProfile from "@/components/Settings/SettingsProfile";
import SettingsSegments from "@/components/Settings/SettingsSegments";
import SettingsUsers from "@/components/Settings/SettingsUsers";
import SettingsWhatsAppConnection from "@/components/Settings/SettingsWhatsAppConnection";
import CommunicationTemplatesPage from "@/app/dashboard/communication/_components/communication-templates-page";
import UnauthorizedPage from "@/components/Utils/UnauthorizedPage";
import { Button } from "@/components/ui/button";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { copyToClipboard } from "@/lib/utils";
import { Bot, Building2, Grid3x3, Key, MessageCircleIcon, Plug, Presentation, TabletSmartphone, User, UsersRound } from "lucide-react";
import { parseAsStringEnum, useQueryState } from "nuqs";
type SettingsPageProps = {
	user: TAuthUserSession["user"];
	membership: NonNullable<TAuthUserSession["membership"]>;
};
export default function SettingsPage({ user, membership }: SettingsPageProps) {
	const [view, setView] = useQueryState(
		"view",
		parseAsStringEnum(["profile", "users", "meta-oauth", "message-templates", "segments", "organization", "integration", "devices", "ai-agent"]),
	);
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

			<div className="w-full overflow-x-auto overflow-y-hidden scroll-smooth scrollbar-thin scrollbar-thumb-primary/5 scrollbar-track-transparent pb-4 mb-1">
				<div className="flex items-center justify-start gap-2 min-w-max">
					<Button
						variant={!view || view === "profile" ? "secondary" : "ghost"}
						className="flex items-center gap-2 whitespace-nowrap"
						size="sm"
						onClick={() => setView("profile")}
					>
						<User className="w-4 h-4 min-w-4 min-h-4" />
						MEU PERFIL
					</Button>
					<Button
						variant={view === "organization" ? "secondary" : "ghost"}
						className="flex items-center gap-2 whitespace-nowrap"
						size="sm"
						onClick={() => setView("organization")}
					>
						<Building2 className="w-4 h-4 min-w-4 min-h-4" />
						ORGANIZAÇÃO
					</Button>

					<Button
						variant={view === "integration" ? "secondary" : "ghost"}
						className="flex items-center gap-2 whitespace-nowrap"
						size="sm"
						onClick={() => setView("integration")}
					>
						<Plug className="w-4 h-4 min-w-4 min-h-4" />
						INTEGRAÇÃO
					</Button>
					<Button
						variant={view === "users" ? "secondary" : "ghost"}
						className="flex items-center gap-2 whitespace-nowrap"
						size="sm"
						onClick={() => setView("users")}
					>
						<UsersRound className="w-4 h-4 min-w-4 min-h-4" />
						USUÁRIOS
					</Button>
					<Button
						variant={view === "devices" ? "secondary" : "ghost"}
						className="flex items-center gap-2 whitespace-nowrap"
						size="sm"
						onClick={() => setView("devices")}
					>
						<TabletSmartphone className="w-4 h-4 min-w-4 min-h-4" />
						DISPOSITIVOS
					</Button>
					<Button
						variant={view === "meta-oauth" ? "secondary" : "ghost"}
						className="flex items-center gap-2 whitespace-nowrap"
						size="sm"
						onClick={() => setView("meta-oauth")}
					>
						<Key className="w-4 h-4 min-w-4 min-h-4" />
						CONEXÃO COM WHATSAPP
					</Button>
					<Button
						variant={view === "message-templates" ? "secondary" : "ghost"}
						className="flex items-center gap-2 whitespace-nowrap"
						size="sm"
						onClick={() => setView("message-templates")}
					>
						<MessageCircleIcon className="w-4 h-4 min-w-4 min-h-4" />
						TEMPLATES DE MENSAGEM
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
						variant={view === "ai-agent" ? "secondary" : "ghost"}
						className="flex items-center gap-2 whitespace-nowrap"
						size="sm"
						onClick={() => setView("ai-agent")}
					>
						<Bot className="w-4 h-4 min-w-4 min-h-4" />
						AGENTE DE IA
					</Button>
				</div>
			</div>
			{!view || view === "profile" ? <SettingsProfile sessionUser={user} /> : null}
			{view === "users" ? (
				membership.permissoes.usuarios.visualizar ? (
					<SettingsUsers user={user} membership={membership} />
				) : (
					<UnauthorizedPage />
				)
			) : null}
			{view === "devices" ? (
				membership.permissoes.empresa.visualizar ? (
					<SettingsDevices user={user} membership={membership} />
				) : (
					<UnauthorizedPage />
				)
			) : null}
			{view === "meta-oauth" ? <SettingsWhatsAppConnection user={user} /> : null}
			{view === "message-templates" ? <CommunicationTemplatesPage organizationName={membership.organizacao.nome} /> : null}
			{view === "segments" ? <SettingsSegments user={user} /> : null}
			{view === "organization" ? <SettingsOrg user={user} membership={membership} /> : null}
			{view === "integration" ? <SettingsIntegration user={user} membership={membership} /> : null}
			{view === "ai-agent" ? <SettingsAiAgent membership={membership} /> : null}
		</div>
	);
}
