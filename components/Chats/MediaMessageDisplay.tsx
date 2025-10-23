import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { Download, FileImage, FileText, Image as ImageIcon } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type MediaMessageDisplayProps = {
	storageId?: string;
	mediaUrl?: string;
	mediaType: "IMAGEM" | "DOCUMENTO" | "VIDEO" | "AUDIO";
	fileName?: string;
	fileSize?: number;
	mimeType?: string;
	caption?: string;
	onImageLoad?: () => void;
};

function MediaMessageDisplay({ storageId, mediaUrl, mediaType, fileName, fileSize, mimeType, caption, onImageLoad }: MediaMessageDisplayProps) {
	const [fileUrl, setFileUrl] = useState<string | null>(mediaUrl || null);
	const [isLoading, setIsLoading] = useState(false);
	const getFileUrl = useMutation(api.mutations.files.getFileUrl);

	useEffect(() => {
		if (storageId && !fileUrl) {
			setIsLoading(true);
			getFileUrl({ storageId: storageId as Id<"_storage"> })
				.then((url: string | null) => {
					setFileUrl(url);
				})
				.catch((error: unknown) => {
					console.error("Error getting file URL:", error);
					toast.error("Erro ao carregar arquivo");
				})
				.finally(() => {
					setIsLoading(false);
				});
		}
	}, [storageId, fileUrl, getFileUrl]);

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

	if (isLoading) {
		return (
			<div className="flex items-center gap-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg max-w-xs">
				<div className="animate-pulse flex items-center gap-2">
					<div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded" />
					<div className="flex-1">
						<div className="h-4 bg-gray-300 dark:bg-gray-600 rounded mb-1" />
						<div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-2/3" />
					</div>
				</div>
			</div>
		);
	}

	// Image display with thumbnail and click-to-expand
	if (mediaType === "IMAGEM" && fileUrl) {
		return (
			<div className="max-w-xs">
				<Dialog>
					<DialogTrigger asChild>
						<div className="cursor-pointer group relative">
							<img
								src={fileUrl}
								alt={fileName || "Imagem"}
								className="rounded-lg max-w-full h-auto group-hover:opacity-90 transition-opacity"
								style={{ maxHeight: "200px" }}
							/>
							<div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-20 rounded-lg">
								<ImageIcon className="w-8 h-8 text-white" />
							</div>
						</div>
					</DialogTrigger>
					<DialogContent className="max-w-4xl max-h-[90vh] p-0">
						<div className="relative">
							<Image src={fileUrl} alt={fileName || "Imagem"} className="w-full h-auto max-h-[80vh] object-contain" onLoad={onImageLoad} />
							<div className="absolute top-4 right-4">
								<Button variant="secondary" size="sm" onClick={handleDownload} className="bg-black bg-opacity-50 hover:bg-opacity-70 text-white">
									<Download className="w-4 h-4 mr-2" />
									Baixar
								</Button>
							</div>
						</div>
						{caption && (
							<div className="p-4 border-t">
								<p className="text-sm text-gray-600 dark:text-gray-400">{caption}</p>
							</div>
						)}
					</DialogContent>
				</Dialog>
				{caption && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{caption}</p>}
			</div>
		);
	}

	// Document display with download functionality
	return (
		<div className="flex items-center gap-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg max-w-xs">
			<div className="flex-shrink-0">
				{mediaType === "IMAGEM" ? <FileImage className="w-8 h-8 text-blue-600" /> : <FileText className="w-8 h-8 text-green-600" />}
			</div>
			<div className="flex-1 min-w-0">
				<p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{fileName || "Documento"}</p>
				<div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
					{fileSize && <span>{formatFileSize(fileSize)}</span>}
					{mimeType && fileSize && <span>•</span>}
					{mimeType && <span>{mimeType.split("/")[1]?.toUpperCase()}</span>}
				</div>
			</div>
			<Button variant="ghost" size="sm" onClick={handleDownload} disabled={!fileUrl} className="flex-shrink-0">
				<Download className="w-4 h-4" />
			</Button>
		</div>
	);
}

export default MediaMessageDisplay;
