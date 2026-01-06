import { uploadChatMedia } from "@/lib/files-storage/chat-media";

/**
 * Maximum file size for WhatsApp audio (16MB)
 */
export const MAX_AUDIO_SIZE = 16 * 1024 * 1024; // 16 MB

/**
 * Convert audio blob to File object with proper metadata
 * Uses the actual recorded format without modification
 */
export function blobToAudioFile(blob: Blob, mimeType?: string): File {
	const timestamp = Date.now();
	const actualType = mimeType || blob.type;

	const extension = getAudioExtension(actualType);
	const filename = `audio-${timestamp}.${extension}`;

	// Use the actual MIME type from the blob - don't fake conversions
	return new File([blob], filename, {
		type: actualType,
		lastModified: timestamp,
	});
}

/**
 * Get file extension from MIME type
 */
export function getAudioExtension(mimeType: string): string {
	const mimeToExtension: Record<string, string> = {
		"audio/webm": "webm",
		"audio/webm;codecs=opus": "webm",
		"audio/mp4": "m4a",
		"audio/ogg": "ogg",
		"audio/ogg;codecs=opus": "ogg",
		"audio/wav": "wav",
		"audio/mpeg": "mp3",
		"audio/mp3": "mp3",
		"audio/aac": "aac",
		"audio/opus": "opus",
	};

	return mimeToExtension[mimeType] || "webm";
}

/**
 * Check if audio format is WhatsApp compatible
 */
export function isWhatsAppCompatible(mimeType: string): boolean {
	const whatsappFormats = ["audio/aac", "audio/mp4", "audio/mpeg", "audio/amr", "audio/ogg", "audio/opus"];

	return whatsappFormats.some((format) => mimeType.includes(format));
}

/**
 * Validate audio file size
 */
export function validateAudioSize(blob: Blob): { isValid: boolean; error?: string } {
	if (blob.size > MAX_AUDIO_SIZE) {
		return {
			isValid: false,
			error: `Áudio muito grande. Tamanho máximo: ${MAX_AUDIO_SIZE / (1024 * 1024)}MB`,
		};
	}
	return { isValid: true };
}

/**
 * Validate audio format compatibility with WhatsApp
 */
export function validateAudioFormat(blob: Blob): { isValid: boolean; error?: string; warning?: string } {
	const mimeType = blob.type;

	if (!isWhatsAppCompatible(mimeType)) {
		return {
			isValid: false,
			error: `Formato de áudio não suportado pelo WhatsApp: ${mimeType}`,
			warning: "Seu navegador não suporta gravação em formato compatível com WhatsApp. Tente usar Firefox ou Safari.",
		};
	}

	return { isValid: true };
}

/**
 * Upload audio file to Supabase storage
 */
export async function uploadAudioToSupabase({
	audioBlob,
	chatId,
	organizacaoId,
}: {
	audioBlob: Blob;
	chatId: string;
	organizacaoId: string;
}): Promise<{ storageId: string; publicUrl: string; filename: string }> {
	console.log("[AudioUpload] Starting upload process:", {
		originalMimeType: audioBlob.type,
		originalSize: audioBlob.size,
	});

	// Validate file size
	const sizeValidation = validateAudioSize(audioBlob);
	if (!sizeValidation.isValid) {
		throw new Error(sizeValidation.error);
	}

	// Validate audio format for WhatsApp compatibility
	const formatValidation = validateAudioFormat(audioBlob);
	if (!formatValidation.isValid) {
		const errorMsg = formatValidation.error + (formatValidation.warning ? `\n\n${formatValidation.warning}` : "");
		throw new Error(errorMsg);
	}

	// Convert blob to file with the actual MIME type
	const audioFile = blobToAudioFile(audioBlob);

	console.log("[AudioUpload] Uploading audio:", {
		mimeType: audioFile.type,
		size: audioFile.size,
		filename: audioFile.name,
	});

	// Upload to Supabase Storage
	const result = await uploadChatMedia({
		file: audioFile,
		organizacaoId,
		chatId,
		mimeType: audioFile.type,
		filename: audioFile.name,
	});

	return {
		storageId: result.storageId,
		publicUrl: result.publicUrl,
		filename: audioFile.name,
	};
}

/**
 * @deprecated Use uploadAudioToSupabase instead. This function is kept for backward compatibility.
 */
export const uploadAudioToConvex = uploadAudioToSupabase;

/**
 * Format duration in seconds to MM:SS
 */
export function formatAudioDuration(seconds: number): string {
	const mins = Math.floor(seconds / 60);
	const secs = seconds % 60;
	return `${mins}:${secs.toString().padStart(2, "0")}`;
}
