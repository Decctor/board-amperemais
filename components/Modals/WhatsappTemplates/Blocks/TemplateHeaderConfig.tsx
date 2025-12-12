import TextInput from "@/components/Inputs/TextInput";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { Button } from "@/components/ui/button";
import { SlideMotionVariants } from "@/lib/animations";
import { TemplateHeaderTypeOptions } from "@/lib/whatsapp/templates";
import type { TWhatsappTemplateHeader } from "@/schemas/whatsapp-templates";
import { AnimatePresence, motion } from "framer-motion";
import { FileTextIcon, ImageIcon, PlusIcon, TextIcon, VideoIcon, X } from "lucide-react";

const HeaderTypeIconsMap = {
	text: <TextIcon className="w-4 h-4" />,
	image: <ImageIcon className="w-4 h-4" />,
	video: <VideoIcon className="w-4 h-4" />,
	document: <FileTextIcon className="w-4 h-4" />,
};
type TemplateHeaderConfigProps = {
	header: TWhatsappTemplateHeader | null;
	onHeaderChange: (header: TWhatsappTemplateHeader | null) => void;
};

function TemplateHeaderConfig({ header, onHeaderChange }: TemplateHeaderConfigProps) {
	const handleAddHeader = () => {
		onHeaderChange({
			tipo: "text",
			conteudo: "",
			exemplo: null,
		});
	};

	const handleRemoveHeader = () => {
		onHeaderChange(null);
	};

	const handleHeaderTypeChange = (tipo: "text" | "image" | "video" | "document") => {
		if (!header) return;
		onHeaderChange({
			...header,
			tipo,
			conteudo: "",
			exemplo: tipo !== "text" ? "" : null,
		});
	};

	return (
		<ResponsiveMenuSection title="CABEÇALHO" icon={<ImageIcon size={15} />}>
			<AnimatePresence>
				{!header ? (
					<Button type="button" variant="ghost" onClick={handleAddHeader} className="flex items-center gap-1 w-fit self-center">
						<PlusIcon className="w-4 h-4" />
						ADICIONAR CABEÇALHO
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
							<h1 className="text-sm font-medium tracking-tight text-primary/80">CONFIGURAÇÃO DO CABEÇALHO</h1>
							<Button type="button" variant="ghost" size="sm" onClick={handleRemoveHeader}>
								<X className="w-4 h-4" />
							</Button>
						</div>
						<div className="w-full flex items-center justify-center gap-x-3 gap-y-1 flex-wrap">
							{TemplateHeaderTypeOptions.map((option) => (
								<Button
									key={option.id}
									type="button"
									variant={header.tipo === option.value ? "default" : "ghost"}
									size="fit"
									className="flex items-center gap-1 text-xs px-2 py-1"
									onClick={() => handleHeaderTypeChange(option.value as "text" | "image" | "video" | "document")}
								>
									{HeaderTypeIconsMap[option.value as "text" | "image" | "video" | "document"]}
									{option.label}
								</Button>
							))}
						</div>
						{header.tipo === "text" && <TemplateHeaderConfigText header={header} onHeaderChange={onHeaderChange} />}
						{header.tipo === "image" && <TemplateHeaderConfigMidia header={header} onHeaderChange={onHeaderChange} />}
						{header.tipo === "video" && <TemplateHeaderConfigMidia header={header} onHeaderChange={onHeaderChange} />}
						{header.tipo === "document" && <TemplateHeaderConfigMidia header={header} onHeaderChange={onHeaderChange} />}

						{header.tipo === "text" && header.conteudo.length > 60 && (
							<p className="w-fit self-center bg-orange-100 text-orange-500 text-xs rounded-lg px-2 py-1">
								⚠️ O cabeçalho de texto deve ter no máximo 60 caracteres.
							</p>
						)}
					</motion.div>
				)}
			</AnimatePresence>
		</ResponsiveMenuSection>
	);
}

export default TemplateHeaderConfig;

type TemplateHeaderConfigTextProps = {
	header: Exclude<TWhatsappTemplateHeader, null>;
	onHeaderChange: (header: Exclude<TWhatsappTemplateHeader, null>) => void;
};
function TemplateHeaderConfigText({ header, onHeaderChange }: TemplateHeaderConfigTextProps) {
	return (
		<TextInput
			label="TEXTO DO CABEÇALHO"
			value={header.conteudo}
			placeholder="Digite o texto do cabeçalho (máx. 60 caracteres)"
			handleChange={(value) => onHeaderChange({ ...header, conteudo: value })}
			width="100%"
		/>
	);
}

type TemplateHeaderConfigMidiaProps = {
	header: Exclude<TWhatsappTemplateHeader, null>;
	onHeaderChange: (header: Exclude<TWhatsappTemplateHeader, null>) => void;
};
function TemplateHeaderConfigMidia({ header, onHeaderChange }: TemplateHeaderConfigMidiaProps) {
	return (
		<>
			<TextInput
				label="URL DA MÍDIA"
				value={header.conteudo}
				placeholder="URL pública da mídia (será usado como padrão)"
				handleChange={(value) => onHeaderChange({ ...header, conteudo: value })}
				width="100%"
			/>
		</>
	);
}
