import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { convertHtmlToWhatsappText } from "@/lib/whatsapp/template-management";
import type { TWhatsappTemplateComponents } from "@/schemas/whatsapp-templates";
import { Eye, FileText as FileTextIcon, ImageIcon, VideoIcon } from "lucide-react";

type TemplatePreviewProps = {
	components: TWhatsappTemplateComponents;
};

function TemplatePreview({ components }: TemplatePreviewProps) {
	const { cabecalho, corpo, rodape, botoes } = components;

	// Convert HTML content to plain text with WhatsApp formatting
	const bodyText = convertHtmlToWhatsappText(corpo.conteudo);

	// Replace variables with example values
	let bodyWithExamples = bodyText;
	for (const param of corpo.parametros) {
		const placeholder = `{{${param.nome}}}`;
		const exemplo = param.exemplo || `{{${param.nome}}}`;
		bodyWithExamples = bodyWithExamples.replace(new RegExp(placeholder, "g"), exemplo);
	}

	// Get current time for timestamp
	const currentTime = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

	return (
		<ResponsiveMenuSection title="PREVIEW" icon={<Eye size={15} />}>
			<div className="w-full h-full flex flex-col items-center justify-center gap-4 pb-4">
				{/* WhatsApp Background */}
				<div className="relative w-full max-w-md min-w-[300px] rounded-lg overflow-hidden bg-[#e5ddd5]">
					{/* Background pattern - similar to WhatsApp */}
					<div
						className="absolute inset-0 opacity-10"
						style={{
							backgroundImage:
								"url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
						}}
					/>

					{/* WhatsApp Message Bubble */}
					<div className="relative p-4 min-h-[300px] flex items-center justify-center">
						<div className="bg-white rounded-lg shadow-md overflow-hidden max-w-[85%] relative">
							{/* Header */}
							{cabecalho && (
								<div className="w-full">
									{cabecalho.tipo === "text" ? (
										<div className="px-3 pt-3">
											<p className="font-semibold text-sm text-gray-900">{cabecalho.conteudo || "Texto do cabeçalho"}</p>
										</div>
									) : cabecalho.tipo === "image" ? (
										cabecalho.conteudo ? (
											<img
												src={cabecalho.conteudo}
												alt="Header preview"
												className="w-full aspect-video object-cover"
											/>
										) : (
											<div className="w-full aspect-video bg-gray-500 flex items-center justify-center">
												<ImageIcon className="w-16 h-16 text-white" strokeWidth={1.5} />
											</div>
										)
									) : cabecalho.tipo === "video" ? (
										cabecalho.conteudo ? (
											<video
												src={cabecalho.conteudo}
												className="w-full aspect-video object-cover"
												controls
												muted
											/>
										) : (
											<div className="w-full aspect-video bg-gray-500 flex items-center justify-center">
												<VideoIcon className="w-16 h-16 text-white" strokeWidth={1.5} />
											</div>
										)
									) : cabecalho.tipo === "document" ? (
										<div className="px-3 pt-3">
											<div className="flex items-center gap-2 p-2 bg-gray-500 rounded">
												<FileTextIcon className="w-8 h-8 text-white" />
												<div className="flex-1">
													<p className="text-sm font-medium text-white">Documento</p>
													<p className="text-xs text-white">PDF</p>
												</div>
											</div>
										</div>
									) : null}
								</div>
							)}

							{/* Body */}
							<div className="px-3 py-2 pt-3">
								<div className="whitespace-pre-wrap text-sm text-gray-900 break-words">{bodyWithExamples || "Digite o conteúdo da mensagem..."}</div>

								{/* Footer */}
								{rodape && (
									<div className="mt-2">
										<p className="text-xs text-[#00a884]">{rodape.conteudo}</p>
									</div>
								)}

								{/* Timestamp */}
								<div className="flex items-center justify-end gap-1 mt-1">
									<span className="text-[10px] text-gray-500">{currentTime}</span>
								</div>
							</div>

							{/* Buttons */}
							{botoes && botoes.length > 0 && (
								<div className="border-t border-gray-200">
									{botoes.map((botao, index) => (
										<div key={index.toString()} className="border-b border-gray-200 last:border-b-0 py-2.5 px-4 text-center">
											<button type="button" className="text-sm font-medium text-[#00a884] disabled:cursor-default w-full" disabled>
												{botao.tipo === "quick_reply" && "↩️ "}
												{botao.tipo === "url" && "🔗 "}
												{botao.tipo === "phone_number" && "📞 "}
												{botao.texto || "Texto do botão"}
											</button>
										</div>
									))}
								</div>
							)}
						</div>
					</div>
				</div>

				{/* Info */}
				<div className="w-full max-w-md space-y-2 mt-2">
					<div className="flex items-center justify-between text-xs">
						<span className="text-primary/60">Caracteres no corpo:</span>
						<span className={bodyText.length > 1024 ? "text-red-500 font-semibold" : "text-primary/80"}>{bodyText.length} / 1024</span>
					</div>

					{cabecalho?.tipo === "text" && cabecalho.conteudo && (
						<div className="flex items-center justify-between text-xs">
							<span className="text-primary/60">Caracteres no cabeçalho:</span>
							<span className={cabecalho.conteudo.length > 60 ? "text-red-500 font-semibold" : "text-primary/80"}>{cabecalho.conteudo.length} / 60</span>
						</div>
					)}

					{rodape?.conteudo && (
						<div className="flex items-center justify-between text-xs">
							<span className="text-primary/60">Caracteres no rodapé:</span>
							<span className={rodape.conteudo.length > 60 ? "text-red-500 font-semibold" : "text-primary/80"}>{rodape.conteudo.length} / 60</span>
						</div>
					)}

					{botoes && botoes.length > 0 && (
						<div className="flex items-center justify-between text-xs">
							<span className="text-primary/60">Número de botões:</span>
							<span className={botoes.length > 10 ? "text-red-500 font-semibold" : "text-primary/80"}>{botoes.length} / 10</span>
						</div>
					)}
				</div>
			</div>
		</ResponsiveMenuSection>
	);
}

export default TemplatePreview;
