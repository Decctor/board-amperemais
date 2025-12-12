import TextInput from "@/components/Inputs/TextInput";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { Button } from "@/components/ui/button";
import { SlideMotionVariants } from "@/lib/animations";
import { TemplateButtonTypeOptions } from "@/lib/whatsapp/templates";
import type { TWhatsappTemplateButton } from "@/schemas/whatsapp-templates";
import { AnimatePresence, motion } from "framer-motion";
import { LinkIcon, MousePointerClick, Phone, PlusIcon, Trash2 } from "lucide-react";

const ButtonTypeIconsMap = {
	quick_reply: <MousePointerClick className="w-4 h-4" />,
	url: <LinkIcon className="w-4 h-4" />,
	phone_number: <Phone className="w-4 h-4" />,
};
type TemplateButtonsConfigProps = {
	buttons: TWhatsappTemplateButton[] | null;
	onButtonsChange: (buttons: TWhatsappTemplateButton[] | null) => void;
};

function TemplateButtonsConfig({ buttons, onButtonsChange }: TemplateButtonsConfigProps) {
	const handleAddButton = () => {
		if (!buttons)
			return onButtonsChange([
				{
					tipo: "quick_reply",
					texto: "",
					dados: null,
				},
			]);
		return onButtonsChange([
			...buttons,
			{
				tipo: "quick_reply",
				texto: "",
				dados: null,
			},
		]);
	};

	const handleRemoveButton = (index: number) => {
		if (!buttons) return;
		const newButtons = buttons.filter((_, i) => i !== index);
		if (newButtons.length === 0) {
			onButtonsChange(null);
		} else {
			onButtonsChange(newButtons);
		}
	};

	const handleButtonChange = (index: number, button: TWhatsappTemplateButton) => {
		if (!buttons) return;
		const newButtons = [...buttons];
		newButtons[index] = button;
		onButtonsChange(newButtons);
	};
	console.log("BUTTONS", buttons);
	return (
		<ResponsiveMenuSection title="BOTÕES" icon={<MousePointerClick size={15} />}>
			<AnimatePresence>
				<Button type="button" variant="ghost" onClick={handleAddButton} className="flex items-center gap-1 w-fit self-center">
					<PlusIcon className="w-4 h-4" />
					ADICIONAR BOTÃO
				</Button>
				{buttons && buttons.length > 0
					? buttons.map((button, index) => (
							<motion.div
								key={index.toString()}
								className="w-full flex flex-col gap-3 p-2 rounded-lg border border-primary/30"
								variants={SlideMotionVariants}
								initial="initial"
								animate="animate"
								exit="exit"
							>
								<div className="flex items-center justify-between">
									<h4 className="text-sm font-semibold">BOTÃO {index + 1}</h4>
									<Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveButton(index)}>
										<Trash2 className="w-4 h-4" />
									</Button>
								</div>

								<div className="w-full flex items-center justify-center gap-x-3 gap-y-1 flex-wrap">
									{TemplateButtonTypeOptions.map((option) => (
										<Button
											key={option.id}
											type="button"
											variant={button.tipo === option.value ? "default" : "ghost"}
											size="fit"
											className="flex items-center gap-1 text-xs px-2 py-1"
											onClick={() => handleButtonChange(index, { ...button, tipo: option.value as "quick_reply" | "url" | "phone_number" })}
										>
											{ButtonTypeIconsMap[option.value as "quick_reply" | "url" | "phone_number"]}
											{option.label}
										</Button>
									))}
								</div>

								<TextInput
									label="TEXTO DO BOTÃO"
									value={button.texto}
									placeholder="Digite o texto do botão (máx. 25 caracteres)"
									handleChange={(value) => handleButtonChange(index, { ...button, texto: value })}
									width="100%"
								/>

								{button.tipo === "url" && (
									<TextInput
										label="URL"
										value={button.dados?.url || ""}
										placeholder="https://exemplo.com"
										handleChange={(value) =>
											handleButtonChange(index, {
												...button,
												dados: { ...button.dados, url: value },
											})
										}
										width="100%"
									/>
								)}

								{button.tipo === "phone_number" && (
									<TextInput
										label="NÚMERO DE TELEFONE"
										value={button.dados?.telefone || ""}
										placeholder="+5534999999999"
										handleChange={(value) =>
											handleButtonChange(index, {
												...button,
												dados: { ...button.dados, telefone: value },
											})
										}
										width="100%"
									/>
								)}

								{button.texto.length > 25 && <p className="text-xs text-red-500">Atenção: O texto do botão deve ter no máximo 25 caracteres.</p>}
							</motion.div>
						))
					: null}
			</AnimatePresence>
		</ResponsiveMenuSection>
	);
}

export default TemplateButtonsConfig;
