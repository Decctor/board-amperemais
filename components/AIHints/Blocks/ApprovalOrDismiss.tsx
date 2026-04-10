import { TGetHintsOutputById } from "@/app/api/ai-hints/route";
import { getErrorMessage } from "@/lib/errors";
import { formatDateAsLocale } from "@/lib/formatting";
import { approveHint, dismissHint } from "@/lib/mutations/ai-hints";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, CircleX, Clock, Sparkles, UserRound } from "lucide-react";
import { toast } from "sonner";
import { SectionLabel } from "./SectionLabel";
import { Button } from "@/components/ui/button";

type ApprovalOrDismissProps = {
	hint: TGetHintsOutputById;
	callbacks?: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: () => void;
		onSettled?: () => void;
	};
};
export function ApprovalOrDismiss({ hint, callbacks }: ApprovalOrDismissProps) {
	const queryClient = useQueryClient();
	const approvedBy = hint.aprovadaPorUsuario;
	const dismissedBy = hint.descartadaPorUsuario;
	const approvalDate = hint.dataAprovacao ? formatDateAsLocale(hint.dataAprovacao, true) : null;
	const dismissalDate = hint.dataDescarte ? formatDateAsLocale(hint.dataDescarte, true) : null;

	const handleSettled = async () => {
		await queryClient.invalidateQueries({ queryKey: ["ai-hints"] });
		await queryClient.invalidateQueries({ queryKey: ["ai-hint-by-id", hint.id] });
		if (callbacks?.onSettled) callbacks.onSettled();
	};

	const { mutate: handleApproveHint, isPending: approveIsLoading } = useMutation({
		mutationKey: ["approve-ai-hint", hint.id],
		mutationFn: approveHint,
		onMutate: async () => {
			if (callbacks?.onMutate) callbacks.onMutate();
		},
		onSuccess: async (data) => {
			if (callbacks?.onSuccess) callbacks.onSuccess();
			toast.success(data.message);
		},
		onError: async (error) => {
			if (callbacks?.onError) callbacks.onError();
			toast.error(getErrorMessage(error));
		},
		onSettled: handleSettled,
	});

	const { mutate: handleDismissHint, isPending: dismissIsLoading } = useMutation({
		mutationKey: ["dismiss-ai-hint", hint.id],
		mutationFn: dismissHint,
		onMutate: async () => {
			if (callbacks?.onMutate) callbacks.onMutate();
		},
		onSuccess: async (data) => {
			if (callbacks?.onSuccess) callbacks.onSuccess();
			toast.success(data.message);
		},
		onError: async (error) => {
			if (callbacks?.onError) callbacks.onError();
			toast.error(getErrorMessage(error));
		},
		onSettled: handleSettled,
	});

	if (hint.dataAprovacao) {
		return (
			<div className="rounded-xl border border-emerald-200/70 bg-emerald-50/70 p-4 text-emerald-950 shadow-sm dark:border-emerald-800/40 dark:bg-emerald-950/20 dark:text-emerald-50">
				<SectionLabel icon={<CheckCircle2 className="text-emerald-600" />} label="DICA APROVADA" />
				<div className="mt-3 grid gap-2 text-xs">
					<div className="flex items-center gap-2">
						<Clock className="h-3.5 w-3.5 text-emerald-600" />
						<span>{approvalDate ?? "Data de aprovação indisponível"}</span>
					</div>
					<div className="flex items-center gap-2">
						<UserRound className="h-3.5 w-3.5 text-emerald-600" />
						<span>{approvedBy?.nome ?? hint.aprovadaPor ?? "Usuário não identificado"}</span>
					</div>
				</div>
			</div>
		);
	}

	if (hint.status === "dismissed" || hint.dataDescarte) {
		return (
			<div className="rounded-xl border border-red-200/70 bg-red-50/70 p-4 text-red-950 shadow-sm dark:border-red-800/40 dark:bg-red-950/20 dark:text-red-50">
				<SectionLabel icon={<CircleX className="text-red-600" />} label="DICA DESCARTADA" />
				<div className="mt-3 grid gap-2 text-xs">
					<div className="flex items-center gap-2">
						<Clock className="h-3.5 w-3.5 text-red-600" />
						<span>{dismissalDate ?? "Data de descarte indisponível"}</span>
					</div>
					<div className="flex items-center gap-2">
						<UserRound className="h-3.5 w-3.5 text-red-600" />
						<span>{dismissedBy?.nome ?? hint.descartadaPor ?? "Usuário não identificado"}</span>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="rounded-xl border border-border/50 bg-secondary/20 p-4 shadow-sm">
			<SectionLabel icon={<Sparkles />} label="APROVAR OU DESCARTAR" />
			<p className="mt-2 text-xs leading-relaxed text-muted-foreground">
				Aprovar aplica esta sugestão automaticamente. Descartar remove a dica da lista ativa.
			</p>
			<div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
				<Button
					variant="success"
					size="sm"
					disabled={dismissIsLoading}
					onClick={() => handleApproveHint({ id: hint.id })}
					className="flex items-center gap-1.5 rounded-full"
				>
					<CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
					Aprovar
				</Button>
				<Button
					variant="destructive"
					size="sm"
					disabled={approveIsLoading}
					onClick={() => handleDismissHint({ id: hint.id })}
					className="flex items-center gap-1.5 rounded-full"
				>
					<CircleX className="mr-1.5 h-3.5 w-3.5" />
					Descartar
				</Button>
			</div>
		</div>
	);
}
