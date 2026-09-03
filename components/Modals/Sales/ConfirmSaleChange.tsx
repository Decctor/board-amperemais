import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatToMoney } from "@/lib/formatting";
import { Banknote } from "lucide-react";

type ConfirmSaleChangeProps = {
	troco: number;
	closeModal: () => void;
	onConfirm: () => void;
};

/**
 * Troco em dinheiro contra pagamento em cartão/PIX é legítimo, mas quase sempre é valor digitado
 * errado. Em vez de bloquear, pede uma confirmação explícita antes de lançar a saída de caixa.
 */
export function ConfirmSaleChange({ troco, closeModal, onConfirm }: ConfirmSaleChangeProps) {
	return (
		<Dialog open onOpenChange={(open) => (!open ? closeModal() : undefined)}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Banknote className="w-5 h-5 text-amber-600" />
						TROCO SEM DINHEIRO RECEBIDO
					</DialogTitle>
					<DialogDescription>
						Os pagamentos superam o total da venda em <span className="font-bold text-foreground">{formatToMoney(troco)}</span>, mas o excesso
						não veio em dinheiro. Confirmar registra uma saída de {formatToMoney(troco)} do caixa como troco ao cliente. Se o valor foi
						digitado errado, volte e ajuste o pagamento.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter className="gap-2">
					<Button type="button" variant="outline" onClick={closeModal}>
						VOLTAR E AJUSTAR
					</Button>
					<Button type="button" onClick={onConfirm}>
						CONFIRMAR TROCO DE {formatToMoney(troco)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
