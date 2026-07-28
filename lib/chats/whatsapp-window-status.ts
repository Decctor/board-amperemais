/**
 * Estado da janela de 24h do WhatsApp.
 *
 * A janela é uma regra da Meta Cloud API: fora dela, só templates aprovados podem ser
 * enviados, e apenas uma resposta do cliente a reabre. Conexões `INTERNAL_GATEWAY` não
 * têm janela — a sessão do gateway ou está ativa, ou o envio falha por outro motivo.
 *
 * Substitui a coluna `chats.status` (ABERTA/FECHADA), removida na migration 0053.
 */

/** Abaixo deste tempo restante a janela é exibida como "expirando". */
const WINDOW_EXPIRY_SOON_MS = 2 * 60 * 60 * 1000;

export type TWhatsappWindowVariant = "gateway" | "aberta" | "expirando" | "expirada";

export type TWhatsappWindowDisplay = {
	variant: TWhatsappWindowVariant;
	label: string;
	/** Se false, o envio de mensagem livre é recusado pela rota; só template passa. */
	canSendFreeform: boolean;
};

function formatRemaining(msRemaining: number) {
	const totalMinutes = Math.max(1, Math.floor(msRemaining / 60_000));
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	if (hours > 0) return minutes > 0 ? `${hours}h${String(minutes).padStart(2, "0")}` : `${hours}h`;
	return `${minutes} min`;
}

export function getWhatsappWindowDisplay({
	expiracao,
	tipoConexao,
	now = new Date(),
}: {
	expiracao: Date | string | null | undefined;
	tipoConexao: "META_CLOUD_API" | "INTERNAL_GATEWAY" | null | undefined;
	now?: Date;
}): TWhatsappWindowDisplay {
	if (tipoConexao === "INTERNAL_GATEWAY") {
		return { variant: "gateway", label: "Sessão ativa", canSendFreeform: true };
	}

	if (!expiracao) return { variant: "expirada", label: "Janela expirada", canSendFreeform: false };

	const expiracaoMs = new Date(expiracao).getTime();
	const msRemaining = expiracaoMs - now.getTime();
	if (msRemaining <= 0) return { variant: "expirada", label: "Janela expirada", canSendFreeform: false };

	if (msRemaining <= WINDOW_EXPIRY_SOON_MS) {
		return { variant: "expirando", label: `Janela expira em ${formatRemaining(msRemaining)}`, canSendFreeform: true };
	}

	return { variant: "aberta", label: "Janela aberta", canSendFreeform: true };
}

/** Versão server-side, sem formatação: é a regra que a rota de envio aplica. */
export function isWhatsappWindowOpen({
	expiracao,
	tipoConexao,
	now = new Date(),
}: {
	expiracao: Date | null | undefined;
	tipoConexao: "META_CLOUD_API" | "INTERNAL_GATEWAY" | null | undefined;
	now?: Date;
}) {
	if (tipoConexao === "INTERNAL_GATEWAY") return true;
	return !!expiracao && expiracao.getTime() > now.getTime();
}
