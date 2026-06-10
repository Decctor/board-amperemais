import ErrorComponent from "@/components/Layouts/ErrorComponent";
import { OrgColorsProvider } from "@/components/Providers/OrgColorsProvider";
import { db } from "@/services/drizzle";
import PointOfInteractionPlaybookPage from "./point-of-interaction-playbook-page";

export default async function PointOfInteractionPlaybook({ params }: { params: Promise<{ orgId: string }> }) {
	const { orgId } = await params;

	if (!orgId) {
		return <ErrorComponent msg="Oops, parâmetro inválido." />;
	}

	const org = await db.query.organizations.findFirst({
		where: (fields, { eq }) => eq(fields.id, orgId),
		columns: {
			id: true,
			nome: true,
			logoUrl: true,
			telefone: true,
			corPrimaria: true,
			corPrimariaForeground: true,
			corSecundaria: true,
			corSecundariaForeground: true,
			poiQrCodeKioskDataUrl: true,
			poiQrCodeMobileDataUrl: true,
		},
	});
	if (!org) {
		return <ErrorComponent msg="Organização não encontrada" />;
	}

	const cashbackProgram = await db.query.cashbackPrograms.findFirst({
		where: (fields, { eq }) => eq(fields.organizacaoId, orgId),
		columns: { terminologia: true },
	});

	return (
		<OrgColorsProvider
			corPrimaria={org.corPrimaria}
			corPrimariaForeground={org.corPrimariaForeground}
			corSecundaria={org.corSecundaria}
			corSecundariaForeground={org.corSecundariaForeground}
		>
			<PointOfInteractionPlaybookPage org={org} cashbackProgram={cashbackProgram} />
		</OrgColorsProvider>
	);
}
