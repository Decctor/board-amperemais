import { Button } from "@/components/ui/button";
import { uploadChatMedia } from "@/lib/files-storage/chat-media";
import { FileImage, FileText, Paperclip, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

type FileUploadComponentProps = {
	onFileSelect: ({ file, fileName, storageId, publicUrl }: { file: File; fileName: string; storageId: string; publicUrl: string }) => void;
	disabled?: boolean;
	chatId: string;
	organizacaoId: string;
};

// WhatsApp file size limits
const FILE_SIZE_LIMITS = {
	image: 5 * 1024 * 1024, // 5MB for images
	document: 16 * 1024 * 1024, // 16MB for documents
};

// Supported file types
const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
const SUPPORTED_DOCUMENT_TYPES = [
	"application/pdf",
	"application/msword",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	"application/vnd.ms-excel",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	"text/plain",
	"text/csv",
];

function FileUploadComponent({ onFileSelect, disabled = false, chatId, organizacaoId }: FileUploadComponentProps) {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [isUploading, setIsUploading] = useState(false);
	const [selectedFile, setSelectedFile] = useState<File | null>(null);

	const validateFile = (file: File): { isValid: boolean; error?: string; fileType?: "image" | "document" } => {
		// Check if it's an image
		if (SUPPORTED_IMAGE_TYPES.includes(file.type)) {
			if (file.size > FILE_SIZE_LIMITS.image) {
				return {
					isValid: false,
					error: `Imagem muito grande. Tamanho máximo: ${FILE_SIZE_LIMITS.image / (1024 * 1024)}MB`,
				};
			}
			return { isValid: true, fileType: "image" };
		}

		// Check if it's a document
		if (SUPPORTED_DOCUMENT_TYPES.includes(file.type)) {
			if (file.size > FILE_SIZE_LIMITS.document) {
				return {
					isValid: false,
					error: `Documento muito grande. Tamanho máximo: ${FILE_SIZE_LIMITS.document / (1024 * 1024)}MB`,
				};
			}
			return { isValid: true, fileType: "document" };
		}

		return {
			isValid: false,
			error: "Tipo de arquivo não suportado. Suportados: imagens (JPEG, PNG, GIF, WebP) e documentos (PDF, Word, Excel, TXT, CSV)",
		};
	};

	const handleFileSelect = async (file: File) => {
		const validation = validateFile(file);
		if (!validation.isValid) {
			toast.error(validation.error || "Arquivo inválido");
			return;
		}

		setSelectedFile(file);
		setIsUploading(true);

		try {
			// Upload file to Supabase Storage
			const result = await uploadChatMedia({
				file,
				organizacaoId,
				chatId,
				mimeType: file.type,
				filename: file.name,
			});

			// Call parent callback with both storageId and publicUrl
			onFileSelect({
				file,
				fileName: file.name,
				storageId: result.storageId,
				publicUrl: result.publicUrl,
			});

			toast.success("Arquivo carregado com sucesso!");
		} catch (error) {
			console.error("Error uploading file:", error);
			toast.error("Erro ao carregar arquivo");
		} finally {
			setIsUploading(false);
			setSelectedFile(null);
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
		}
	};

	const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (file) {
			handleFileSelect(file);
		}
	};

	const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
		event.preventDefault();
		const file = event.dataTransfer.files?.[0];
		if (file) {
			handleFileSelect(file);
		}
	};

	const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
		event.preventDefault();
	};

	const openFileDialog = () => {
		if (!disabled && !isUploading) {
			fileInputRef.current?.click();
		}
	};

	const cancelUpload = () => {
		setIsUploading(false);
		setSelectedFile(null);
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	};

	return (
		<div className="relative">
			<input
				ref={fileInputRef}
				type="file"
				accept={[...SUPPORTED_IMAGE_TYPES, ...SUPPORTED_DOCUMENT_TYPES].join(",")}
				onChange={handleInputChange}
				className="hidden"
				disabled={disabled || isUploading}
			/>

			{isUploading && selectedFile ? (
				<div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
					<div className="flex items-center gap-2 flex-1">
						{SUPPORTED_IMAGE_TYPES.includes(selectedFile.type) ? (
							<FileImage className="w-4 h-4 text-blue-600" />
						) : (
							<FileText className="w-4 h-4 text-blue-600" />
						)}
						<div className="flex-1 min-w-0">
							<p className="text-sm font-medium text-blue-900 dark:text-blue-100 truncate">{selectedFile.name}</p>
							<p className="text-xs text-blue-600 dark:text-blue-400">Enviando...</p>
						</div>
					</div>
					<Button variant="ghost" size="icon" className="h-6 w-6" onClick={cancelUpload} aria-label="Cancelar upload">
						<X className="w-4 h-4" />
					</Button>
				</div>
			) : (
				<div onDrop={handleDrop} onDragOver={handleDragOver} className="flex items-center justify-center">
					<Button
						type="button"
						size="icon"
						onClick={openFileDialog}
						disabled={disabled || isUploading}
						title="Anexar arquivo"
						aria-label="Anexar arquivo"
						variant="ghost"
					>
						<Paperclip className="w-4 h-4" />
					</Button>
				</div>
			)}
		</div>
	);
}

export default FileUploadComponent;
