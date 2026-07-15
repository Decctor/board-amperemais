import { WhatsappIcon } from "@/components/icons";
import type { TInteractionChannelEnum } from "@/schemas/enums";
import { Handshake, Mail, MessageSquareText, Phone, Store } from "lucide-react";
import type { ReactNode } from "react";

export const INTERACTION_CHANNEL_META: Record<TInteractionChannelEnum, { label: string; icon: ReactNode }> = {
	WHATSAPP: { label: "WhatsApp", icon: <WhatsappIcon className="h-3.5 w-3.5 min-h-3.5 min-w-3.5" /> },
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
