import ErrorComponent from "@/components/Layouts/ErrorComponent";
import { OrgColorsProvider } from "@/components/Providers/OrgColorsProvider";
import { db } from "@/services/drizzle";
import PointOfInteractionContent from "./point-of-interaction-page";

export default async function PointOfInteraction({ params }: { params: Promise<{ orgId: string }> }) {
	const { orgId } = await params;

	if (!orgId) {
		return <ErrorComponent msg="Oops, parâmetro inválido." />;
	}

	const org = await db.query.organizations.findFirst({
		where: (fields, { eq }) => eq(fields.id, orgId),
		columns: {
			id: true,
			cnpj: true,
			nome: true,
			logoUrl: true,
			telefone: true,
			corPrimaria: true,
			corSecundaria: true,
		},
	});
	if (!org) {
		return <ErrorComponent msg="Organização não encontrada" />;
	}

	const cashbackProgram = await db.query.cashbackPrograms.findFirst({
		where: (fields, { eq }) => eq(fields.organizacaoId, orgId),
	});
	if (!cashbackProgram) {
		return <ErrorComponent msg="Programa de cashback não encontrado" />;
	}

	return (
		<OrgColorsProvider corPrimaria={org.corPrimaria} corSecundaria={org.corSecundaria}>
			<PointOfInteractionContent org={org} cashbackProgram={cashbackProgram} />
		</OrgColorsProvider>
	);
}
