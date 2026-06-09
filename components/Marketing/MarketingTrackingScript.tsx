import { getCurrentSession } from "@/lib/authentication/session";
import { MarketingTrackingScriptClient } from "./MarketingTrackingScriptClient";

export async function MarketingTrackingScript() {
	const session = await getCurrentSession();
	const user = session
		? {
				id: session.user.id,
				nome: session.user.nome,
				email: session.user.email,
				telefone: session.user.telefone,
				organizacaoId: session.membership?.organizacao.id ?? null,
				organizacaoNome: session.membership?.organizacao.nome ?? null,
			}
		: null;

	return (
		<MarketingTrackingScriptClient
			sdkUrl={process.env.NEXT_PUBLIC_CONTROL_SDK_URL}
			writeKey={process.env.NEXT_PUBLIC_CONTROL_WRITE_KEY}
			pixelId={process.env.NEXT_PUBLIC_CONTROL_PIXEL_ID}
			user={user}
		/>
	);
}
