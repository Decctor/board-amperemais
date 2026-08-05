import {
	Baby,
	Bike,
	Briefcase,
	Building2,
	Cake,
	CalendarDays,
	Car,
	Cat,
	Circle,
	CircleUserRound,
	Coffee,
	Dog,
	Dumbbell,
	GraduationCap,
	Heart,
	Home,
	type LucideIcon,
	Mail,
	MapPin,
	Music,
	PawPrint,
	Phone,
	Plane,
	ShieldCheck,
	ShoppingBasket,
	Smile,
	Sparkles,
	Star,
	Store,
	Tag,
	UserRound,
	Users,
	Utensils,
	Wine,
	Wrench,
} from "lucide-react";

/**
 * Ícones que uma opção de campo personalizado pode declarar em `opcoes[].icone`.
 *
 * Mapa curado, e não resolução dinâmica do pacote inteiro do lucide: o ponto de interação é uma
 * página pública que abre no celular do cliente, e importar o conjunto completo de ícones para
 * honrar uma string do banco custaria centenas de kB a cada cadastro. Mesma escolha (e mesmo
 * formato) de `ClientTagIconMap` em `utils/select-options.tsx`.
 */
export const POI_REGISTRATION_ICON_MAP = {
	Baby,
	Bike,
	Briefcase,
	Building2,
	Cake,
	CalendarDays,
	Car,
	Cat,
	Circle,
	CircleUserRound,
	Coffee,
	Dog,
	Dumbbell,
	GraduationCap,
	Heart,
	Home,
	Mail,
	MapPin,
	Music,
	PawPrint,
	Phone,
	Plane,
	ShieldCheck,
	ShoppingBasket,
	Smile,
	Sparkles,
	Star,
	Store,
	Tag,
	UserRound,
	Users,
	Utensils,
	Wine,
	Wrench,
} satisfies Record<string, LucideIcon>;

export type TPoiRegistrationIconName = keyof typeof POI_REGISTRATION_ICON_MAP;

/**
 * Resolve o ícone declarado numa opção. Chave desconhecida (ou ausente) cai no círculo neutro —
 * uma opção sem ícone reconhecido continua clicável e legível; nunca quebra o cadastro.
 */
export function resolveRegistrationOptionIcon(icone: string | null | undefined): LucideIcon {
	if (!icone) return Circle;
	return POI_REGISTRATION_ICON_MAP[icone as TPoiRegistrationIconName] ?? Circle;
}
