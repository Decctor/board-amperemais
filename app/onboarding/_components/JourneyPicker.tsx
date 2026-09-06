"use client";

import type { TOnboardingProductEnum } from "@/schemas/enums";
import { Repeat, Store } from "lucide-react";
import { ChoiceList } from "./shared/ChoiceList";

type JourneyPickerProps = {
	value: TOnboardingProductEnum | null;
	onChange: (produto: TOnboardingProductEnum) => void;
	/** A jornada ERP depende de capability do plano (D-1 no plano técnico). */
	erpAvailable: boolean;
};

export function JourneyPicker({ value, onChange, erpAvailable }: JourneyPickerProps) {
	return (
		<div className="flex w-full max-w-[640px] flex-col gap-4">
			<ChoiceList<TOnboardingProductEnum>
				label="O que você quer melhorar primeiro"
				value={value}
				onChange={onChange}
				options={[
					{
						value: "CRM",
						titulo: "Fazer meus clientes voltarem",
						descricao: "Cashback, campanhas no WhatsApp e leitura da sua base de clientes.",
						icon: <Repeat />,
					},
					{
						value: "ERP",
						titulo: "Preparar minha empresa para vender",
						descricao: "Balcão, catálogo digital, mesas e comandas, com estoque e financeiro por trás.",
						icon: <Store />,
						disabled: !erpAvailable,
						badge: erpAvailable ? null : "Requer acesso ao ERP",
					},
				]}
			/>
			<p className="text-xs text-muted-foreground">
				Novas empresas têm 15 dias para testar. A jornada ERP inclui os recursos do plano Escala. O outro produto pode ser preparado depois, sem repetir o cadastro.
			</p>
		</div>
	);
}
