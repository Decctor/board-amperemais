import TextInput from "@/components/Inputs/TextInput";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import type { TUseInternalDealState } from "@/state-hooks/use-internal-deal-state";
import { UserRound } from "lucide-react";

type DealObtentorBlockProps = {
	deal: TUseInternalDealState["state"]["deal"];
	updateDeal: TUseInternalDealState["updateDeal"];
};
export default function DealObtentorBlock({ deal, updateDeal }: DealObtentorBlockProps) {
	return (
		<ResponsiveMenuSection title="OBTENTOR (COMPRADOR DAS LICENÇAS)" icon={<UserRound className="h-3 w-3 min-w-3 min-h-3" />}>
			<TextInput
				label="NOME"
				value={deal.nomeObtentor}
				placeholder="Nome do comprador..."
				handleChange={(value) => updateDeal({ nomeObtentor: value })}
				required
			/>
			<TextInput
				label="EMAIL"
				value={deal.emailObtentor}
				placeholder="email@empresa.com.br"
				handleChange={(value) => updateDeal({ emailObtentor: value })}
				required
			/>
			<TextInput
				label="TELEFONE"
				value={deal.telefoneObtentor ?? ""}
				placeholder="(00) 00000-0000"
				inputType="tel"
				handleChange={(value) => updateDeal({ telefoneObtentor: value })}
			/>
			<p className="text-xs text-foreground/60">
				O email identifica o comprador: ao acessar a plataforma com ele, as licenças do deal ficam disponíveis automaticamente na criação de organizações
				— sem passar pelo checkout.
			</p>
		</ResponsiveMenuSection>
	);
}
