import ErrorComponent from "@/components/Layouts/ErrorComponent";
import { OrgColorsProvider } from "@/components/Providers/OrgColorsProvider";
import { db } from "@/services/drizzle";
import NewSaleContent from "./new-sale-page";

export default async function NewSalePage({
	params,
	searchParams,
}: { params: Promise<{ orgId: string }>; searchParams: Promise<{ clientId?: string; filledOperatorPassword?: string; mode?: string }> }) {
	const { orgId } = await params;
	const { clientId, filledOperatorPassword, mode } = await searchParams;
	const interfaceMode = mode === "mobile" ? "mobile" : "kiosk";
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

	const prizes = await db.query.cashbackProgramPrizes.findMany({
		where: (fields, { and, eq }) => and(eq(fields.organizacaoId, orgId), eq(fields.ativo, true)),
		columns: {
			id: true,
			titulo: true,
			descricao: true,
			imagemCapaUrl: true,
			valor: true,
		},
		with: {
			produto: {
				columns: {
					grupo: true,
					precoVenda: true,
				},
			},
			produtoVariante: {
				columns: {
					precoVenda: true,
				},
			},
		},
	});

	const normalizedPrizes = prizes.flatMap((prize) => {
		const valorVenda = prize.produtoVariante?.precoVenda ?? prize.produto?.precoVenda ?? null;
		if (valorVenda === null || valorVenda === undefined) return [];
		return [{ ...prize, valorVenda }];
	});
	const cashbackProgramConfig = await db.query.cashbackPrograms.findFirst({
		where: (fields, { and, eq }) => and(eq(fields.organizacaoId, orgId), eq(fields.ativo, true)),
		columns: {
			terminologia: true,
			modalidadeDescontosPermitida: true,
			modalidadeRecompensasPermitida: true,
		},
	});

	const orgWithCashbackConfig = {
		...org,
		terminologia: cashbackProgramConfig?.terminologia ?? "DINHEIRO",
		modalidadeDescontosPermitida: cashbackProgramConfig?.modalidadeDescontosPermitida ?? true,
		modalidadeRecompensasPermitida: cashbackProgramConfig?.modalidadeRecompensasPermitida ?? false,
	};

	return (
		<OrgColorsProvider
			corPrimaria={org.corPrimaria}
			corPrimariaForeground={org.corPrimariaForeground}
			corSecundaria={org.corSecundaria}
			corSecundariaForeground={org.corSecundariaForeground}
		>
			<NewSaleContent
				org={orgWithCashbackConfig}
				clientId={clientId}
				prizes={normalizedPrizes}
				initialOperatorPassword={filledOperatorPassword}
				mode={interfaceMode}
			/>
		</OrgColorsProvider>
	);
}
