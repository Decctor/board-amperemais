"use client";

import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getErrorMessage } from "@/lib/errors";
import { exportMarketingContext } from "@/lib/mutations/admin";
import { useMutation } from "@tanstack/react-query";
import dayjs from "dayjs";
import { BrainCircuit, CalendarRange, Database, Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type TAdminMarketingContextExportMenuProps = {
	organizationId: string;
	organizationName: string;
	closeModal: () => void;
};

function toDateInputValue(date: Date) {
	return dayjs(date).format("YYYY-MM-DD");
}

function downloadJsonFile({ filename, data }: { filename: string; data: unknown }) {
	const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = filename;
	document.body.appendChild(anchor);
	anchor.click();
	anchor.remove();
	URL.revokeObjectURL(url);
}

export default function AdminMarketingContextExportMenu({ organizationId, organizationName, closeModal }: TAdminMarketingContextExportMenuProps) {
	const [periodAfter, setPeriodAfter] = useState(toDateInputValue(dayjs().subtract(90, "day").toDate()));
	const [periodBefore, setPeriodBefore] = useState(toDateInputValue(new Date()));

	const { mutate, isPending } = useMutation({
		mutationKey: ["admin-export-marketing-context", organizationId],
		mutationFn: exportMarketingContext,
		onSuccess: (result) => {
			const safeOrgName = organizationName
				.normalize("NFD")
				.replace(/[\u0300-\u036f]/g, "")
				.replace(/[^a-zA-Z0-9]+/g, "-")
				.replace(/^-|-$/g, "")
				.toLowerCase();
			downloadJsonFile({
				filename: `contexto-marketing-${safeOrgName || organizationId}-${periodAfter}-${periodBefore}.json`,
				data: result.data,
			});
			toast.success(result.message);
			closeModal();
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	function handleSubmit() {
		if (!periodAfter || !periodBefore) {
			toast.error("Informe o período da análise.");
			return;
		}

		const after = dayjs(periodAfter).startOf("day");
		const before = dayjs(periodBefore).endOf("day");
		if (after.isAfter(before)) {
			toast.error("A data inicial deve ser anterior à data final.");
			return;
		}

		mutate({
			organizationId,
			periodAfter: after.toDate(),
			periodBefore: before.toDate(),
		});
	}

	return (
		<ResponsiveMenu
			menuTitle="EXPORTAR CONTEXTO PARA IA"
			menuDescription={`Gere um JSON agregado com dados comerciais, clientes, RFM, produtos, campanhas e cashback de ${organizationName}.`}
			menuActionButtonText="BAIXAR JSON"
			menuCancelButtonText="CANCELAR"
			actionFunction={handleSubmit}
			actionIsLoading={isPending}
			stateIsLoading={false}
			stateError={null}
			closeMenu={closeModal}
			dialogVariant="sm"
			drawerVariant="fit"
			lockClose={isPending}
		>
			<ResponsiveMenuSection title="PERÍODO DA ANÁLISE" icon={<CalendarRange className="h-4 w-4 min-h-4 min-w-4" />}>
				<div className="grid w-full grid-cols-1 gap-3 md:grid-cols-2">
					<div className="flex w-full flex-col gap-1">
						<Label htmlFor="marketing-context-period-after" className="text-sm font-medium tracking-tight text-foreground/80">
							Início
						</Label>
						<Input id="marketing-context-period-after" type="date" value={periodAfter} onChange={(event) => setPeriodAfter(event.target.value)} />
					</div>
					<div className="flex w-full flex-col gap-1">
						<Label htmlFor="marketing-context-period-before" className="text-sm font-medium tracking-tight text-foreground/80">
							Fim
						</Label>
						<Input id="marketing-context-period-before" type="date" value={periodBefore} onChange={(event) => setPeriodBefore(event.target.value)} />
					</div>
				</div>
			</ResponsiveMenuSection>

			<ResponsiveMenuSection title="CONTEÚDO DO JSON" icon={<Database className="h-4 w-4 min-h-4 min-w-4" />}>
				<div className="grid grid-cols-1 gap-2 text-sm text-foreground/75">
					<div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 p-3">
						<BrainCircuit className="h-4 w-4 min-h-4 min-w-4 text-primary" />
						<span>Resultados comerciais, comparação com período anterior, RFM, base de clientes, campanhas, cashback e distribuições agregadas.</span>
					</div>
					<div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 p-3">
						<Download className="h-4 w-4 min-h-4 min-w-4 text-primary" />
						<span>O download não inclui nomes, telefones, e-mails ou documentos de clientes.</span>
					</div>
				</div>
			</ResponsiveMenuSection>
		</ResponsiveMenu>
	);
}
