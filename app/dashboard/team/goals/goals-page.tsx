"use client";
import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import ControlGoal from "@/components/Modals/Goals/ControlGoal";
import NewGoal from "@/components/Modals/Goals/NewGoal";
import { Button } from "@/components/ui/button";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { getErrorMessage } from "@/lib/errors";
import { formatDateAsLocale, formatToMoney } from "@/lib/formatting";
import { useGoals } from "@/lib/queries/goals";
import { cn } from "@/lib/utils";
import type { TGetGoalsOutputDefault } from "@/pages/api/goals";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { useState } from "react";

type GoalsPageProps = {
	user: TAuthUserSession["user"];
};
export default function GoalsPage({ user }: GoalsPageProps) {
	const queryClient = useQueryClient();
	const [newGoalModalIsOpen, setNewGoalModalIsOpen] = useState<boolean>(false);
	const [editGoalModal, setEditGoalModal] = useState<{ id: string | null; isOpen: boolean }>({ id: null, isOpen: false });
	const { data: goals, queryKey, isLoading, isError, isSuccess, error } = useGoals();

	const handleOnMutate = async () => await queryClient.cancelQueries({ queryKey: queryKey });
	const handleOnSettled = async () => await queryClient.invalidateQueries({ queryKey: queryKey });
	return (
		<div className="w-full h-full flex flex-col gap-3">
			<div className="w-full flex items-center justify-end gap-2">
				<Button className="flex items-center gap-2" size="sm" onClick={() => setNewGoalModalIsOpen(true)}>
					NOVA META
				</Button>
			</div>
			{isLoading ? <LoadingComponent /> : null}
			{isError ? <ErrorComponent msg={getErrorMessage(error)} /> : null}
			{isSuccess &&
				goals.map((goal, index: number) => <GoalsPageGoalCard key={goal.id} goal={goal} handleClick={(id) => setEditGoalModal({ id, isOpen: true })} />)}

			{newGoalModalIsOpen ? (
				<NewGoal user={user} closeModal={() => setNewGoalModalIsOpen(false)} callbacks={{ onMutate: handleOnMutate, onSettled: handleOnSettled }} />
			) : null}
			{editGoalModal.id && editGoalModal.isOpen ? (
				<ControlGoal
					goalId={editGoalModal.id}
					user={user}
					closeModal={() => setEditGoalModal({ id: null, isOpen: false })}
					callbacks={{ onMutate: handleOnMutate, onSettled: handleOnSettled }}
				/>
			) : null}
		</div>
	);
}

type GoalsPageGoalCardProps = {
	goal: TGetGoalsOutputDefault[number];
	handleClick: (id: string) => void;
};
function GoalsPageGoalCard({ goal, handleClick }: GoalsPageGoalCardProps) {
	return (
		<div className={cn("bg-card border-primary/20 flex w-full flex-col gap-1 rounded-xl border px-3 py-4 shadow-2xs")}>
			<div className="w-full flex items-center justify-between gap-2">
				<h1 className="text-xs font-bold tracking-tight lg:text-sm">
					META DE {formatDateAsLocale(goal.dataInicio)} À {formatDateAsLocale(goal.dataFim)}
				</h1>
				<h3 className="text-xs font-bold tracking-tight lg:text-sm">{formatToMoney(goal.objetivoValor)}</h3>
			</div>
			<div className="flex w-full items-center justify-end">
				<Button variant="ghost" onClick={() => handleClick(goal.id)} className="flex items-center gap-1">
					<Pencil className="w-4 h-4 min-w-4 min-h-4" />
					<p>EDITAR</p>
				</Button>
			</div>
		</div>
	);
}
