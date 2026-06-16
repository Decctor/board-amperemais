import type { TCommunityMaterialTypeEnum } from "@/schemas/enums";
import {
	formatDuration,
	formatTotalDuration,
	getTotalDurationSeconds,
	type TCourseSummary,
} from "@/lib/community/helpers";
import type { TCommunityLessonProgressEntity } from "@/services/drizzle/schema";

export const MATERIAL_TYPE_LABELS: Record<TCommunityMaterialTypeEnum, string> = {
	EBOOK: "eBook",
	PLAYBOOK: "Playbook",
	PLANILHA: "Planilha",
	TEMPLATE: "Template",
	GUIA: "Guia",
	CHECKLIST: "Checklist",
	INFOGRAFICO: "Infográfico",
	DOCUMENTO: "Documento",
};

export type TCommunityMaterialSummary = {
	id: string;
	slug?: string | null;
	titulo: string;
	descricao?: string | null;
	tipo: TCommunityMaterialTypeEnum;
	dataInsercao: Date | string;
};

export type TLessonProgress = Pick<
	TCommunityLessonProgressEntity,
	"aulaId" | "concluido" | "progressoSegundos" | "dataUltimaVisualizacao"
>;

export type TQuickAnswerItem = {
	id: string;
	kind: "curso" | "material";
	title: string;
	subtitle?: string;
	meta: string;
	href: string;
};

export type TContinueLearningItem = {
	lessonId: string;
	lessonTitle: string;
	courseId: string;
	courseTitle: string;
	progressPercent: number;
	href: string;
};

export function getMaterialHref(material: Pick<TCommunityMaterialSummary, "id" | "slug" | "tipo">) {
	if (material.slug) return `/community/materials/${material.slug}`;
	if (material.tipo === "EBOOK") return `/community/ebooks/${material.id}`;
	return `/community/documents/${material.id}`;
}

export function findLessonContext(courses: TCourseSummary[], lessonId: string) {
	for (const course of courses) {
		for (const section of course.secoes ?? []) {
			const lesson = section.aulas?.find((a) => a.id === lessonId);
			if (lesson) {
				return {
					course,
					lesson,
					durationSeconds: lesson.duracaoSegundos ?? 0,
				};
			}
		}
	}
	return null;
}

export function getFirstLessonId(course: TCourseSummary) {
	return course.secoes?.[0]?.aulas?.[0]?.id ?? null;
}

export function buildQuickAnswerItems({
	courses,
	materials,
	query,
	limit = 8,
}: {
	courses: TCourseSummary[];
	materials: TCommunityMaterialSummary[];
	query?: string;
	limit?: number;
}): TQuickAnswerItem[] {
	const normalizedQuery = query?.trim().toLowerCase() ?? "";

	const courseItems: TQuickAnswerItem[] = courses
		.filter((course) => {
			if (!normalizedQuery) return true;
			return (
				course.titulo.toLowerCase().includes(normalizedQuery) ||
				course.descricao?.toLowerCase().includes(normalizedQuery)
			);
		})
		.map((course) => {
			const firstLessonId = getFirstLessonId(course);
			const duration = formatTotalDuration(getTotalDurationSeconds(course));
			return {
				id: `course-${course.id}`,
				kind: "curso" as const,
				title: course.titulo,
				subtitle: course.descricao ?? undefined,
				meta: duration ? `Curso · ${duration}` : "Curso",
				href: firstLessonId ? `/community/courses/${course.id}/lessons/${firstLessonId}` : `/community/courses/${course.id}`,
			};
		});

	const materialItems: TQuickAnswerItem[] = materials
		.filter((material) => {
			if (!normalizedQuery) return true;
			return (
				material.titulo.toLowerCase().includes(normalizedQuery) ||
				material.descricao?.toLowerCase().includes(normalizedQuery)
			);
		})
		.map((material) => ({
			id: `material-${material.id}`,
			kind: "material" as const,
			title: material.titulo,
			subtitle: material.descricao ?? undefined,
			meta: MATERIAL_TYPE_LABELS[material.tipo] ?? material.tipo,
			href: getMaterialHref(material),
		}));

	return [...courseItems, ...materialItems].slice(0, limit);
}

export function buildContinueLearningItems({
	progress,
	courses,
	limit = 3,
}: {
	progress: TLessonProgress[];
	courses: TCourseSummary[];
	limit?: number;
}): TContinueLearningItem[] {
	const inProgress = progress
		.filter((entry) => !entry.concluido)
		.toSorted(
			(a, b) =>
				new Date(b.dataUltimaVisualizacao).getTime() - new Date(a.dataUltimaVisualizacao).getTime(),
		);

	const items: TContinueLearningItem[] = [];

	for (const entry of inProgress) {
		const context = findLessonContext(courses, entry.aulaId);
		if (!context) continue;

		const duration = context.durationSeconds;
		const watched = entry.progressoSegundos ?? 0;
		const progressPercent =
			duration > 0 ? Math.min(100, Math.round((watched / duration) * 100)) : entry.concluido ? 100 : 8;

		items.push({
			lessonId: entry.aulaId,
			lessonTitle: context.lesson.titulo,
			courseId: context.course.id,
			courseTitle: context.course.titulo,
			progressPercent: Math.max(progressPercent, 4),
			href: `/community/courses/${context.course.id}/lessons/${entry.aulaId}`,
		});

		if (items.length >= limit) break;
	}

	return items;
}

export function formatLessonProgressLabel(seconds: number | null | undefined, durationSeconds: number) {
	if (!durationSeconds) return formatDuration(seconds) ?? null;
	const watched = seconds ?? 0;
	return `${formatDuration(watched) ?? "0:00"} / ${formatDuration(durationSeconds)}`;
}
