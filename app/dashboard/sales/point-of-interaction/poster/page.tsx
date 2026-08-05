import { ClubQrPoster } from "@/components/PointOfInteraction/ClubQrPoster";
import { getCurrentSession } from "@/lib/authentication/session";
import { getOrganizationPoiUrl } from "@/lib/organizations/poi-qr-codes";
import { derivePoiTheme } from "@/lib/point-of-interaction/theme";
import { db } from "@/services/drizzle";
import { redirect } from "next/navigation";

export default async function PointOfInteractionPoster({ searchParams }: { searchParams: Promise<{ qr?: string }> }) {
	const sessionUser = await getCurrentSession();
	if (!sessionUser) redirect("/auth/signin");

	const membership = sessionUser.membership;
	if (!membership) redirect("/onboarding");
	const org = membership.organizacao;

	const { qr } = await searchParams;
	// Pôster impresso é escaneado pelo celular do cliente, então o QR mobile é o padrão;
	// `?qr=kiosk` imprime o QR do tablet para quem quer sinalizar o próprio ponto de autoatendimento.
	const qrMode = qr === "kiosk" ? "kiosk" : "mobile";

	const cashbackProgram = await db.query.cashbackPrograms.findFirst({
		where: (fields, { eq }) => eq(fields.organizacaoId, org.id),
		columns: { titulo: true },
	});

	return (
		<ClubQrPoster
			org={{ nome: org.nome, logoUrl: org.logoUrl }}
			programTitle={cashbackProgram?.titulo}
			theme={derivePoiTheme(org)}
			targetUrl={getOrganizationPoiUrl({ orgId: org.id, mode: qrMode })}
			qrDataUrl={qrMode === "kiosk" ? org.poiQrCodeKioskDataUrl : org.poiQrCodeMobileDataUrl}
		/>
	);
}
