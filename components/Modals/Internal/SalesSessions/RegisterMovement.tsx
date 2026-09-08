import NumberInput from "@/components/Inputs/NumberInput";
import TextareaInput from "@/components/Inputs/TextareaInput";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/errors";
import { registerSalesSessionMovement } from "@/lib/mutations/sales-sessions";
import type { TSalesSessionMovementTypeEnum } from "@/schemas/enums";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type RegisterMovementProps = {
	sessionId: string;
	closeModal: () => void;
	callbacks?: { onSuccess?: () => void };
};

const TIPOS: { value: TSalesSessionMovementTypeEnum; label: string; hint: string; icon: typeof ArrowUpRight }[] = [
	{ value: "SANGRIA", label: "SANGRIA", hint: "Retira dinheiro do caixa", icon: ArrowUpRight },
	{ value: "SUPRIMENTO", label: "SUPRIMENTO", hint: "Injeta troco no caixa", icon: ArrowDownLeft },
];

export default function RegisterMovement({ sessionId, closeModal, callbacks }: RegisterMovementProps) {
	const queryClient = useQueryClient();
	const [tipo, setTipo] = useState<TSalesSessionMovementTypeEnum>("SANGRIA");
	const [valor, setValor] = useState<number>(0);
	const [observacoes, setObservacoes] = useState<string>("");

	const { mutate, isPending } = useMutation({
		mutationKey: ["register-sales-session-movement", sessionId],
		mutationFn: registerSalesSessionMovement,
		onSuccess: (data) => {
			toast.success(data.message);
			queryClient.invalidateQueries({ queryKey: ["sales-session-by-id", sessionId] });
			queryClient.invalidateQueries({ queryKey: ["open-sales-sessions"] });
			callbacks?.onSuccess?.();
			closeModal();
		},
		onError: (err) => toast.error(getErrorMessage(err)),
	});

	function handleSubmit() {
		if (valor <= 0) return toast.error("Informe um valor maior que zero.");
		mutate({ sessaoVendaId: sessionId, tipo, valor, observacoes: observacoes || null });
	}

	return (
		<ResponsiveMenu
			menuTitle="MOVIMENTO DE CAIXA"
			menuDescription="Registre uma sangria (retirada) ou suprimento (entrada de troco) na sessao."
			menuActionButtonText="REGISTRAR"
			menuCancelButtonText="CANCELAR"
			actionFunction={handleSubmit}
			actionIsLoading={isPending}
			stateIsLoading={false}
			stateError={null}
			closeMenu={closeModal}
			dialogVariant="sm"
		>
			<div className="flex w-full flex-col gap-3">
				<div className="grid grid-cols-2 gap-2">
					{TIPOS.map((option) => {
						const Icon = option.icon;
						const active = tipo === option.value;
						return (
							<button
								key={option.value}
								type="button"
								onClick={() => setTipo(option.value)}
								className={cn(
									"flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors",
									active ? "border-primary bg-primary/10" : "border-border hover:bg-muted",
								)}
							>
								<div className="flex items-center gap-1.5">
									<Icon className={cn("h-4 w-4", active ? "text-primary" : "text-muted-foreground")} />
									<span className="font-bold text-xs tracking-wide">{option.label}</span>
								</div>
								<span className="text-[11px] text-muted-foreground">{option.hint}</span>
							</button>
						);
					})}
				</div>
				<NumberInput label="VALOR" value={valor} handleChange={(value) => setValor(value)} placeholder="0,00" />
				<TextareaInput
					label="OBSERVAÇÕES DO MOVIMENTO"
					value={observacoes}
					handleChange={(value) => setObservacoes(value)}
					placeholder="Observações do movimento (opcional)..."
				/>
			</div>
		</ResponsiveMenu>
	);
}
