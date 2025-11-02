import { formatDateAsLocale, formatToMoney } from "@/lib/formatting";
import { useGoals } from "@/lib/queries/goals";
import type { TGetGoalsOutputDefault } from "@/pages/api/goals";
import type { TUserSession } from "@/schemas/users";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import React, { useState } from "react";
import ErrorComponent from "../Layouts/ErrorComponent";
import LoadingComponent from "../Layouts/LoadingComponent";
import ControlGoal from "../Modals/Goals/ControlGoal";
import NewGoal from "../Modals/Goals/NewGoal";

import { Button } from "../ui/button";

type SaleGoalsViewProps = {
	session: TUserSession;
};
function SaleGoalsView({ session }: SaleGoalsViewProps) {
	const queryClient = useQueryClient();
	const [newSaleGoalModalIsOpen, setNewSaleGoalModalIsOpen] = useState<boolean>(false);
	const [editSaleGoalModal, setEditSaleGoalModal] = useState<{ id: string | null; isOpen: boolean }>({ id: null, isOpen: false });
	const { data: goals, queryKey, isLoading, isError, isSuccess, error } = useGoals();

	const handleOnMutate = async () => await queryClient.cancelQueries({ queryKey: queryKey });
	const handleOnSettled = async () => await queryClient.invalidateQueries({ queryKey: queryKey });
	return (
		<div className="flex h-full grow flex-col">
			<div className="flex w-full flex-col items-center justify-end border-b border-primary/20 pb-2 lg:flex-row">
				<Button onClick={() => setNewSaleGoalModalIsOpen(true)}>NOVA META</Button>
			</div>
			<div className="flex w-full flex-col gap-2 py-2">
				{isLoading ? <LoadingComponent /> : null}
				{isError ? <ErrorComponent msg="Erro ao buscar usuários" /> : null}
				{isSuccess &&
					goals.map((goal, index: number) => <GoalCard key={goal.id} goal={goal} handleClick={(id) => setEditSaleGoalModal({ id, isOpen: true })} />)}
			</div>
			{newSaleGoalModalIsOpen ? (
				<NewGoal
					session={session}
					closeModal={() => setNewSaleGoalModalIsOpen(false)}
					callbacks={{ onMutate: handleOnMutate, onSettled: handleOnSettled }}
				/>
			) : null}
			{editSaleGoalModal.id && editSaleGoalModal.isOpen ? (
				<ControlGoal
					goalId={editSaleGoalModal.id}
					session={session}
					closeModal={() => setEditSaleGoalModal({ id: null, isOpen: false })}
					callbacks={{ onMutate: handleOnMutate, onSettled: handleOnSettled }}
				/>
			) : null}
		</div>
	);
}

export default SaleGoalsView;

type GoalCardProps = {
	goal: TGetGoalsOutputDefault[number];
	handleClick: (id: string) => void;
};
function GoalCard({ goal, handleClick }: GoalCardProps) {
	return (
		<div className="flex w-full flex-col gap-1 rounded border border-primary bg-card p-2 shadow-sm">
			<div className="w-full flex items-center justify-between gap-2">
				<h1 className="text-sm font-bold leading-none tracking-tight">
					META DE {formatDateAsLocale(goal.dataInicio)} À {formatDateAsLocale(goal.dataFim)}
				</h1>
				<h3 className="text-sm font-bold leading-none tracking-tight">{formatToMoney(goal.objetivoValor)}</h3>
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
