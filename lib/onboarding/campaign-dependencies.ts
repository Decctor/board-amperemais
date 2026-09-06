import {
	OnboardingCampaignPresetsByKey,
	type TOnboardingCampaignPreset,
	type TOnboardingCampaignPresetKey,
} from "@/config/onboarding-campaign-presets";
import type {
	TOnboardingCampaignStateEnum,
	TOnboardingDependencyStatusEnum,
	TOnboardingDependencyTypeEnum,
	TMessageTemplatePhoneStatusEnum,
	TWhatsappPaymentStatusEnum,
} from "@/schemas/enums";
import type { TMessageTemplateMetadata } from "@/schemas/message-templates";

/** Dias de histórico que a campanha de recuperação precisa para localizar candidatos com segurança. */
export const ONBOARDING_RECOVERY_MIN_COVERAGE_DAYS = 90;

export type TOnboardingCampaignDependency = {
	tipo: TOnboardingDependencyTypeEnum;
	status: TOnboardingDependencyStatusEnum;
	/** Frase curta para a lista de dependências. */
	detalhe: string | null;
	/** Ação de correção quando a bola está com o usuário. */
	acao: { rotulo: string; href: string } | null;
};

export type TOnboardingCampaignRow = {
	id: string;
	chavePreset: string;
	titulo: string;
	ativo: boolean;
	whatsappTemplateId: string | null;
	whatsappConexaoTelefoneId: string | null;
};

/** Tudo o que as dependências precisam saber, já resolvido pela prontidão (sem consultas aqui). */
export type TCampaignDependencyContext = {
	whatsapp: {
		numero: "NENHUM" | "CONECTADO" | "EXPIRADO" | "DESCONECTADO";
		tipoConexao: "META_CLOUD_API" | "INTERNAL_GATEWAY" | null;
		telefoneId: string | null;
		pagamento: TWhatsappPaymentStatusEnum | "NAO_APLICAVEL";
	};
	templatesById: Map<string, { status: "RASCUNHO" | "ATIVO" | "ARQUIVADO"; metadados: TMessageTemplateMetadata }>;
	cashbackAtivo: boolean;
	/** Data mais antiga coberta pela base (venda válida mais antiga ou cobertura da carga). Null = sem dados. */
	coberturaInicio: Date | null;
	clientesComAniversario: number;
	saldosCashbackComValidade: number;
	envioHabilitadoPeloUsuario: boolean;
};

const WHATSAPP_SETTINGS_HREF = "/dashboard/settings?view=meta-oauth";
const TEMPLATES_SETTINGS_HREF = "/dashboard/settings?view=message-templates";
const CASHBACK_HREF = "/dashboard/growth/cashback";
const CUSTOMERS_HREF = "/dashboard/customers";

function resolveTemplatePhoneStatus(
	template: { status: "RASCUNHO" | "ATIVO" | "ARQUIVADO"; metadados: TMessageTemplateMetadata } | undefined,
	telefoneId: string | null,
): TMessageTemplatePhoneStatusEnum | null {
	if (!template) return null;
	if (telefoneId) {
		const perPhone = template.metadados.porNumeroTelefone?.[telefoneId];
		if (perPhone) return perPhone.status;
	}
	// Sem entrada para o telefone: o template nunca foi submetido para aquele número.
	return "RASCUNHO";
}

function channelDependency(context: TCampaignDependencyContext): TOnboardingCampaignDependency {
	switch (context.whatsapp.numero) {
		case "CONECTADO":
			return { tipo: "CANAL", status: "OK", detalhe: "Número conectado", acao: null };
		case "EXPIRADO":
			return { tipo: "CANAL", status: "FALHOU", detalhe: "A conexão com a Meta expirou", acao: { rotulo: "Reconectar", href: WHATSAPP_SETTINGS_HREF } };
		case "DESCONECTADO":
			return { tipo: "CANAL", status: "FALHOU", detalhe: "O número está desconectado", acao: { rotulo: "Reconectar", href: WHATSAPP_SETTINGS_HREF } };
		default:
			return {
				tipo: "CANAL",
				status: "PENDENTE",
				detalhe: "Nenhum número conectado",
				acao: { rotulo: "Conectar WhatsApp", href: WHATSAPP_SETTINGS_HREF },
			};
	}
}

