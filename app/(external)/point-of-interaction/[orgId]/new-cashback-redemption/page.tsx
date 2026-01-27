import ErrorComponent from "@/components/Layouts/ErrorComponent";
import { OrgColorsProvider } from "@/components/Providers/OrgColorsProvider";
import { db } from "@/services/drizzle";
import NewCashbackRedemptionContent from "./new-cashback-redemption-page";

export default async function NewCashbackRedemptionPage({
	params,
	searchParams,
}: { params: Promise<{ orgId: string }>; searchParams: Promise<{ clientId?: string }> }) {
	const { orgId } = await params;
	const { clientId } = await searchParams;
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
			corPrimariaForeground: true,
			corSecundaria: true,
			corSecundariaForeground: true,
		},
	});
	if (!org) {
		return <ErrorComponent msg="Organização não encontrada" />;
	}

    const orgCashbackProgram = await db.query.cashbackPrograms.findFirst({
        where: (fields, { eq }) => eq(fields.organizacaoId, orgId),
        columns: {
            id: true,
            resgateLimiteTipo: true,
            resgateLimiteValor: true,
        },
    });
	const redemptionLimit = orgCashbackProgram
		? {
				tipo: orgCashbackProgram.resgateLimiteTipo,
				valor: orgCashbackProgram.resgateLimiteValor,
			}
		: null;

	return (
		<OrgColorsProvider 
			corPrimaria={org.corPrimaria} 
			corPrimariaForeground={org.corPrimariaForeground}
			corSecundaria={org.corSecundaria}
			corSecundariaForeground={org.corSecundariaForeground}
		>
			<NewCashbackRedemptionContent org={org} clientId={clientId} redemptionLimit={redemptionLimit} />
		</OrgColorsProvider>
	);
}
