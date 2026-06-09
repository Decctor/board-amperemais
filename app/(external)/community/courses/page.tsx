"use client";

import { CommunityHeader } from "@/components/Community/CommunityHeader";
import { CommunityPageShell } from "@/components/Community/CommunityPageShell";
import { CommunitySearchBar } from "@/components/Community/CommunitySearchBar";
import { ContentListSkeleton } from "@/components/Community/ContentListSkeleton";
import { CourseCard } from "@/components/Community/CourseCard";
import { EmptyContentPlaceholder } from "@/components/Community/EmptyContentPlaceholder";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ACCESS_CONFIG, type TCourseSummary, formatTotalDuration, getTotalDurationSeconds, getTotalLessons } from "@/lib/community-helpers";
import { useCourses } from "@/lib/queries/community";
import { BookOpen, Clock, PlayCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

export default function CoursesListingPage() {
	const { data: coursesData, isLoading } = useCourses();
	const courses = (coursesData as TCourseSummary[] | undefined) ?? [];
	const [searchQuery, setSearchQuery] = useState("");

	const filteredCourses = useMemo(() => {
		const query = searchQuery.trim().toLowerCase();
		if (!query) return courses;
		return courses.filter(
			(c) => c.titulo.toLowerCase().includes(query) || c.descricao?.toLowerCase().includes(query),
		);
	}, [courses, searchQuery]);

	const featuredCourse = !searchQuery.trim() && filteredCourses.length > 0 ? filteredCourses[0] : null;
	const gridCourses = searchQuery.trim() ? filteredCourses : filteredCourses.slice(1);

	return (
		<CommunityPageShell className="flex flex-col gap-8">
			<CommunityHeader breadcrumbs={[{ label: "Início", href: "/community" }, { label: "Cursos" }]} />

			<CommunitySearchBar
				value={searchQuery}
				onChange={setSearchQuery}
				title="Cursos"
				description="Aprenda com vídeos e trilhas para aplicar na operação da sua loja."
				size="default"
				placeholder="Buscar cursos..."
			/>

			{isLoading ? <ContentListSkeleton count={6} /> : null}

			{!isLoading && filteredCourses.length === 0 ? (
				<EmptyContentPlaceholder
					icon={BookOpen}
					title={searchQuery.trim() ? "Nenhum curso encontrado" : "Nenhum curso disponível"}
					description={searchQuery.trim() ? "Tente buscar por outros termos." : "Em breve teremos cursos disponíveis."}
				/>
			) : null}

			{!isLoading && featuredCourse ? (
				<section>
					<div className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:shadow-md">
						<div className="grid gap-0 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
							<div className="relative h-56 overflow-hidden lg:h-auto lg:min-h-[280px]">
								{featuredCourse.thumbnailUrl ? (
									<Image
										src={featuredCourse.thumbnailUrl}
										alt={featuredCourse.titulo}
										fill
										className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
									/>
								) : (
									<div className="absolute inset-0 flex items-center justify-center bg-primary/5">
										<BookOpen className="size-14 text-muted-foreground/25" />
									</div>
								)}
							</div>
							<div className="flex flex-col justify-center gap-4 p-6 lg:p-8">
								{(() => {
									const config = ACCESS_CONFIG[featuredCourse.nivelAcesso];
									const Icon = config.icon;
									return (
										<Badge className={`${config.badgeClassName} w-fit border-0 px-2.5 py-0.5 text-xs`}>
											<Icon className="mr-1 size-3" />
											{config.label}
										</Badge>
									);
								})()}
								<div>
									<p className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">Em destaque</p>
									<h2 className="mt-1 text-2xl font-extrabold tracking-tight">{featuredCourse.titulo}</h2>
									{featuredCourse.descricao ? (
										<p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{featuredCourse.descricao}</p>
									) : null}
								</div>
								<div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
									<span className="flex items-center gap-1.5">
										<BookOpen className="size-4" />
										{getTotalLessons(featuredCourse)} aulas
									</span>
									{getTotalDurationSeconds(featuredCourse) > 0 ? (
										<span className="flex items-center gap-1.5">
											<Clock className="size-4" />
											{formatTotalDuration(getTotalDurationSeconds(featuredCourse))}
										</span>
									) : null}
								</div>
								<Button asChild size="lg" className="w-fit rounded-full px-8">
									<Link href={`/community/courses/${featuredCourse.id}`}>
										Começar agora
										<PlayCircle className="ml-2 size-4" />
									</Link>
								</Button>
							</div>
						</div>
					</div>
				</section>
			) : null}

			{!isLoading && gridCourses.length > 0 ? (
				<section className="flex flex-col gap-4">
					<h2 className="text-base font-extrabold tracking-tight">{searchQuery.trim() ? "Resultados" : "Todos os cursos"}</h2>
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						{gridCourses.map((course) => (
							<CourseCard key={course.id} course={course} />
						))}
					</div>
				</section>
			) : null}
		</CommunityPageShell>
	);
}
