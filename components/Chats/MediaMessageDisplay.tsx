import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { getFileTypeTitle } from "@/lib/files-storage";
import { getChatMediaUrl } from "@/lib/files-storage/chat-media";
import { Download, FileImage, FileText, Image as ImageIcon } from "lucide-react";
import Image from "next/image";
import { useMemo } from "react";
import { toast } from "sonner";
import { AudioPlayer } from "./MediaMessageDisplayAudioPlayer";

type MediaMessageDisplayProps = {
	storageId?: string;
	mediaUrl?: string;
	mediaType: "IMAGEM" | "DOCUMENTO" | "VIDEO" | "AUDIO";
	fileName?: string;
	fileSize?: number;
	mimeType?: string;
	caption?: string;
	onImageLoad?: () => void;
	variant?: "sent" | "received";
};

function MediaMessageDisplay({
	storageId,
	mediaUrl,
	mediaType,
	fileName,
	fileSize,
	mimeType,
	caption,
	onImageLoad,
	variant = "received",
}: MediaMessageDisplayProps) {
	// Get file URL - either from mediaUrl prop or generate from storageId using Supabase
	const fileUrl = useMemo(() => {
		if (mediaUrl) return mediaUrl;
		if (storageId) return getChatMediaUrl(storageId);
		return null;
	}, [mediaUrl, storageId]);

	const formatFileSize = (bytes?: number) => {
		if (!bytes) return "";
		const sizes = ["Bytes", "KB", "MB", "GB"];
		const i = Math.floor(Math.log(bytes) / Math.log(1024));
		return `${Math.round((bytes / 1024 ** i) * 100) / 100} ${sizes[i]}`;
	};

	const handleDownload = async () => {
		if (!fileUrl) return;

		try {
			const response = await fetch(fileUrl);
			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = fileName || "arquivo";
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
			document.body.removeChild(a);
		} catch (error) {
			console.error("Error downloading file:", error);
			toast.error("Erro ao baixar arquivo");
		}
	};

	// Image display with thumbnail and click-to-expand
	if (mediaType === "IMAGEM" && fileUrl) {
		return (
			<Dialog>
				<DialogTrigger asChild>
					<div className="flex flex-col gap-1">
						<div className="cursor-pointer group relative w-64 max-w-64 h-64 max-h-64">
							<Image src={fileUrl} alt={fileName || "Imagem"} fill className="rounded-lg group-hover:opacity-90 transition-opacity" />
							<div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-20 rounded-lg">
								<ImageIcon className="w-8 h-8 text-white" />
							</div>
						</div>
						{caption && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{caption}</p>}
					</div>
				</DialogTrigger>
				<DialogContent className="max-h-[90%]">
					<div className="flex flex-1 relative">
						<Image
							src={fileUrl}
							alt={fileName || "Imagem"}
							width={300}
							height={300}
							className="w-full h-auto max-h-[80vh] object-contain"
							onLoad={onImageLoad}
						/>
						<div className="absolute top-4 right-4">
							<Button variant="secondary" size="sm" onClick={handleDownload} className="bg-black bg-opacity-50 hover:bg-opacity-70 text-white">
								<Download className="w-4 h-4 mr-2" />
								Baixar
							</Button>
						</div>
					</div>
					{caption && (
						<div className="p-4 border-t">
							<p className="text-sm text-primary-foreground">{caption}</p>
						</div>
					)}
				</DialogContent>
			</Dialog>
		);
	}

	// Audio display with custom player
	if (mediaType === "AUDIO" && fileUrl) {
		return (
			<div className="flex flex-col gap-2">
				<AudioPlayer audioUrl={fileUrl} variant={variant} showDownload={false} />
				{caption && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{caption}</p>}
			</div>
		);
	}

	// Document display with download functionality
	return (
		<div className="flex items-center gap-3 p-3 bg-primary rounded-lg max-w-xs">
			<div className="shrink-0">
				{mediaType === "IMAGEM" ? <FileImage className="w-6 h-6 text-blue-600" /> : <FileText className="w-6 h-6 text-green-600" />}
			</div>
			<div className="flex-1 min-w-0">
				<p className="text-sm font-medium text-primary-foreground truncate">{fileName || "Documento"}</p>
				<div className="flex items-center gap-2 text-xs text-primary-foreground/80">
					{fileSize && <span>{formatFileSize(fileSize)}</span>}
					{mimeType && fileSize && <span>•</span>}
					{mimeType && <span>{getFileTypeTitle(mimeType)}</span>}
				</div>
			</div>
			<Button variant="ghost" size="fit" onClick={handleDownload} disabled={!fileUrl} className="shrink-0 p-2 rounded-full text-primary-foreground">
				<Download className="w-4 h-4" />
			</Button>
		</div>
	);
}

export default MediaMessageDisplay;
