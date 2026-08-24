"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getFileTypeTitle } from "@/lib/files-storage";
import { cn } from "@/lib/utils";
import type { TChatMessageContentTypeEnum } from "@/schemas/enums";
import { Download, FileText, ImageOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ChatAudioPlayer } from "./ChatAudioPlayer";

/**
 * Anexo de uma mensagem de chat: imagem, vídeo, áudio ou documento.
 *
 * **Agnóstico à superfície.** O anexo é renderizado dentro de bolhas com quatro fundos
 * (card, primary, muted, destructive). Nenhuma cor é fixada: fundos derivam de
 * `bg-current/N` e texto herda a cor da bolha. A implementação anterior usava
 * `text-gray-600` e um card `bg-primary` — invisível sobre a bolha azul e fora da
 * paleta fechada do DESIGN.md.
 */

type ChatMediaAttachmentProps = {
	tipo: Exclude<TChatMessageContentTypeEnum, "TEXTO">;
	url: string | null;
	arquivoNome?: string | null;
	arquivoTamanho?: number | null;
	mimeType?: string | null;
	className?: string;
};

function formatFileSize(bytes?: number | null) {
	if (!bytes) return null;
	const units = ["B", "KB", "MB", "GB"];
	const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
	return `${Math.round((bytes / 1024 ** exponent) * 10) / 10} ${units[exponent]}`;
}

async function downloadFile(url: string, fileName: string) {
	try {
		const response = await fetch(url);
		const blob = await response.blob();
		const objectUrl = window.URL.createObjectURL(blob);
		const anchor = document.createElement("a");
		anchor.href = objectUrl;
		anchor.download = fileName;
		document.body.appendChild(anchor);
		anchor.click();
		window.URL.revokeObjectURL(objectUrl);
		anchor.remove();
	} catch {
		toast.error("Não foi possível baixar o arquivo.");
	}
}

/** Placeholder comum a mídia ausente ou quebrada — o anexo nunca some sem explicação. */
function UnavailableMedia({ label }: { label: string }) {
	return (
		<div className="flex items-center gap-2 rounded-lg bg-current/10 px-3 py-2 text-xs opacity-80">
			<ImageOff className="h-4 w-4 shrink-0" />
			<span>{label}</span>
		</div>
	);
}

export function ChatMediaAttachment({ tipo, url, arquivoNome, arquivoTamanho, mimeType, className }: ChatMediaAttachmentProps) {
	const [imageFailed, setImageFailed] = useState(false);
	const [imageLoaded, setImageLoaded] = useState(false);
	const nomeExibido = arquivoNome || "arquivo";

	if (!url) return <UnavailableMedia label="Mídia indisponível" />;

	if (tipo === "AUDIO") return <ChatAudioPlayer audioUrl={url} fileName={arquivoNome} className={className} />;

	if (tipo === "IMAGEM") {
		if (imageFailed) return <UnavailableMedia label="Imagem indisponível" />;
		return (
			<Dialog>
				<DialogTrigger asChild>
					<button
						type="button"
						aria-label={`Abrir imagem${arquivoNome ? `: ${arquivoNome}` : ""}`}
						className={cn(
							// Proporção fluida em vez de quadrado fixo: um 256x256 rígido
							// distorcia recibos e prints, que é o que mais chega no varejo.
							"group relative block w-full overflow-hidden rounded-lg bg-current/10",
							"focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-current/30",
							className,
						)}
					>
						{!imageLoaded && <div className="absolute inset-0 animate-pulse bg-current/5" />}
						{/* biome-ignore lint/performance/noImgElement: mídia dinâmica do usuário não deve passar pelo otimizador do Next */}
						<img
							src={url}
							alt={arquivoNome || "Imagem enviada na conversa"}
							width={640}
							height={480}
							loading="lazy"
							onLoad={() => setImageLoaded(true)}
							onError={() => setImageFailed(true)}
							className={cn("block h-auto w-full object-cover transition-opacity group-hover:opacity-90", imageLoaded ? "opacity-100" : "opacity-0")}
						/>
					</button>
				</DialogTrigger>
				<DialogContent className="max-w-3xl">
					<DialogTitle className="sr-only">{nomeExibido}</DialogTitle>
					<div className="flex flex-col gap-3">
						{/* biome-ignore lint/performance/noImgElement: mesma mídia dinâmica da prévia */}
						<img
							src={url}
							alt={arquivoNome || "Imagem enviada na conversa"}
							width={1600}
							height={1200}
							className="h-auto max-h-[75vh] w-full object-contain"
						/>
						<Button variant="outline" size="sm" className="self-end gap-1.5" onClick={() => downloadFile(url, nomeExibido)}>
							<Download className="h-4 w-4" />
							Baixar
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		);
	}

	if (tipo === "VIDEO") {
		// O vídeo caía no ramo de documento na implementação anterior e chegava como um
		// card com botão de download, sem reprodução.
		return (
			// biome-ignore lint/a11y/useMediaCaption: mídia enviada pelo cliente, sem legenda disponível
			<video
				src={url}
				controls
				preload="metadata"
				className={cn("w-full rounded-lg bg-current/10", className)}
				aria-label={arquivoNome || "Vídeo enviado na conversa"}
			/>
		);
	}

	// Exaustividade: um valor novo no enum sem ramo próprio caía aqui em silêncio e virava
	// um card de "arquivo" quebrado — agora vira erro de compilação.
	tipo satisfies "DOCUMENTO";

	const tamanho = formatFileSize(arquivoTamanho);
	const tipoArquivo = mimeType ? getFileTypeTitle(mimeType) : null;

	return (
		<div className={cn("flex w-full items-center gap-2.5 rounded-lg bg-current/10 p-2.5", className)}>
			<FileText className="h-5 w-5 shrink-0 opacity-70" />
			<div className="flex min-w-0 flex-1 flex-col">
				<span className="truncate text-xs font-semibold">{nomeExibido}</span>
				{(tamanho || tipoArquivo) && <span className="truncate text-[11px] opacity-70">{[tipoArquivo, tamanho].filter(Boolean).join(" · ")}</span>}
			</div>
			<button
				type="button"
				onClick={() => downloadFile(url, nomeExibido)}
				aria-label={`Baixar ${nomeExibido}`}
				className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-current/15 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-current/30"
			>
				<Download className="h-4 w-4" />
			</button>
		</div>
	);
}
