import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { db } from "@/services/drizzle";
import { cashbackPrograms, organizationMembers, organizations } from "@/services/drizzle/schema";
import { count, eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";

export type TOnboardingQualityStep = {
	id: string;
	title: string;
	description: string;
	completed: boolean;
	actionUrl: string;
	actionLabel: string;
	applicable: boolean;
};

export type TGetOnboardingQualityOutput = {
	data: {
		steps: TOnboardingQualityStep[];
		completedCount: number;
		totalApplicable: number;
		percentComplete: number;
		allCompleted: boolean;
	};
};

async function getOnboardingQuality({ session }: { session: TAuthUserSession }): Promise<TGetOnboardingQualityOutput> {
	const membershipOrg = session.membership?.organizacao;
	if (!membershipOrg) {
		throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");
	}

	const orgId = membershipOrg.id;

	// Fetch full organization data from database to get all fields
	const organization = await db.query.organizations.findFirst({
		where: (fields, { eq }) => eq(fields.id, orgId),
	});

	if (!organization) {
		throw new createHttpError.NotFound("Organização não encontrada.");
	}

	const configuration = organization.configuracao;
	const steps: TOnboardingQualityStep[] = [];

	// Step 1: Integration (conditional on configuracao.recursos.integracoes.acesso)
	const hasIntegrationAccess = configuration?.recursos?.integracoes?.acesso ?? false;
	if (hasIntegrationAccess) {
		const hasIntegration = !!organization.integracaoTipo && !!organization.integracaoConfiguracao;
		steps.push({
			id: "integration",
			title: "Configurar integração",
			description: "Conecte seu sistema de vendas para sincronizar dados automaticamente.",
			completed: hasIntegration,
			actionUrl: "/dashboard/settings?view=integration",
			actionLabel: "Configurar",
			applicable: true,
		});
	}

	// Step 2: Cashback Program
	const cashbackProgram = await db.query.cashbackPrograms.findFirst({
		where: (fields, { eq }) => eq(fields.organizacaoId, orgId),
	});

	const hasCashbackProgram = !!cashbackProgram;

	steps.push({
		id: "cashback",
		title: "Criar programa de cashback",
		description: "Configure um programa de cashback para fidelizar seus clientes.",
		completed: hasCashbackProgram,
		actionUrl: "/dashboard/commercial/cashback-programs",
		actionLabel: "Criar",
		applicable: true,
	});

	// Step 3: Connect your Whatsapp number
	const isThereAnyWhatsappConnection = await db.query.whatsappConnections.findFirst({
		where: (fields, { eq }) => eq(fields.organizacaoId, orgId),
	});
	const hasAnyWhatsappConnection = !!isThereAnyWhatsappConnection;
	steps.push({
		id: "whatsapp",
		title: "Conecte seu número de WhatsApp",
		description: "Conecte seu número de WhatsApp para começar a usar a plataforma.",
		completed: hasAnyWhatsappConnection,
		actionUrl: "/dashboard/settings?view=meta-oauth",
		actionLabel: "Conectar",
		applicable: true,
	});

	// Step 4: Create your first client
	const isThereAnyClient = await db.query.clients.findFirst({
		where: (fields, { eq }) => eq(fields.organizacaoId, orgId),
	});
	const hasAnyClient = !!isThereAnyClient;
	steps.push({
		id: "clients",
		title: "Cadastre seu 1º Cliente",
		description: "Crie seu primeiro cliente para começar a usar a plataforma.",
		completed: hasAnyClient,
		actionUrl: "/dashboard/commercial/clients",
		actionLabel: "Criar",
		applicable: true,
	});

	// Step 5: Create your first sale
	const isThereAnySale = await db.query.sales.findFirst({
		where: (fields, { eq }) => eq(fields.organizacaoId, orgId),
	});
	const hasAnySale = !!isThereAnySale;
	steps.push({
		id: "sales",
		title: "Faça sua 1º Venda",
		description: "Faça sua primeira venda para começar a usar a plataforma.",
		completed: hasAnySale,
		actionUrl: "/dashboard/commercial/sales",
		actionLabel: "Criar",
		applicable: true,
	});

	// Step 6: Members Invited (count >= 4: creator + 3 invited members)
	const [membersCountResult] = await db.select({ count: count() }).from(organizationMembers).where(eq(organizationMembers.organizacaoId, orgId));

	const membersCount = membersCountResult?.count ?? 0;
	const hasEnoughMembers = membersCount >= 4;

	steps.push({
		id: "members",
		title: "Convidar membros",
		description: "Adicione sua equipe para colaborar na plataforma. Convide pelo menos 3 membros.",
		completed: hasEnoughMembers,
		actionUrl: "/dashboard/settings?view=users",
		actionLabel: "Convidar",
		applicable: true,
	});

	// Calculate summary
	const applicableSteps = steps.filter((step) => step.applicable);
	const completedSteps = applicableSteps.filter((step) => step.completed);
	const completedCount = completedSteps.length;
	const totalApplicable = applicableSteps.length;
	const percentComplete = totalApplicable > 0 ? Math.round((completedCount / totalApplicable) * 100) : 100;
	const allCompleted = completedCount === totalApplicable;

	return {
		data: {
			steps: applicableSteps,
			completedCount,
			totalApplicable,
			percentComplete,
			allCompleted,
		},
	};
}

async function getOnboardingQualityRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");

	const result = await getOnboardingQuality({ session });
	return NextResponse.json(result, { status: 200 });
}

export const GET = appApiHandler({
	GET: getOnboardingQualityRoute,
});
