import ErrorComponent from "@/components/Layouts/ErrorComponent";
import { OrgColorsProvider } from "@/components/Providers/OrgColorsProvider";
import { Button } from "@/components/ui/button";
import { getCurrentSession } from "@/lib/authentication/session";
import { db } from "@/services/drizzle";
import { Plus } from "lucide-react";
import Link from "next/link";
import { MdOutlineError } from "react-icons/md";
import PointOfInteractionContent from "./point-of-interaction-page";

export default async function PointOfInteraction({
	params,
	searchParams,
}: {
	params: Promise<{ orgId: string }>;
	searchParams: Promise<{ mode?: string; flow?: string; sellerId?: string }>;
}) {
	const { orgId } = await params;
	const { mode, flow, sellerId } = await searchParams;
	const interfaceMode = mode === "mobile" ? "mobile" : "kiosk";
	// flow controla o destino pós-identificação/cadastro: "transaction" (caixa, padrão)
	// ou "profile" (clube de benefícios — QR de mesa, link do vendedor no salão).
	const interfaceFlow = flow === "profile" ? "profile" : "transaction";

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
		},
	});
	if (!org) {
		return <ErrorComponent msg="Organização não encontrada" />;
	}

	// Link pessoal do vendedor (salão): pré-atribui o "quem te atendeu" no cadastro.
	// Validado aqui contra a org; id inválido/inativo é simplesmente ignorado.
	const presetSeller = sellerId
		? await db.query.sellers.findFirst({
				where: (fields, { and, eq }) => and(eq(fields.id, sellerId), eq(fields.organizacaoId, orgId), eq(fields.ativo, true)),
				columns: { id: true },
			})
		: null;

	const cashbackProgram = await db.query.cashbackPrograms.findFirst({
		where: (fields, { eq }) => eq(fields.organizacaoId, orgId),
	});
	if (!cashbackProgram) {
		return (
			<div className="w-full h-full flex flex-col gap-2 items-center justify-center">
				<div className="flex flex-col items-center justify-center">
					<MdOutlineError className="w-12 h-12 text-destructive" />
					<p className="text-sm font-medium italic text-muted-foreground">Programa de cashback não encontrado</p>
				</div>
				{session?.membership?.organizacao.id === orgId ? (
					<div className="w-full flex items-center justify-center">
						<Button size="sm" asChild>
							<Link href={"/dashboard/growth/cashback"}>
								<Plus className="w-4 h-4" />
								CONFIGURAR PROGRAMA DE CASHBACK
							</Link>
						</Button>
					</div>
				) : null}
			</div>
		);
	}

	return (
		<OrgColorsProvider
			corPrimaria={org.corPrimaria}
			corPrimariaForeground={org.corPrimariaForeground}
			corSecundaria={org.corSecundaria}
			corSecundariaForeground={org.corSecundariaForeground}
		>
			<PointOfInteractionContent
				org={org}
				cashbackProgram={cashbackProgram}
				mode={interfaceMode}
				flow={interfaceFlow}
				presetSellerId={presetSeller?.id ?? null}
			/>
		</OrgColorsProvider>
	);
}
