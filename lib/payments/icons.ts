import type { TPaymentMethodEnum } from "@/schemas/enums";
import {
	ArrowLeftRight,
	Banknote,
	Barcode,
	CircleDashed,
	CircleEllipsis,
	CreditCard,
	HandCoins,
	type LucideIcon,
	NotebookPen,
	QrCode,
	Ticket,
	WalletCards,
} from "lucide-react";

/** Ícone de cada método de pagamento, para listas e relatórios que precisam distinguir os métodos de relance. */
export const PAYMENT_METHOD_ICONS: Record<TPaymentMethodEnum, LucideIcon> = {
	DINHEIRO: Banknote,
	PIX: QrCode,
	CARTAO_CREDITO: CreditCard,
	CARTAO_DEBITO: WalletCards,
	BOLETO: Barcode,
	TRANSFERENCIA: ArrowLeftRight,
	CASHBACK: HandCoins,
	VALE: Ticket,
	A_DEFINIR: CircleDashed,
	FIADO_NOTA: NotebookPen,
	OUTRO: CircleEllipsis,
};

export function getPaymentMethodIcon(metodo: string): LucideIcon {
	return PAYMENT_METHOD_ICONS[metodo as TPaymentMethodEnum] ?? CircleEllipsis;
}
