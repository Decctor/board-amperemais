import { BookOpen, FileText, Globe, GraduationCap, Lock, PlayCircle, Sparkles } from "lucide-react";

// --- Access Level Configuration ---

export const ACCESS_CONFIG = {
	PUBLICO: {
		icon: Globe,
		label: "Público",
		badgeClassName: "border border-primary/20 bg-primary/10 text-primary",
		textClassName: "text-primary",
	},
	AUTENTICADO: {
		icon: Lock,
		label: "Login necessário",
		badgeClassName: "border-0 bg-primary text-primary-foreground",
		textClassName: "text-primary",
	},
	ASSINATURA: {
		icon: Sparkles,
		label: "Assinatura",
		badgeClassName: "border-0 bg-brand text-brand-foreground",
		textClassName: "text-foreground",
	},
} as const;

export type TAccessLevel = keyof typeof ACCESS_CONFIG;

// --- Content Type Icons ---

export const CONTENT_TYPE_ICONS = {
	VIDEO: PlayCircle,
	TEXTO: FileText,
	VIDEO_TEXTO: PlayCircle,
} as const;

export type TContentType = keyof typeof CONTENT_TYPE_ICONS;

// --- Duration Formatting ---

export function formatDuration(seconds: number | null | undefined): string | null {
	if (!seconds) return null;
	const mins = Math.floor(seconds / 60);
	const secs = seconds % 60;
	return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function formatTotalDuration(totalSeconds: number): string | null {
	if (!totalSeconds) return null;
	const hours = Math.floor(totalSeconds / 3600);
	const mins = Math.floor((totalSeconds % 3600) / 60);
	if (hours > 0) return `${hours}h ${mins}min`;
	return `${mins}min`;
}

// --- Course Helpers ---

export type TCourseSection = {
	id: string;
	titulo: string;
	descricao?: string | null;
	ordem?: number;
	aulas?: TCourseLesson[];
};

export type TCourseLesson = {
	id: string;
	titulo: string;
	descricao?: string | null;
	tipoConteudo?: string;
	duracaoSegundos?: number | null;
	ordem?: number;
};

export type TCourseSummary = {
	id: string;
	titulo: string;
	descricao?: string | null;
	thumbnailUrl?: string | null;
	nivelAcesso: TAccessLevel;
	secoes?: TCourseSection[];
};

export function getTotalLessons(course: TCourseSummary): number {
	return course.secoes?.reduce((sum, s) => sum + (s.aulas?.length ?? 0), 0) ?? 0;
}

export function getTotalDurationSeconds(course: TCourseSummary): number {
	return (
		course.secoes?.reduce(
			(sum, s) => sum + (s.aulas?.reduce((aSum, a) => aSum + (a.duracaoSegundos ?? 0), 0) ?? 0),
			0,
		) ?? 0
	);
}

export function getSectionDurationSeconds(section: TCourseSection): number {
	return section.aulas?.reduce((sum, a) => sum + (a.duracaoSegundos ?? 0), 0) ?? 0;
}
