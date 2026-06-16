"use client";

import { CommunityHeader } from "@/components/Community/CommunityHeader";
import { CommunityPageShell } from "@/components/Community/CommunityPageShell";
import { CourseContentOutline } from "@/components/Community/CourseContentOutline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ACCESS_CONFIG, findLessonContext, type TCourseSection, formatTotalDuration, getTotalDurationSeconds, getTotalLessons } from "@/lib/community";
import { useCourseDetail, useUserProgress } from "@/lib/queries/community";
import { useUserSession } from "@/lib/queries/session";
import { BookOpen, Check, Clock, PlayCircle, Share2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { use, useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

export default function CourseDetailPage({ params }: { params: Promise<{ courseId: string }> }) {
	const { courseId } = use(params);
	const { data: course, isLoading, error } = useCourseDetail(courseId);
	const { data: session } = useUserSession();
	const { data: progress = [] } = useUserProgress(courseId, { enabled: !!session });
	const [copied, setCopied] = useState(false);

	const handleShare = useCallback(async () => {
		try {
			await navigator.clipboard.writeText(window.location.href);
			setCopied(true);
			toast.success("Link copiado!");
			setTimeout(() => setCopied(false), 2000);
		} catch {
			toast.error("Não foi possível copiar o link.");
		}
	}, []);

	const completedLessonIds = useMemo(
		() => new Set(progress.filter((entry) => entry.concluido).map((entry) => entry.aulaId)),
		[progress],
	);

	const resumeLessonId = useMemo(() => {
		const inProgress = progress
			.filter((entry) => !entry.concluido)
			.toSorted(
				(a, b) => new Date(b.dataUltimaVisualizacao).getTime() - new Date(a.dataUltimaVisualizacao).getTime(),
			)[0];
		return inProgress?.aulaId ?? null;
	}, [progress]);

	if (isLoading) {
		return (
			<CommunityPageShell className="animate-pulse space-y-6">
				<div className="h-4 w-48 rounded bg-muted" />
				<div className="flex flex-col gap-6 lg:flex-row">
					<div className="aspect-video shrink-0 rounded-xl bg-muted lg:w-[420px]" />
					<div className="flex-1 space-y-3">
						<div className="h-8 w-2/3 rounded bg-muted" />
						<div className="h-4 w-full rounded bg-muted" />
						<div className="h-10 w-40 rounded-full bg-muted" />
					</div>
				</div>
			</CommunityPageShell>
		);
	}

	if (error || !course) {
		return (
			<CommunityPageShell className="flex min-h-[50vh] items-center justify-center">
				<div className="text-center">
					<div className="mx-auto mb-4 w-fit rounded-full bg-primary/10 p-5">
						<BookOpen className="size-10 text-foreground/50" />
					</div>
					<h2 className="mb-2 text-lg font-semibold">Curso não encontrado</h2>
					<p className="mb-4 text-sm text-muted-foreground">Este curso não está disponível ou não existe.</p>
					<Button variant="outline" asChild size="sm">
						<Link href="/community/courses">Voltar para cursos</Link>
					</Button>
				</div>
			</CommunityPageShell>
		);
	}

	const totalLessons = getTotalLessons(course);
	const totalDurationSec = getTotalDurationSeconds(course);
	const totalDuration = formatTotalDuration(totalDurationSec);
	const accessConfig = ACCESS_CONFIG[course.nivelAcesso as keyof typeof ACCESS_CONFIG];
	const AccessIcon = accessConfig.icon;
	const firstLesson = course.secoes?.[0]?.aulas?.[0];
	const sections = (course.secoes ?? []) as TCourseSection[];
	const ctaLessonId = resumeLessonId ?? firstLesson?.id ?? null;
	const ctaLabel = resumeLessonId ? "Continuar" : "Começar agora";
	const resumeContext = resumeLessonId ? findLessonContext([course], resumeLessonId) : null;

	return (
		<CommunityPageShell className="flex flex-col gap-8">
			<CommunityHeader
				breadcrumbs={[{ label: "Início", href: "/community" }, { label: "Cursos", href: "/community/courses" }, { label: course.titulo }]}
			/>

			<div className="flex flex-col gap-6 lg:flex-row">
				<div className="relative aspect-video shrink-0 overflow-hidden rounded-2xl border border-border bg-primary/5 lg:aspect-[4/3] lg:w-[400px]">
					{course.thumbnailUrl ? (
						<Image src={course.thumbnailUrl} alt={course.titulo} fill className="object-cover" />
					) : (
						<div className="flex h-full w-full items-center justify-center">
							<BookOpen className="size-16 text-foreground/15" />
						</div>
					)}
				</div>

				<div className="flex flex-1 flex-col gap-4">
					<div>
						<h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">{course.titulo}</h1>
						<div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
							<span className="flex items-center gap-1.5">
								<BookOpen className="size-3.5" />
								{totalLessons} {totalLessons === 1 ? "aula" : "aulas"}
							</span>
							{totalDuration ? (
								<span className="flex items-center gap-1.5">
									<Clock className="size-3.5" />
									{totalDuration}
								</span>
							) : null}
							<Badge className={`${accessConfig.badgeClassName} border-0 px-2 py-0.5 text-[10px]`}>
								<AccessIcon className="mr-1 size-2.5" />
								{accessConfig.label}
							</Badge>
						</div>
					</div>

					{course.descricao ? <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{course.descricao}</p> : null}

					{resumeContext ? (
						<p className="text-xs text-muted-foreground">
							Última aula: <span className="font-medium text-foreground">{resumeContext.lesson.titulo}</span>
						</p>
					) : null}

					<div className="flex items-center gap-3">
						{ctaLessonId ? (
							<Button asChild className="rounded-full px-6">
								<Link href={`/community/courses/${courseId}/lessons/${ctaLessonId}`}>
									<PlayCircle className="mr-2 size-4" />
									{ctaLabel}
								</Link>
							</Button>
						) : null}
						<Button variant="outline" size="icon" className="rounded-full" onClick={handleShare} aria-label="Compartilhar curso">
							{copied ? <Check className="size-4" /> : <Share2 className="size-4" />}
						</Button>
					</div>
				</div>
			</div>

			<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
				<div className="flex flex-col gap-4">
					<div>
						<h2 className="text-sm font-extrabold tracking-tight">Sobre o curso</h2>
						<p className="mt-2 text-sm leading-relaxed text-muted-foreground">
							{course.descricao ?? "Este curso ainda não possui descrição detalhada."}
						</p>
					</div>
					<div className="text-xs text-muted-foreground">
						{sections.length} {sections.length === 1 ? "seção" : "seções"} · {totalLessons} {totalLessons === 1 ? "aula" : "aulas"}
						{totalDuration ? ` · ${totalDuration}` : ""}
					</div>
				</div>

				<div className="overflow-hidden rounded-2xl border border-border bg-card">
					<div className="border-b border-border px-4 py-3">
						<h2 className="text-sm font-extrabold tracking-tight">Conteúdo do curso</h2>
					</div>
					<div className="max-h-[60vh] overflow-y-auto p-3 scrollbar-thin scrollbar-track-primary/10 scrollbar-thumb-primary/30">
						<CourseContentOutline
							courseId={courseId}
							sections={sections}
							completedLessonIds={completedLessonIds}
							compact
						/>
					</div>
				</div>
			</div>
		</CommunityPageShell>
	);
}