function templateDependency(campaign: TOnboardingCampaignRow, context: TCampaignDependencyContext): TOnboardingCampaignDependency {
	// O gateway interno envia texto livre: não há aprovação de template.
	if (context.whatsapp.tipoConexao === "INTERNAL_GATEWAY") {
		return { tipo: "TEMPLATE", status: "NAO_APLICAVEL", detalhe: null, acao: null };
	}
	const template = campaign.whatsappTemplateId ? context.templatesById.get(campaign.whatsappTemplateId) : undefined;
	if (!template)
		return { tipo: "TEMPLATE", status: "FALHOU", detalhe: "Template não encontrado", acao: { rotulo: "Ver templates", href: TEMPLATES_SETTINGS_HREF } };
	if (context.whatsapp.numero !== "CONECTADO") {
		return { tipo: "TEMPLATE", status: "PENDENTE", detalhe: "Será enviado à Meta quando houver um número", acao: null };
	}
	const status = resolveTemplatePhoneStatus(template, context.whatsapp.telefoneId);
	switch (status) {
		case "APROVADO":
			return { tipo: "TEMPLATE", status: "OK", detalhe: "Template aprovado pela Meta", acao: null };
		case "PENDENTE":
			return { tipo: "TEMPLATE", status: "EM_ANALISE", detalhe: "Template em análise pela Meta", acao: null };
		case "REJEITADO":
			return {
				tipo: "TEMPLATE",
				status: "FALHOU",
				detalhe: "Template rejeitado pela Meta",
				acao: { rotulo: "Corrigir template", href: TEMPLATES_SETTINGS_HREF },
			};
		case "PAUSADO":
		case "DESABILITADO":
			return {
				tipo: "TEMPLATE",
				status: "FALHOU",
				detalhe: "Template pausado pela Meta",
				acao: { rotulo: "Ver template", href: TEMPLATES_SETTINGS_HREF },
			};
		default:
			return {
				tipo: "TEMPLATE",
				status: "PENDENTE",
				detalhe: "Template ainda não enviado à Meta",
				acao: { rotulo: "Enviar para aprovação", href: TEMPLATES_SETTINGS_HREF },
			};
	}
}

function paymentDependency(context: TCampaignDependencyContext): TOnboardingCampaignDependency {
	if (context.whatsapp.tipoConexao !== "META_CLOUD_API" || context.whatsapp.pagamento === "NAO_APLICAVEL") {
		return { tipo: "PAGAMENTO", status: "NAO_APLICAVEL", detalhe: null, acao: null };
	}
	switch (context.whatsapp.pagamento) {
		case "VERIFICADO":
			return { tipo: "PAGAMENTO", status: "OK", detalhe: "Pagamento verificado na primeira entrega", acao: null };
		case "CONFIRMADO_PELO_USUARIO":
			return { tipo: "PAGAMENTO", status: "OK", detalhe: "Forma de pagamento confirmada por você", acao: null };
		case "PENDENTE":
			return {
				tipo: "PAGAMENTO",
				status: "FALHOU",
				detalhe: "A Meta recusou um envio por falta de pagamento",
				acao: { rotulo: "Resolver na Meta", href: WHATSAPP_SETTINGS_HREF },
			};
		default:
			return {
				tipo: "PAGAMENTO",
				status: "PENDENTE",
				detalhe: "Confirme a forma de pagamento da conta na Meta",
				acao: { rotulo: "Confirmar", href: WHATSAPP_SETTINGS_HREF },
			};
	}
}

