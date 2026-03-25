import ErrorComponent from "@/components/Layouts/ErrorComponent";
import { OrgColorsProvider } from "@/components/Providers/OrgColorsProvider";
import { Button } from "@/components/ui/button";
import { getCurrentSession } from "@/lib/authentication/session";
import { db } from "@/services/drizzle";
import { Plus } from "lucide-react";
import Link from "next/link";
import { MdOutlineError } from "react-icons/md";
import PointOfInteractionDisplayPage from "./point-of-interaction-display-page";

export default async function PointOfInteraction({ params }: { params: Promise<{ orgId: string }> }) {
	const { orgId } = await params;

	if (!orgId) {
		return <ErrorComponent msg="Oops, parâmetro inválido." />;
	}
	const session = await getCurrentSession();

	const org = await db.query.organizations.findFirst({
		where: (fields, { eq }) => eq(fields.id, orgId),
		columns: {
			id: true,
			cnpj: true,
			nome: true,
			logoUrl: true,
			telefone: true,
			corPrimaria: true,
			corPrimariaForeground: true,
			corSecundaria: true,
			corSecundariaForeground: true,
			poiQrCodeMobileDataUrl: true,
		},
	});
	if (!org) {
		return <ErrorComponent msg="Organização não encontrada" />;
	}
	const cashbackProgram = await db.query.cashbackPrograms.findFirst({
		where: (fields, { eq }) => eq(fields.organizacaoId, orgId),
	});
	return (
		<OrgColorsProvider
			corPrimaria={org.corPrimaria}
			corPrimariaForeground={org.corPrimariaForeground}
			corSecundaria={org.corSecundaria}
			corSecundariaForeground={org.corSecundariaForeground}
		>
			<PointOfInteractionDisplayPage org={org} cashbackProgram={cashbackProgram} />
		</OrgColorsProvider>
	);
}
