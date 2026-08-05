/**
 * Definição única do template oficial de convite de organização no WhatsApp.
 *
 * Compartilhado entre o script que registra o template na Meta e o código que
 * envia em produção: nome, idioma e nomes de parâmetro precisam bater, e um
 * template aprovado não pode ser corrigido depois — só substituído por outro.
 */
export const ORGANIZATION_INVITE_TEMPLATE_NAME = "recompracrm_organization_invite";
export const ORGANIZATION_INVITE_TEMPLATE_LANGUAGE = "pt_BR";

export const ORGANIZATION_INVITE_EXPIRES_IN_HOURS = 24;

export const ORGANIZATION_INVITE_PARAM_NAMES = {
	convidadoNome: "convidado_nome",
	organizacaoNome: "organizacao_nome",
	expiracao: "expiracao",
} as const;

/**
 * A Meta rejeita corpo que comece ou termine em variável — pontuação depois do
 * `{{...}}` não conta. Por isso o prazo fica no meio e quem fecha o texto é a
 * chamada para ação, sem variável.
 */
export const ORGANIZATION_INVITE_TEMPLATE_BODY_TEXT = `Olá, {{${ORGANIZATION_INVITE_PARAM_NAMES.convidadoNome}}}! Você recebeu um convite para acessar a organização *{{${ORGANIZATION_INVITE_PARAM_NAMES.organizacaoNome}}}* no RecompraCRM.

O convite expira em {{${ORGANIZATION_INVITE_PARAM_NAMES.expiracao}}}. Toque no botão abaixo para aceitar e criar seu acesso.`;

export const ORGANIZATION_INVITE_TEMPLATE_FOOTER_TEXT = "RecompraCRM";
export const ORGANIZATION_INVITE_TEMPLATE_BUTTON_TEXT = "ACEITAR CONVITE";

export const ORGANIZATION_INVITE_ACCEPT_PATH = "/auth/invites/accept";

/**
 * Origem de produção, fixa de propósito: a URL do botão é congelada no momento
 * da aprovação e não varia por envio. Ler de `NEXT_PUBLIC_APP_URL` gravaria o
 * localhost de quem rodou o script dentro do template aprovado.
 */
export const ORGANIZATION_INVITE_PRODUCTION_ORIGIN = "https://recompracrm.com.br";

export function buildOrganizationInviteAcceptUrl({ origin, invitationId }: { origin: string; invitationId: string }) {
	return `${origin.replace(/\/+$/, "")}${ORGANIZATION_INVITE_ACCEPT_PATH}?invitationId=${invitationId}`;
}

export function getOrganizationInviteExpirationLabel() {
	return `${ORGANIZATION_INVITE_EXPIRES_IN_HOURS} horas`;
}
