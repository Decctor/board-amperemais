import type { TInteractionChannelEnum } from "@/schemas/enums";
import { Handshake, Mail, MessageCircle, MessageSquareText, Phone, Store } from "lucide-react";
import type { ReactNode } from "react";

export const INTERACTION_CHANNEL_META: Record<TInteractionChannelEnum, { label: string; icon: ReactNode }> = {
	WHATSAPP: { label: "WhatsApp", icon: <MessageCircle className="h-3.5 w-3.5 min-h-3.5 min-w-3.5" /> },
	LIGACAO: { label: "Ligação", icon: <Phone className="h-3.5 w-3.5 min-h-3.5 min-w-3.5" /> },
	PRESENCIAL: { label: "Presencial", icon: <Store className="h-3.5 w-3.5 min-h-3.5 min-w-3.5" /> },
	VISITA: { label: "Visita", icon: <Handshake className="h-3.5 w-3.5 min-h-3.5 min-w-3.5" /> },
	EMAIL: { label: "E-mail", icon: <Mail className="h-3.5 w-3.5 min-h-3.5 min-w-3.5" /> },
	SMS: { label: "SMS", icon: <MessageSquareText className="h-3.5 w-3.5 min-h-3.5 min-w-3.5" /> },
	OUTRO: { label: "Outro", icon: <MessageSquareText className="h-3.5 w-3.5 min-h-3.5 min-w-3.5" /> },
};

// Canais oferecidos no registro manual (EMAIL/SMS/OUTRO existem no schema, mas não são o
// dia a dia do balcão — mantemos o formulário enxuto).
export const REGISTER_CHANNELS: TInteractionChannelEnum[] = ["WHATSAPP", "LIGACAO", "PRESENCIAL", "VISITA"];

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
