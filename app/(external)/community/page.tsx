"use client";

import { CommunityHeader } from "@/components/Community/CommunityHeader";
import { CommunityPageShell } from "@/components/Community/CommunityPageShell";
import { CommunitySearchBar } from "@/components/Community/CommunitySearchBar";
import { ContentListRow } from "@/components/Community/ContentListRow";
import { ContentListSkeleton } from "@/components/Community/ContentListSkeleton";
import { ContentSectionHeader } from "@/components/Community/ContentSectionHeader";
import { ContinueLearningCard } from "@/components/Community/ContinueLearningCard";
import { CourseCard } from "@/components/Community/CourseCard";
import { EmptyContentPlaceholder } from "@/components/Community/EmptyContentPlaceholder";
import { MaterialRow } from "@/components/Community/MaterialRow";
import { buildContinueLearningItems, buildQuickAnswerItems, type TCourseSummary } from "@/lib/community";
import { useCourses, usePublicCommunityMaterials, useUserProgress } from "@/lib/queries/community";
import { useUserSession } from "@/lib/queries/session";
import { BookOpen, Search } from "lucide-react";
import { useMemo, useState } from "react";

export default function CommunityHubPage() {
	const { data: coursesData, isLoading: isCoursesLoading } = useCourses();
	const { data: materials = [], isLoading: isMaterialsLoading } = usePublicCommunityMaterials();
	const { data: session } = useUserSession();
	const { data: progress = [] } = useUserProgress(undefined, { enabled: !!session });
	const courses = (coursesData as TCourseSummary[] | undefined) ?? [];
	const [searchQuery, setSearchQuery] = useState("");

	const isLoading = isCoursesLoading || isMaterialsLoading;
	const normalizedQuery = searchQuery.trim();

	const quickAnswers = useMemo(
		() => buildQuickAnswerItems({ courses, materials, query: normalizedQuery, limit: normalizedQuery ? 12 : 6 }),
		[courses, materials, normalizedQuery],
	);

	const continueItems = useMemo(
		() => (session ? buildContinueLearningItems({ progress, courses, limit: 3 }) : []),
		[session, progress, courses],
	);

	const featuredCourses = useMemo(() => {
		if (normalizedQuery) return [];
		return courses.slice(0, 3);
	}, [courses, normalizedQuery]);

	const featuredMaterials = useMemo(() => {
		if (normalizedQuery) return [];
		return materials.slice(0, 4);
	}, [materials, normalizedQuery]);

	return (
		<CommunityPageShell className="flex flex-col gap-8 sm:gap-10">
			<CommunityHeader breadcrumbs={[{ label: "Início" }]} />

			<CommunitySearchBar value={searchQuery} onChange={setSearchQuery} />

			{normalizedQuery ? (
				<section className="flex flex-col gap-3">
					<ContentSectionHeader title="Resultados da busca" />
					{isLoading ? <ContentListSkeleton count={5} /> : null}
					{!isLoading && quickAnswers.length === 0 ? (
						<EmptyContentPlaceholder
							icon={Search}
							title="Nenhum resultado encontrado"
							description="Tente outros termos ou explore os cursos e materiais disponíveis."
						/>
					) : null}
					{!isLoading && quickAnswers.length > 0 ? (
						<div className="flex flex-col gap-2">
							{quickAnswers.map((item) => (
								<ContentListRow key={item.id} href={item.href} title={item.title} subtitle={item.subtitle} meta={item.meta} kind={item.kind} />
							))}
						</div>
					) : null}
				</section>
			) : (
				<>
					{session && continueItems.length > 0 ? (
						<section className="flex flex-col gap-3">
							<ContentSectionHeader title="Continuar de onde parou" />
							<div className="flex flex-col gap-2">
								{continueItems.map((item) => (
									<ContinueLearningCard key={item.lessonId} item={item} />
								))}
							</div>
						</section>
					) : null}

					<section className="flex flex-col gap-3">
						<ContentSectionHeader title="Respostas rápidas" />
						{isLoading ? <ContentListSkeleton count={4} /> : null}
						{!isLoading && quickAnswers.length === 0 ? (
							<EmptyContentPlaceholder
								icon={BookOpen}
								title="Nenhum conteúdo disponível"
								description="Em breve teremos cursos e materiais para consulta rápida."
							/>
						) : null}
						{!isLoading && quickAnswers.length > 0 ? (
							<div className="flex flex-col gap-2">
								{quickAnswers.map((item) => (
									<ContentListRow key={item.id} href={item.href} title={item.title} subtitle={item.subtitle} meta={item.meta} kind={item.kind} />
								))}
							</div>
						) : null}
					</section>

					{featuredCourses.length > 0 ? (
						<section className="flex flex-col gap-4">
							<ContentSectionHeader title="Cursos em destaque" href="/community/courses" />
							<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
								{featuredCourses.map((course) => (
									<CourseCard key={course.id} course={course} />
								))}
							</div>
						</section>
					) : null}

					{featuredMaterials.length > 0 ? (
						<section className="flex flex-col gap-3">
							<ContentSectionHeader title="Materiais em destaque" href="/community/materials" />
							<div className="flex flex-col gap-2">
								{featuredMaterials.map((material) => (
									<MaterialRow key={material.id} material={material} />
								))}
							</div>
						</section>
					) : null}
				</>
			)}
		</CommunityPageShell>
	);
}
