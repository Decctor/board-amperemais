"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";

type MarketingTrackingUser = {
	id: string;
	nome: string;
	email: string;
	telefone: string;
	organizacaoId?: string | null;
	organizacaoNome?: string | null;
};

type MarketingTrackingScriptClientProps = {
	sdkUrl?: string;
	writeKey?: string;
	pixelId?: string;
	user?: MarketingTrackingUser | null;
};

const TRACKING_DISABLED_PREFIXES = ["/dashboard", "/admin-dashboard", "/partner-dashboard", "/shop", "/testing"];

function shouldTrackPath(pathname: string) {
	return !TRACKING_DISABLED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function MarketingTrackingScriptClient({ sdkUrl, writeKey, pixelId, user }: MarketingTrackingScriptClientProps) {
	const pathname = usePathname();
	if (!sdkUrl || !writeKey || !shouldTrackPath(pathname)) return null;

	const bootstrap = user
		? `
window.ctrl = window.ctrl || { q: [] };
window.ctrl.q = window.ctrl.q || [];
window.ctrl.q.push(["identify", ${JSON.stringify(user.email)}, ${JSON.stringify({
	id: user.id,
	nome: user.nome,
	email: user.email,
	phone: user.telefone,
	telefone: user.telefone,
	organizacaoId: user.organizacaoId,
	organizacaoNome: user.organizacaoNome,
})}]);
`
		: "";

	return (
		<>
			{bootstrap ? (
				<Script id="control-sdk-identify-bootstrap" strategy="afterInteractive">
					{bootstrap}
				</Script>
			) : null}
			<Script
				id="control-sdk"
				src={sdkUrl}
				data-write-key={writeKey}
				data-pixel-id={pixelId}
				strategy="afterInteractive"
			/>
		</>
	);
}
