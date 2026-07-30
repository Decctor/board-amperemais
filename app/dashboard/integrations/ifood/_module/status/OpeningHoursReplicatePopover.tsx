"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { IFOOD_DAYS_OF_WEEK, type TIfoodDayOfWeek } from "@/lib/integrations/ifood/merchant-types";
import { CopyIcon } from "lucide-react";
import { useState } from "react";
import { IFOOD_DAY_LABELS } from "../shared/ifood-status-config";

const WEEKDAYS: TIfoodDayOfWeek[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
const WEEKEND: TIfoodDayOfWeek[] = ["SATURDAY", "SUNDAY"];

type OpeningHoursReplicatePopoverProps = {
	source: TIfoodDayOfWeek;
	onReplicate: (targets: TIfoodDayOfWeek[]) => void;
};

/**
 * Copia os períodos de um dia para os outros. Substituir é destrutivo, então os dias de destino são
 * escolhidos explicitamente e o aviso fica visível antes de confirmar.
 */
export function OpeningHoursReplicatePopover({ source, onReplicate }: OpeningHoursReplicatePopoverProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [targets, setTargets] = useState<TIfoodDayOfWeek[]>([]);

	const selectableDays = IFOOD_DAYS_OF_WEEK.filter((day) => day !== source);

	function toggleDay(day: TIfoodDayOfWeek, checked: boolean) {
		setTargets((prev) => (checked ? [...prev, day] : prev.filter((item) => item !== day)));
	}

	function selectPreset(preset: TIfoodDayOfWeek[]) {
		setTargets(preset.filter((day) => day !== source));
	}

	function handleOpenChange(open: boolean) {
		setIsOpen(open);
		if (!open) setTargets([]);
	}

	function handleReplicate() {
		onReplicate(targets);
		handleOpenChange(false);
	}

	return (
		<Popover open={isOpen} onOpenChange={handleOpenChange}>
			<PopoverTrigger asChild>
				<Button
					type="button"
					variant="ghost"
					size="xs"
					aria-label={`Replicar horário de ${IFOOD_DAY_LABELS[source]} para outros dias`}
					className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
				>
					<CopyIcon className="w-4 h-4 min-w-4 min-h-4" />
					REPLICAR
				</Button>
			</PopoverTrigger>
			<PopoverContent align="end" className="flex w-64 flex-col gap-3">
				<div className="flex flex-col gap-0.5">
					<span className="text-[0.68rem] font-medium tracking-tight text-muted-foreground uppercase">Replicar {IFOOD_DAY_LABELS[source]}</span>
					<p className="text-[0.68rem] leading-relaxed text-muted-foreground">Os períodos dos dias selecionados serão substituídos.</p>
				</div>

				<div className="flex flex-wrap gap-1.5">
					<Button type="button" variant="outline" size="xs" onClick={() => selectPreset(WEEKDAYS)}>
						DIAS ÚTEIS
					</Button>
					<Button type="button" variant="outline" size="xs" onClick={() => selectPreset(WEEKEND)}>
						FIM DE SEMANA
					</Button>
					<Button type="button" variant="outline" size="xs" onClick={() => selectPreset([...IFOOD_DAYS_OF_WEEK])}>
						TODOS
					</Button>
				</div>

				<div className="flex flex-col gap-1.5 border-t border-border pt-2">
					{selectableDays.map((day) => (
						<label key={day} className="flex cursor-pointer items-center gap-2 text-xs text-foreground">
							<Checkbox checked={targets.includes(day)} onCheckedChange={(checked) => toggleDay(day, checked === true)} />
							{IFOOD_DAY_LABELS[day]}
						</label>
					))}
				</div>

				<Button type="button" size="sm" disabled={targets.length === 0} onClick={handleReplicate}>
					REPLICAR
				</Button>
			</PopoverContent>
		</Popover>
	);
}
