import { CommunityDock } from "@/components/Community/CommunityDock";
import { getCurrentSession } from "@/lib/authentication/session";
import type { Metadata } from "next";
import Script from "next/script";

export const metadata: Metadata = {
	title: "Comunidade",
	description: "Acesse cursos, eBooks, documentos e tutoriais exclusivos para aprimorar suas habilidades em vendas e fidelização.",
	openGraph: {
		title: "Comunidade | RecompraCRM",
		description: "Acesse cursos, eBooks, documentos e tutoriais exclusivos para aprimorar suas habilidades em vendas e fidelização.",
		url: "https://recompracrm.com.br/community",
	},
};

export default async function CommunityLayout({ children }: { children: React.ReactNode }) {
	const session = await getCurrentSession();
	const controlSdkUrl = process.env.NEXT_PUBLIC_CONTROL_SDK_URL;
	const controlWriteKey = process.env.NEXT_PUBLIC_CONTROL_WRITE_KEY;
	const controlPixelId = process.env.NEXT_PUBLIC_CONTROL_PIXEL_ID;

	const user = session
		? {
				nome: session.user.nome,
				email: session.user.email,
				avatarUrl: session.user.avatarUrl,
			}
		: null;

	return (
		<div className="font-raleway min-h-svh">
			{controlSdkUrl && controlWriteKey ? (
				<Script
					src={controlSdkUrl}
					data-write-key={controlWriteKey}
					data-pixel-id={controlPixelId}
					strategy="afterInteractive"
				/>
			) : null}
			<main className="min-h-svh overflow-y-auto pb-24">{children}</main>
			<CommunityDock user={user} />
		</div>
	);
}
