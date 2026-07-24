import { hashPublicToken, resolveServiceSettings } from "@/lib/tabs";
import { db } from "@/services/drizzle";
import { MapPin, UtensilsCrossed } from "lucide-react";
import { PublicOrderMenu, type TPublicMenuProduct } from "../../_components/PublicOrderMenu";

// ============================================================================
// QR do PONTO (duravel, impresso na mesa): identifica o servicePoint, abre o
// cardapio e permite SOLICITAR pedido conforme a politica da organizacao.
// Por privacidade, NUNCA exibe itens/total de tabs abertas — uma foto antiga
// do QR da mesa nao da acesso ao consumo atual.
// ============================================================================

export default async function ServicePointPublicPage({ params }: { params: Promise<{ token: string }> }) {
	const { token } = await params;
	const tokenHash = hashPublicToken(token);

	const servicePoint = await db.query.servicePoints.findFirst({
		where: (fields, { and, eq }) => and(eq(fields.tokenPublicoHash, tokenHash), eq(fields.ativo, true)),
		columns: { id: true, rotulo: true, grupo: true, organizacaoId: true },
		with: {
			organizacao: { columns: { id: true, nome: true, logoUrl: true } },
		},
	});

	if (!servicePoint) {
		return (
			<PublicShell title="QR Code inválido">
				<p className="text-center text-sm text-muted-foreground">Este QR Code não é válido ou foi desativado. Chame um atendente.</p>
			</PublicShell>
		);
	}

	const settings = await resolveServiceSettings({ orgId: servicePoint.organizacaoId });
	const orderingEnabled = settings.pedidosCliente !== "DESABILITADO";

	const products = orderingEnabled
		? await db.query.products.findMany({
				where: (fields, { and, eq }) => and(eq(fields.organizacaoId, servicePoint.organizacaoId), eq(fields.ativo, true)),
				columns: { id: true, nome: true, grupo: true, precoVenda: true, imagemCapaUrl: true },
				with: {
					variantes: {
						where: (fields, { eq }) => eq(fields.ativo, true),
						columns: { id: true, nome: true, precoVenda: true },
					},
				},
				orderBy: (fields, { asc }) => asc(fields.nome),
			})
		: [];

	return (
		<PublicShell title={servicePoint.organizacao?.nome ?? "Cardápio"} subtitle={`${servicePoint.rotulo}${servicePoint.grupo ? ` · ${servicePoint.grupo}` : ""}`}>
			{orderingEnabled ? (
				<PublicOrderMenu token={token} contexto="PONTO" products={products as TPublicMenuProduct[]} />
			) : (
				<p className="text-center text-sm text-muted-foreground py-8">
					Pedidos pelo celular não estão habilitados neste estabelecimento. Chame um atendente para fazer seu pedido.
				</p>
			)}
		</PublicShell>
	);
}

function PublicShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
	return (
		<main className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-4 px-4 py-6">
			<header className="flex flex-col items-center gap-1 text-center">
				<UtensilsCrossed className="h-6 w-6" />
				<h1 className="text-lg font-bold tracking-tight">{title}</h1>
				{subtitle ? (
					<p className="flex items-center gap-1 text-xs font-medium uppercase text-muted-foreground">
						<MapPin className="h-3 w-3" />
						{subtitle}
					</p>
				) : null}
			</header>
			{children}
		</main>
	);
}