function daysBetween(from: Date, to: Date) {
	return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

function dataDependency(preset: TOnboardingCampaignPreset, context: TCampaignDependencyContext): TOnboardingCampaignDependency {
	const coverageDays = context.coberturaInicio ? daysBetween(context.coberturaInicio, new Date()) : 0;
	switch (preset.key) {
		case "recuperacao":
			if (coverageDays >= ONBOARDING_RECOVERY_MIN_COVERAGE_DAYS) {
				return { tipo: "DADOS", status: "OK", detalhe: `${coverageDays} dias de histórico`, acao: null };
			}
			return {
				tipo: "DADOS",
				status: "PENDENTE",
				detalhe: context.coberturaInicio
					? `Precisa de ${ONBOARDING_RECOVERY_MIN_COVERAGE_DAYS} dias de histórico; há ${coverageDays}`
					: "Precisa de histórico de vendas para localizar clientes sumidos",
				acao: null,
			};
		case "aniversario":
			if (context.clientesComAniversario > 0) {
				return { tipo: "DADOS", status: "OK", detalhe: `${context.clientesComAniversario} clientes com data de aniversário`, acao: null };
			}
			return {
				tipo: "DADOS",
				status: "PENDENTE",
				detalhe: "Nenhum cliente com data de aniversário",
				acao: { rotulo: "Ver clientes", href: CUSTOMERS_HREF },
			};
		case "cashback-expirando":
			if (context.saldosCashbackComValidade > 0) {
				return { tipo: "DADOS", status: "OK", detalhe: "Há saldos com validade", acao: null };
			}
			return { tipo: "DADOS", status: "PENDENTE", detalhe: "Ainda não há saldo de cashback a expirar", acao: null };
		default:
			// Gatilhos de evento futuro: bastam vendas chegando. Aviso quando o histórico é curto,
			// porque a "primeira compra" pode ser só a primeira importada.
			if (context.coberturaInicio && coverageDays < 30) {
				return { tipo: "DADOS", status: "OK", detalhe: "Histórico curto: a primeira compra pode ser só a primeira importada", acao: null };
			}
			return { tipo: "DADOS", status: "OK", detalhe: null, acao: null };
	}
}

function cashbackDependency(preset: TOnboardingCampaignPreset, context: TCampaignDependencyContext): TOnboardingCampaignDependency {
	if (!preset.requiresCashback) return { tipo: "CASHBACK", status: "NAO_APLICAVEL", detalhe: null, acao: null };
	if (context.cashbackAtivo) return { tipo: "CASHBACK", status: "OK", detalhe: "Programa ativo", acao: null };
	return {
		tipo: "CASHBACK",
		status: "PENDENTE",
		detalhe: "Depende do programa de cashback ativo",
		acao: { rotulo: "Ativar cashback", href: CASHBACK_HREF },
	};
}

export function resolveCampaignDependencies({
	campaign,
	context,
}: {
	campaign: TOnboardingCampaignRow;
	context: TCampaignDependencyContext;
}): TOnboardingCampaignDependency[] {
	const preset = OnboardingCampaignPresetsByKey.get(campaign.chavePreset as TOnboardingCampaignPresetKey);
	const dependencies: TOnboardingCampaignDependency[] = [
		channelDependency(context),
		templateDependency(campaign, context),
		paymentDependency(context),
	];
	if (preset) {
		dependencies.push(dataDependency(preset, context), cashbackDependency(preset, context));
	}
	dependencies.push(
		context.envioHabilitadoPeloUsuario
			? { tipo: "LIBERACAO", status: "OK", detalhe: "Envios liberados por você", acao: null }
			: { tipo: "LIBERACAO", status: "PENDENTE", detalhe: "Aguardando você liberar os envios", acao: null },
	);
	return dependencies;
}

/** Pronta = todas as dependências que não são a liberação do usuário estão OK ou não se aplicam. */
export function isCampaignReady(dependencies: TOnboardingCampaignDependency[]) {
	return dependencies
		.filter((dependency) => dependency.tipo !== "LIBERACAO")
		.every((dependency) => dependency.status === "OK" || dependency.status === "NAO_APLICAVEL");
}

export function resolveOnboardingCampaignState({
	campaign,
	dependencies,
}: {
	campaign: TOnboardingCampaignRow;
	dependencies: TOnboardingCampaignDependency[];
}): TOnboardingCampaignStateEnum {
	if (campaign.ativo) return "ATIVA";
	const enabled = dependencies.some((dependency) => dependency.tipo === "LIBERACAO" && dependency.status === "OK");
	if (enabled) return "HABILITADA";
	if (isCampaignReady(dependencies)) return "PRONTA";
	return "PREPARADA";
}
