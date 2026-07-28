import { BrandLogo } from "@/components/Brand/BrandLogo";
import { parseOnboardingAnswers, parseOnboardingStructure, resolveDealOnboardingSituation } from "@/lib/deals/onboarding";
import { formatDateAsLocale, formatToMoney } from "@/lib/formatting";
import { hashPublicToken } from "@/lib/tabs";
import { db } from "@/services/drizzle";
import { DealOnboardingCheckoutButton } from "../_components/DealOnboardingCheckoutButton";
import { DealOnboardingFormClient } from "../_components/DealOnboardingFormClient";

// ============================================================================
// Formulário público de onboarding do deal. Acesso pelo token bruto na URL,
// resolvido por hash (nunca persistido). O branching segue a situação derivada:
// EMITIDO → formulário; PREENCHIDO → só o botão de checkout; CONCLUIDO (deal
// ATIVO) → encerrado; EXPIRADO/CANCELADO → mensagens de indisponibilidade.
// ============================================================================

function DealOnboardingShell({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-8">
			<header className="flex flex-col items-center gap-3 text-center">
				{/* Fundo claro: lockup *-badge preserva o contraste do símbolo (regra do design system). */}
				<BrandLogo lockup="horizontal-badge" tone="color-on-light" className="h-10 w-auto object-contain" priority />
				<h1 className="text-lg font-bold tracking-tight">{title}</h1>
			</header>
			{children}
		</main>
	);
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
	return <p className="py-10 text-center text-sm text-muted-foreground">{children}</p>;
}

export default async function DealOnboardingPublicPage({ params }: { params: Promise<{ token: string }> }) {
	const { token } = await params;
	const tokenHash = hashPublicToken(token);

	const form = await db.query.dealOnboardingForms.findFirst({
		where: (fields, { and, eq, ne }) => and(eq(fields.tokenPublicoHash, tokenHash), ne(fields.status, "CANCELADO")),
		with: { deal: true },
	});

	if (!form || form.deal.status === "CANCELADO") {
		return (
			<DealOnboardingShell title="Link indisponível">
				<CenteredMessage>Este link não é válido ou não está mais disponível. Entre em contato com quem o enviou.</CenteredMessage>
			</DealOnboardingShell>
		);
	}

	const { deal } = form;
	const situacao = resolveDealOnboardingSituation({ form, deal });
	const estrutura = parseOnboardingStructure(form.estrutura);

	if (situacao === "CONCLUIDO") {
		return (
			<DealOnboardingShell title={estrutura.titulo}>
				<CenteredMessage>Tudo certo! O pagamento foi confirmado e suas licenças estão sendo preparadas. Você já pode fechar esta página.</CenteredMessage>
			</DealOnboardingShell>
		);
	}

	if (situacao === "EXPIRADO") {
		return (
			<DealOnboardingShell title={estrutura.titulo}>
				<CenteredMessage>Este link expirou. Entre em contato com quem o enviou para receber um novo.</CenteredMessage>
			</DealOnboardingShell>
		);
	}

	// Resumo comercial exibido em todas as telas ativas. Nunca expor IDs Stripe nem
	// contatos do obtentor — só o necessário para o comprador se reconhecer.
	const resumo = (
		<section className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-card px-4 py-3 text-center">
			<span className="text-sm font-semibold">{deal.nome}</span>
			<span className="text-xs text-muted-foreground">
				{formatToMoney(deal.valorUnitarioCentavos / 100)} × {deal.quantidadeLicencas} licença{deal.quantidadeLicencas > 1 ? "s" : ""} /
				{deal.intervalo === "ANUAL" ? "ano" : "mês"}
			</span>
		</section>
	);

	if (situacao === "PREENCHIDO") {
		return (
			<DealOnboardingShell title={estrutura.titulo}>
				{resumo}
				<section className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card px-4 py-8 text-center">
					<p className="text-sm text-muted-foreground">
						Dados enviados{form.dataPreenchimento ? ` em ${formatDateAsLocale(form.dataPreenchimento)}` : ""}. Falta apenas o pagamento para
						ativar suas licenças.
					</p>
					<DealOnboardingCheckoutButton token={token} />
				</section>
			</DealOnboardingShell>
		);
	}

	return (
		<DealOnboardingShell title={estrutura.titulo}>
			{resumo}
			{estrutura.descricao ? <p className="text-center text-sm text-muted-foreground">{estrutura.descricao}</p> : null}
			<DealOnboardingFormClient
				token={token}
				estrutura={estrutura}
				respostasIniciais={parseOnboardingAnswers(form.respostas)}
				quantidadeLicencas={deal.quantidadeLicencas}
			/>
		</DealOnboardingShell>
	);
}
