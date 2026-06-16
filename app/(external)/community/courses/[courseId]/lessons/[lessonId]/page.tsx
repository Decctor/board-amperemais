"use client";

import { CommunityHeader } from "@/components/Community/CommunityHeader";
import { LessonSidebarOutline } from "@/components/Community/LessonSidebarOutline";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TCourseSection } from "@/lib/community";
import { updateProgress } from "@/lib/mutations/community";
import { useCourseDetail, useLesson, useUserProgress } from "@/lib/queries/community";
import { useUserSession } from "@/lib/queries/session";
import MuxPlayer from "@mux/mux-player-react";
import { BookOpen, ChevronLeft, ChevronRight, List, PanelRightClose, PanelRightOpen, PlayCircle } from "lucide-react";
import Link from "next/link";
import { parseAsStringEnum, useQueryState } from "nuqs";
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";

export default function LessonViewerPage({ params }: { params: Promise<{ courseId: string; lessonId: string }> }) {
	const { courseId, lessonId } = use(params);
	const { data: lesson, isLoading: lessonLoading } = useLesson(lessonId);
	const { data: course } = useCourseDetail(courseId);
	const { data: session } = useUserSession();
	const { data: progress = [] } = useUserProgress(courseId, { enabled: !!session });
	const [sidebarOpen, setSidebarOpen] = useState(true);
	const [activeTab, setActiveTab] = useQueryState("tab", parseAsStringEnum(["overview", "content"]));
	const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
	const currentTimeRef = useRef(0);

	// Build flat lesson list for navigation
	const flatLessons = useMemo(() => {
		if (!course?.secoes) return [];
		return course.secoes.flatMap((s: any) =>
			(s.aulas ?? []).map((a: any) => ({
				id: a.id,
				titulo: a.titulo,
				tipoConteudo: a.tipoConteudo,
				duracaoSegundos: a.duracaoSegundos,
				secaoTitulo: s.titulo,
				secaoId: s.id,
			})),
		);
	}, [course]);

	const currentIndex = flatLessons.findIndex((l: any) => l.id === lessonId);
	const prevLesson = currentIndex > 0 ? flatLessons[currentIndex - 1] : null;
	const nextLesson = currentIndex < flatLessons.length - 1 ? flatLessons[currentIndex + 1] : null;

	const completedLessonIds = useMemo(
		() => new Set(progress.filter((entry) => entry.concluido).map((entry) => entry.aulaId)),
		[progress],
	);

	// Save progress periodically
	const saveProgress = useCallback(
		(completed = false) => {
			if (!lessonId) return;
			updateProgress({
				aulaId: lessonId,
				concluido: completed,
				progressoSegundos: Math.floor(currentTimeRef.current),
			}).catch(() => {});
		},
		[lessonId],
	);

	// Start progress saving interval
	useEffect(() => {
		progressIntervalRef.current = setInterval(() => {
			if (currentTimeRef.current > 0) saveProgress(false);
		}, 30000);

		return () => {
			if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
			if (currentTimeRef.current > 0) saveProgress(false);
		};
	}, [saveProgress]);

	// Handle video time update
	const handleTimeUpdate = useCallback((e: any) => {
		currentTimeRef.current = e.detail ?? e.target?.currentTime ?? 0;
	}, []);

	// Handle video ended
	const handleVideoEnded = useCallback(() => {
		saveProgress(true);
	}, [saveProgress]);

	if (lessonLoading) {
		return (
			<div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
				<div className="animate-pulse space-y-4 rounded-2xl border border-border bg-card p-4">
					<div className="aspect-video rounded-xl bg-muted" />
					<div className="space-y-3">
						<div className="h-6 w-2/3 rounded bg-muted" />
						<div className="h-4 w-full rounded bg-muted" />
					</div>
				</div>
			</div>
		);
	}

	if (!lesson) {
		return (
			<div className="flex min-h-[50vh] items-center justify-center px-4">
				<div className="text-center">
					<div className="rounded-full bg-primary/10 p-5 w-fit mx-auto mb-4">
						<BookOpen className="w-10 h-10 text-foreground/50" />
					</div>
					<h2 className="text-lg font-semibold mb-2">Aula não encontrada</h2>
					<Button variant="outline" asChild size="sm">
						<Link href={`/community/courses/${courseId}`}>Voltar ao curso</Link>
					</Button>
				</div>
			</div>
		);
	}

	const hasVideo = lesson.tipoConteudo === "VIDEO" || lesson.tipoConteudo === "VIDEO_TEXTO";
	const hasText = lesson.tipoConteudo === "TEXTO" || lesson.tipoConteudo === "VIDEO_TEXTO";
	const sections = (course?.secoes ?? []) as TCourseSection[];

	const breadcrumbs = course
		? [
				{ label: "Início", href: "/community" },
				{ label: "Cursos", href: "/community/courses" },
				{ label: course.titulo, href: `/community/courses/${courseId}` },
				{ label: lesson.titulo },
			]
		: [{ label: "Início", href: "/community" }, { label: "Cursos", href: "/community/courses" }, { label: lesson.titulo }];

	return (
		<div className="mx-auto flex h-[calc(100dvh-7rem)] max-w-6xl flex-col px-4 pb-4 sm:px-6">
			<div className="shrink-0 py-3">
				<CommunityHeader breadcrumbs={breadcrumbs} />
			</div>

			<div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card lg:flex-row">
				<div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
					{hasVideo && lesson.muxPlaybackId ? (
						<div className="w-full shrink-0 bg-black lg:rounded-tl-2xl">
							<MuxPlayer
								streamType="on-demand"
								playbackId={lesson.muxPlaybackId}
								metadata={{ video_title: lesson.titulo }}
								accentColor="hsl(var(--primary))"
								style={{ width: "100%", aspectRatio: "16/9" }}
								onTimeUpdate={handleTimeUpdate}
								onEnded={handleVideoEnded}
							/>
						</div>
					) : null}

					{hasVideo && !lesson.muxPlaybackId ? (
						<div className="flex aspect-video w-full shrink-0 items-center justify-center bg-muted lg:rounded-tl-2xl">
							<div className="text-center">
								<PlayCircle className="w-12 h-12 text-muted-foreground/50 mx-auto mb-2" />
								<p className="text-sm text-muted-foreground">
									{lesson.muxAssetStatus === "PROCESSANDO"
										? "Vídeo em processamento..."
										: lesson.muxAssetStatus === "ERRO"
											? "Erro no processamento do vídeo"
											: "Vídeo indisponível"}
								</p>
							</div>
						</div>
					) : null}

					<div className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
						<div className="flex items-start justify-between gap-3">
							<div className="flex min-w-0 flex-col gap-1">
								<p className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">{course?.titulo}</p>
								<h1 className="mt-1 text-xl font-extrabold tracking-tight sm:text-2xl">{lesson.titulo}</h1>
								{lesson.descricao ? <p className="mt-2 text-sm text-muted-foreground">{lesson.descricao}</p> : null}
							</div>
							<div className="flex shrink-0 items-center gap-2">
								{course ? (
									<Sheet>
										<SheetTrigger asChild>
											<Button variant="outline" size="sm" className="rounded-full lg:hidden">
												<List className="mr-1.5 size-4" />
												Sumário
											</Button>
										</SheetTrigger>
										<SheetContent side="bottom" className="h-[72vh] rounded-t-2xl px-0">
											<SheetHeader className="px-4 pb-2 text-left">
												<SheetTitle className="text-base font-extrabold">Conteúdo do curso</SheetTitle>
											</SheetHeader>
											<div className="overflow-y-auto px-2 pb-6">
												<LessonSidebarOutline
													courseId={courseId}
													courseTitle={course.titulo}
													sections={sections}
													activeLessonId={lessonId}
													completedLessonIds={completedLessonIds}
												/>
											</div>
										</SheetContent>
									</Sheet>
								) : null}
								<Button
									variant="ghost"
									size="icon"
									className="hidden lg:flex"
									onClick={() => setSidebarOpen(!sidebarOpen)}
									aria-label="Alternar sumário"
								>
									{sidebarOpen ? <PanelRightClose className="size-4" /> : <PanelRightOpen className="size-4" />}
								</Button>
							</div>
						</div>

						{/* Tabs: Overview / Content */}
						{hasText && lesson.conteudoTexto ? (
							<Tabs value={activeTab ?? "overview"} onValueChange={(v: string) => setActiveTab(v as "overview" | "content")}>
								<TabsList className="w-fit h-fit rounded-lg px-1 py-1">
									<TabsTrigger value="overview" className="text-xs px-3 py-1.5">
										Visão Geral
									</TabsTrigger>
									<TabsTrigger value="content" className="text-xs px-3 py-1.5">
										Conteúdo
									</TabsTrigger>
								</TabsList>

								<TabsContent value="overview" className="mt-4">
									{lesson.descricao && <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{lesson.descricao}</p>}
								</TabsContent>

								<TabsContent value="content" className="mt-4">
									<div className="prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: lesson.conteudoTexto }} />
								</TabsContent>
							</Tabs>
						) : null}

						<div className="mt-auto flex items-center justify-between border-t border-border pt-4">
							{prevLesson ? (
								<Link
									href={`/community/courses/${courseId}/lessons/${prevLesson.id}`}
									className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
								>
									<ChevronLeft className="w-4 h-4 min-w-4 min-h-4" />
									<span className="hidden sm:inline truncate max-w-[200px]">{prevLesson.titulo}</span>
									<span className="sm:hidden">Anterior</span>
								</Link>
							) : (
								<div />
							)}
							{nextLesson ? (
								<Link
									href={`/community/courses/${courseId}/lessons/${nextLesson.id}`}
									className="flex items-center gap-2 text-xs font-medium text-foreground hover:text-foreground/80 transition-colors"
								>
									<span className="hidden sm:inline truncate max-w-[200px]">{nextLesson.titulo}</span>
									<span className="sm:hidden">Próxima</span>
									<ChevronRight className="w-4 h-4 min-w-4 min-h-4" />
								</Link>
							) : (
								<Link
									href={`/community/courses/${courseId}`}
									className="flex items-center gap-2 text-xs font-medium text-foreground hover:text-foreground/80 transition-colors"
								>
									Voltar ao curso
									<ChevronRight className="w-4 h-4 min-w-4 min-h-4" />
								</Link>
							)}
						</div>
					</div>
				</div>

				<aside
					className={`${sidebarOpen ? "w-80" : "w-0 overflow-hidden"} hidden shrink-0 border-l border-border bg-card/50 transition-all duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] lg:block lg:rounded-tr-2xl lg:rounded-br-2xl`}
				>
					{course ? (
						<LessonSidebarOutline
							courseId={courseId}
							courseTitle={course.titulo}
							sections={sections}
							activeLessonId={lessonId}
							completedLessonIds={completedLessonIds}
						/>
					) : null}
				</aside>
			</div>
		</div>
	);
}
