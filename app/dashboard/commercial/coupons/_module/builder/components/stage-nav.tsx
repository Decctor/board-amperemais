"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import type { TStageValidationResult } from "../helpers/validation";
import { STAGE_ORDER } from "../helpers/stages";
import { useBuilderUi } from "./builder-provider";

type StageNavProps = {
	validation: TStageValidationResult;
	onSubmit: () => void;
	submitLoading: boolean;
};

export default function StageNav({ validation, onSubmit, submitLoading }: StageNavProps) {
	const { currentStage, next, back } = useBuilderUi();
	const idx = STAGE_ORDER.indexOf(currentStage);
	const isFirst = idx <= 0;
	const isLast = idx >= STAGE_ORDER.length - 1;

	return (
		<div className="flex w-full flex-col gap-2">
			{!validation.valid && validation.reason ? <p className="text-xs font-medium text-amber-600 dark:text-amber-500">{validation.reason}</p> : null}
			<div className="flex w-full items-center justify-between gap-2">
				<Button type="button" variant="ghost" size="sm" onClick={back} disabled={isFirst} className="flex items-center gap-1.5">
					<ArrowLeft className="h-3.5 w-3.5" />
					VOLTAR
				</Button>
				{isLast ? (
					<Button type="button" size="sm" onClick={onSubmit} disabled={!validation.valid || submitLoading} className="flex items-center gap-1.5">
						{submitLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
						{submitLoading ? "CRIANDO..." : "CRIAR CUPOM"}
					</Button>
				) : (
					<Button type="button" size="sm" onClick={next} disabled={!validation.valid} className="flex items-center gap-1.5">
						CONTINUAR
						<ArrowRight className="h-3.5 w-3.5" />
					</Button>
				)}
			</div>
		</div>
	);
}
