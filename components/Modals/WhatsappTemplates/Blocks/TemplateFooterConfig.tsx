import TextInput from "@/components/Inputs/TextInput";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { Button } from "@/components/ui/button";
import { SlideMotionVariants } from "@/lib/animations";
import type { TWhatsappTemplateFooter } from "@/schemas/whatsapp-templates";
import { AnimatePresence, motion } from "framer-motion";
import { AlignLeft, PlusIcon, X } from "lucide-react";

type TemplateFooterConfigProps = {
	footer: TWhatsappTemplateFooter | null;
	onFooterChange: (footer: TWhatsappTemplateFooter | null) => void;
};

function TemplateFooterConfig({ footer, onFooterChange }: TemplateFooterConfigProps) {
	const handleAddFooter = () => {
		onFooterChange({
			conteudo: "",
		});
	};

	const handleRemoveFooter = () => {
		onFooterChange(null);
	};

	const handleFooterContentChange = (conteudo: string) => {
		if (!footer) return;
		onFooterChange({
			...footer,
			conteudo,
		});
	};

	return (
		<ResponsiveMenuSection title="RODAPÉ" icon={<AlignLeft size={15} />}>
			<AnimatePresence>
				{!footer ? (
					<Button type="button" variant="ghost" onClick={handleAddFooter} className="flex items-center gap-1 w-fit self-center">
						<PlusIcon className="w-4 h-4" />
						ADICIONAR RODAPÉ
					</Button>
				) : (
					<motion.div
						className="w-full flex flex-col gap-3 p-2 rounded-lg border border-primary/30"
						variants={SlideMotionVariants}
						initial="initial"
						animate="animate"
						exit="exit"
					>
						<div className="w-full flex items-center justify-between">
							<h1 className="text-sm font-medium tracking-tight text-primary/80">CONFIGURAÇÃO DO RODAPÉ</h1>
							<Button type="button" variant="ghost" size="sm" onClick={handleRemoveFooter}>
								<X className="w-4 h-4" />
							</Button>
						</div>
						<TextInput
							label="TEXTO DO RODAPÉ"
							value={footer.conteudo}
							placeholder="Digite o texto do rodapé (máx. 60 caracteres)"
							handleChange={handleFooterContentChange}
							width="100%"
						/>

						{footer.conteudo.length > 60 && (
							<p className="w-fit self-center bg-orange-100 text-orange-500 text-xs rounded-lg px-2 py-1">⚠️ O rodapé deve ter no máximo 60 caracteres.</p>
						)}
					</motion.div>
				)}
			</AnimatePresence>
		</ResponsiveMenuSection>
	);
}

export default TemplateFooterConfig;
