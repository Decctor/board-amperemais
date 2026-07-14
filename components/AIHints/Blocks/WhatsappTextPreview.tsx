import { renderWhatsappTextWithFormatting } from "@/components/Whatsapp/WhatsappMessageText";
import { MessageSquare } from "lucide-react";
import { SectionLabel } from "./SectionLabel";

type WhatsappTextPreviewProps = {
	text: string;
};

/**
 * Renders a WhatsApp-style message bubble from a plain text string.
 * Highlights {{variable}} placeholders inline with a teal accent.
 */
function WhatsappTextPreview({ text }: WhatsappTextPreviewProps) {
	const currentTime = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

	return (
		<div className="w-full flex flex-col gap-3">
			<SectionLabel icon={<MessageSquare />} label="PRÉVIA DA MENSAGEM" />

			{/* WhatsApp Background */}
			<div className="relative w-full rounded-lg overflow-hidden bg-[#e5ddd5]">
				{/* Background pattern */}
				<div
					className="absolute inset-0 opacity-10"
					style={{
						backgroundImage:
							"url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C%2Fg%3E%3C%2Fsvg%3E\")",
					}}
				/>

				{/* Message bubble */}
				<div className="relative p-4 flex items-start justify-end">
					<div className="bg-white rounded-lg shadow-md overflow-hidden max-w-[85%] relative">
						<div className="px-3 py-2 pt-3">
							<p className="text-sm text-gray-900 whitespace-pre-wrap break-words leading-relaxed">
								{renderWhatsappTextWithFormatting(text, {
									renderVariable: ({ raw }) => <span className="bg-[#dcf8c6] text-[#075e54] rounded px-0.5 font-medium">{raw}</span>,
								})}
							</p>

							{/* Timestamp */}
							<div className="flex items-center justify-end gap-1 mt-1">
								<span className="text-[10px] text-gray-500">{currentTime}</span>
								{/* WhatsApp double-tick */}
								<svg viewBox="0 0 16 11" width="16" height="11" className="text-[#53bdeb]" fill="currentColor" aria-hidden="true">
									<path d="M11.071.653a.56.56 0 0 0-.812.022L5.136 6.065 3.72 4.564a.561.561 0 0 0-.812.022.639.639 0 0 0 .022.854l1.822 1.93a.56.56 0 0 0 .813-.022l5.509-6.04a.639.639 0 0 0-.003-.655zm2.538 0a.56.56 0 0 0-.811.022L7.674 6.065 7.15 5.506a.561.561 0 0 0-.812.022.639.639 0 0 0 .022.854l.93.986a.56.56 0 0 0 .813-.022l5.509-6.04a.639.639 0 0 0-.003-.653z" />
								</svg>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Character count hint */}
			<p className="text-[11px] text-muted-foreground text-right -mt-1">
				{text.length} caracteres
			</p>
		</div>
	);
}

export default WhatsappTextPreview;
