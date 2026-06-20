import DateInput from "@/components/Inputs/DateInput";
import TextareaInput from "@/components/Inputs/TextareaInput";
import TextInput from "@/components/Inputs/TextInput";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { formatDateForInputValue, formatDateOnInputChange } from "@/lib/formatting";
import type { TUseClientState } from "@/state-hooks/use-client-state";
import { UserRound } from "lucide-react";

type ClientProfileBlockProps = {
	client: TUseClientState["state"]["client"];
	updateClient: TUseClientState["updateClient"];
};

export default function ClientProfileBlock({ client, updateClient }: ClientProfileBlockProps) {
	return (
		<ResponsiveMenuSection title="PERFIL DO CLIENTE" icon={<UserRound className="h-4 min-h-4 w-4 min-w-4" />}>
			<div className="grid w-full grid-cols-1 gap-2 md:grid-cols-2">
				<DateInput
					label="DATA DE NASCIMENTO"
					value={formatDateForInputValue(client.dataNascimento)}
					handleChange={(value) => updateClient({ dataNascimento: formatDateOnInputChange(value, "date") })}
					width="100%"
				/>
				<DateInput
					label="DATA DE FUNDAÇÃO"
					value={formatDateForInputValue(client.dataFundacao)}
					handleChange={(value) => updateClient({ dataFundacao: formatDateOnInputChange(value, "date") })}
					width="100%"
				/>
				<TextInput
					label="PROFISSÃO"
					placeholder="Digite a profissão"
					value={client.profissao ?? ""}
					handleChange={(value) => updateClient({ profissao: value || null })}
				/>
				<TextInput
					label="ONDE TRABALHA"
					placeholder="Digite o local de trabalho"
					value={client.ondeTrabalha ?? ""}
					handleChange={(value) => updateClient({ ondeTrabalha: value || null })}
				/>
				<TextInput
					label="ESTADO CIVIL"
					placeholder="Digite o estado civil"
					value={client.estadoCivil ?? ""}
					handleChange={(value) => updateClient({ estadoCivil: value || null })}
				/>
				<TextInput
					label="DEFICIÊNCIA"
					placeholder="Digite a deficiência, se houver"
					value={client.deficiencia ?? ""}
					handleChange={(value) => updateClient({ deficiencia: value || null })}
				/>
			</div>
			<TextareaInput
				label="ANOTAÇÕES"
				value={client.anotacoes ?? ""}
				placeholder="Adicione observações importantes sobre o cliente..."
				handleChange={(value) => updateClient({ anotacoes: value || null })}
			/>
		</ResponsiveMenuSection>
	);
}
