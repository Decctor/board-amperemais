import SocialProfileInput from "@/components/Inputs/SocialProfileInput";
import TextInput from "@/components/Inputs/TextInput";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { normalizeWebsiteUrl } from "@/lib/socials";
import type { TUseClientState } from "@/state-hooks/use-client-state";
import { Globe, Instagram, Linkedin, Twitter } from "lucide-react";

type ClientSocialsBlockProps = {
	client: TUseClientState["state"]["client"];
	updateClient: TUseClientState["updateClient"];
};

export default function ClientSocialsBlock({ client, updateClient }: ClientSocialsBlockProps) {
	return (
		<ResponsiveMenuSection title="INFORMAÇÕES SOCIAIS" icon={<Globe className="h-4 min-h-4 w-4 min-w-4" />}>
			<TextInput
				label="WEBSITE"
				value={client.websiteUrl ?? ""}
				placeholder="dominio.com.br"
				handleChange={(value) => updateClient({ websiteUrl: value || null })}
				handleOnBlur={() => updateClient({ websiteUrl: normalizeWebsiteUrl(client.websiteUrl) })}
			/>
			<div className="grid w-full grid-cols-1 gap-2 md:grid-cols-3">
				<SocialProfileInput
					label="INSTAGRAM"
					value={client.instagram ?? ""}
					platform="instagram"
					prefix="instagram.com/"
					prefixIcon={<Instagram className="size-3.5" />}
					placeholder="usuario"
					handleChange={(value) => updateClient({ instagram: value })}
				/>
				<SocialProfileInput
					label="LINKEDIN"
					value={client.linkedin ?? ""}
					platform="linkedin"
					prefix="linkedin.com/"
					prefixIcon={<Linkedin className="size-3.5" />}
					placeholder="in/usuario"
					handleChange={(value) => updateClient({ linkedin: value })}
				/>
				<SocialProfileInput
					label="X / TWITTER"
					value={client.twitter ?? ""}
					platform="twitter"
					prefix="x.com/"
					prefixIcon={<Twitter className="size-3.5" />}
					placeholder="usuario"
					handleChange={(value) => updateClient({ twitter: value })}
				/>
			</div>
		</ResponsiveMenuSection>
	);
}
