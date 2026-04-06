"use client";

import GoalEnrichedCard from "@/components/Goals/GoalEnrichedCard";
import GoalsDashboardView from "@/components/Goals/GoalsDashboardView";
import GoalsEmptyState from "@/components/Goals/GoalsEmptyState";
import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import ControlGoal from "@/components/Modals/Goals/ControlGoal";
import NewGoal from "@/components/Modals/Goals/NewGoal";
import GeneralPaginationComponent from "@/components/Utils/Pagination";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { getErrorMessage } from "@/lib/errors";
import { useGoals } from "@/lib/queries/goals";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, Plus, Target } from "lucide-react";
import { parseAsStringEnum, useQueryState } from "nuqs";
import { useState } from "react";

type GoalsPageProps = {
	user: TAuthUserSession["user"];
};
export default function GoalsPage({ user }: GoalsPageProps) {
	const queryClient = useQueryClient();
	const [viewMode, setViewMode] = useQueryState("view", parseAsStringEnum(["dashboard", "metas"]));
	const [newGoalModalIsOpen, setNewGoalModalIsOpen] = useState<boolean>(false);
	const [editGoalModal, setEditGoalModal] = useState<{ id: string | null; isOpen: boolean }>({ id: null, isOpen: false });

	const activeView = viewMode ?? "dashboard";

	const handleOnSettled = async () => {
		await queryClient.invalidateQueries({ queryKey: ["goals"] });
		await queryClient.invalidateQueries({ queryKey: ["goals-stats"] });
	};

	return (
		<div className="w-full h-full flex flex-col gap-3">
			<Tabs value={activeView} onValueChange={(v) => setViewMode(v as "dashboard" | "metas")}>
				<div className="w-full flex items-center justify-between gap-2 flex-wrap">
					<TabsList className="flex items-center gap-1.5 w-fit h-fit self-start rounded-lg px-2 py-1">
						<TabsTrigger value="dashboard" className="flex items-center gap-1.5 px-2 py-2 rounded-lg">
							<LayoutDashboard className="w-4 h-4 min-w-4 min-h-4" />
							Dashboard
						</TabsTrigger>
						<TabsTrigger value="metas" className="flex items-center gap-1.5 px-2 py-2 rounded-lg">
							<Target className="w-4 h-4 min-w-4 min-h-4" />
							Metas
						</TabsTrigger>
					</TabsList>
					<Button className="flex items-center gap-2" size="sm" onClick={() => setNewGoalModalIsOpen(true)}>
						<Plus className="w-4 h-4 min-w-4 min-h-4" />
						NOVA META
					</Button>
				</div>

				<TabsContent value="dashboard">
					<GoalsDashboardView />
				</TabsContent>

				<TabsContent value="metas">
					<GoalsListingView
						onEdit={(id) => setEditGoalModal({ id, isOpen: true })}
						onCreateGoal={() => setNewGoalModalIsOpen(true)}
					/>
				</TabsContent>
			</Tabs>

			{newGoalModalIsOpen ? (
				<NewGoal
					user={user}
					closeModal={() => setNewGoalModalIsOpen(false)}
					callbacks={{ onSettled: handleOnSettled }}
				/>
			) : null}
			{editGoalModal.id && editGoalModal.isOpen ? (
				<ControlGoal
					goalId={editGoalModal.id}
					user={user}
					closeModal={() => setEditGoalModal({ id: null, isOpen: false })}
					callbacks={{ onSettled: handleOnSettled }}
				/>
			) : null}
		</div>
	);
}

type GoalsListingViewProps = {
	onEdit: (id: string) => void;
	onCreateGoal: () => void;
};
function GoalsListingView({ onEdit, onCreateGoal }: GoalsListingViewProps) {
	const [page, setPage] = useState(1);
	const { data, isLoading, isError, isSuccess, error } = useGoals({ page });

	const goals = data?.goals ?? [];
	const goalsMatched = data?.goalsMatched ?? 0;
	const totalPages = data?.totalPages ?? 1;

	return (
		<div className="w-full flex flex-col gap-3">
			{isLoading ? <LoadingComponent /> : null}
			{isError ? <ErrorComponent msg={getErrorMessage(error)} /> : null}

			{isSuccess ? (
				goals.length === 0 && page === 1 ? (
					<GoalsEmptyState onCreateGoal={onCreateGoal} />
				) : (
					<>
						<GeneralPaginationComponent
							activePage={page}
							queryLoading={isLoading}
							selectPage={setPage}
							totalPages={totalPages}
							itemsMatchedText={`${goalsMatched} ${goalsMatched === 1 ? "meta encontrada" : "metas encontradas"}.`}
							itemsShowingText={`Mostrando ${goals.length} ${goals.length === 1 ? "meta" : "metas"}.`}
						/>
						<div className="w-full flex flex-col gap-3">
							{goals.map((goal) => (
								<GoalEnrichedCard key={goal.id} goal={goal} onEdit={onEdit} />
							))}
						</div>
					</>
				)
			) : null}
		</div>
	);
}
