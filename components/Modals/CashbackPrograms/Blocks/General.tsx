import CheckboxInput from "@/components/Inputs/CheckboxInput";
import SelectInput from "@/components/Inputs/SelectInput";
import TextInput from "@/components/Inputs/TextInput";
import TextareaInput from "@/components/Inputs/TextareaInput";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { Button } from "@/components/ui/button";
import type { TUseCashbackProgramState } from "@/state-hooks/use-cashback-program-state";
import { CashbackProgramTerminologyOptions } from "@/utils/select-options";
import { LayoutGrid } from "lucide-react";

type CashbackProgramsGeneralBlockProps = {
	cashbackProgram: TUseCashbackProgramState["state"]["cashbackProgram"];
	updateCashbackProgram: TUseCashbackProgramState["updateCashbackProgram"];
};
export default function CashbackProgramsGeneralBlock({ cashbackProgram, updateCashbackProgram }: CashbackProgramsGeneralBlockProps) {
	return (
		<ResponsiveMenuSection title="INFORMAÇÕES GERAIS" icon={<LayoutGrid className="h-4 min-h-4 w-4 min-w-4" />}>
			<div className="w-full flex items-center justify-center">
				<CheckboxInput
					checked={cashbackProgram.ativo}
					labelTrue="ATIVO"
					labelFalse="ATIVO"
					handleChange={(value) => updateCashbackProgram({ ativo: value })}
					justify="justify-center"
				/>
			</div>

			<div className="w-full flex flex-col items-center gap-1 my-2">
				<h3 className={"text-start text-sm font-medium tracking-tight text-primary/80"}>TERMINOLOGIA</h3>
				<div className="w-full flex items-center gap-2 justify-center flex-wrap">
					{CashbackProgramTerminologyOptions.map((option) => (
						<Button
							key={option.value}
							variant={cashbackProgram.terminologia === option.value ? "default" : "ghost"}
							size="fit"
							className="flex items-center gap-1.5 px-2 py-1 rounded-lg"
							onClick={() => updateCashbackProgram({ terminologia: option.value })}
						>
							{option.icon}
							{option.label}
						</Button>
					))}
				</div>
			</div>
			<TextInput
				value={cashbackProgram.titulo}
				label="TÍTULO"
				placeholder="Preencha aqui o título do programa de cashback..."
				handleChange={(value) => updateCashbackProgram({ titulo: value })}
				width="100%"
			/>
			<TextareaInput
				value={cashbackProgram.descricao ?? ""}
				label="DESCRIÇÃO"
				placeholder="Preencha aqui a descrição do programa de cashback..."
				handleChange={(value) => updateCashbackProgram({ descricao: value })}
			/>

			<div className="w-full flex items-center gap-2 flex-col lg:flex-row">
				<div className="w-full flex items-center justify-center lg:w-1/2">
					<CheckboxInput
						checked={cashbackProgram.modalidadeDescontosPermitida}
						labelTrue="PERMITIR DESCONTOS"
						labelFalse="PERMITIR DESCONTOS"
						handleChange={(value) => updateCashbackProgram({ modalidadeDescontosPermitida: value })}
					/>
				</div>
				<div className="w-full flex items-center justify-center lg:w-1/2">
					<CheckboxInput
						checked={cashbackProgram.modalidadeRecompensasPermitida}
						labelTrue="PERMITIR RECOMPENSAS"
						labelFalse="PERMITIR RECOMPENSAS"
						handleChange={(value) => updateCashbackProgram({ modalidadeRecompensasPermitida: value })}
					/>
				</div>
			</div>
		</ResponsiveMenuSection>
	);
}
