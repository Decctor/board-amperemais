// Meta de canais movida para componente compartilhado (usada também pelo NewInteraction).
export { INTERACTION_CHANNEL_META, REGISTER_CHANNELS } from "@/components/Modals/Interactions/channel-meta";

export function buildWhatsappLink(phone: string | null | undefined) {
	if (!phone) return null;
	const digits = phone.replace(/\D/g, "");
	if (!digits) return null;
	const withCountry = digits.length <= 11 ? `55${digits}` : digits;
	return `https://wa.me/${withCountry}`;
}

export function getClientInitials(nome: string) {
	const parts = nome.trim().split(/\s+/);
	const first = parts[0]?.[0] ?? "";
	const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : (parts[0]?.[1] ?? "");
	return `${first}${last}`.toUpperCase();
}
