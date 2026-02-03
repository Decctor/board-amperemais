import axios from "axios";

const GRAPH_API_BASE_URL = "https://graph.facebook.com/v23.0";

/**
 * Constraints for template media files by header type
 */
export const TEMPLATE_MEDIA_CONSTRAINTS = {
	image: {
		maxSize: 5 * 1024 * 1024, // 5 MB
		types: ["image/jpeg", "image/png"],
		extensions: [".jpg", ".jpeg", ".png"],
		label: "Imagem",
		description: "JPEG ou PNG, máximo 5MB",
	},
	video: {
		maxSize: 16 * 1024 * 1024, // 16 MB
		types: ["video/mp4", "video/3gpp"],
		extensions: [".mp4", ".3gp"],
		label: "Vídeo",
		description: "MP4 ou 3GPP, máximo 16MB",
	},
	document: {
		maxSize: 100 * 1024 * 1024, // 100 MB
		types: ["application/pdf"],
		extensions: [".pdf"],
		label: "Documento",
		description: "PDF, máximo 100MB",
	},
} as const;

export type TemplateMediaHeaderType = keyof typeof TEMPLATE_MEDIA_CONSTRAINTS;

/**
 * Validates a file against template media constraints
 */
export function validateTemplateMediaFile(
	file: { type: string; size: number },
	headerType: TemplateMediaHeaderType,
): { valid: boolean; error?: string } {
	const constraints = TEMPLATE_MEDIA_CONSTRAINTS[headerType];

	if (!constraints.types.includes(file.type as never)) {
		return {
			valid: false,
			error: `Formato não suportado. Formatos aceitos: ${constraints.extensions.join(", ")}`,
		};
	}

	if (file.size > constraints.maxSize) {
		const maxSizeMB = constraints.maxSize / (1024 * 1024);
		return {
			valid: false,
			error: `Arquivo muito grande. Tamanho máximo: ${maxSizeMB}MB`,
		};
	}

	return { valid: true };
}

type StartMetaResumableUploadParams = {
	appId: string;
	accessToken: string;
	fileLength: number;
	fileName: string;
	fileType: string;
};

type StartMetaResumableUploadResponse = {
	uploadSessionId: string;
};

/**
 * Step 1: Creates a resumable upload session with Meta
 * @see https://developers.facebook.com/docs/graph-api/guides/upload
 */
export async function startMetaResumableUpload({
	appId,
	accessToken,
	fileLength,
	fileName,
	fileType,
}: StartMetaResumableUploadParams): Promise<StartMetaResumableUploadResponse> {
	const response = await axios.post(
		`${GRAPH_API_BASE_URL}/${appId}/uploads`,
		{
			file_length: fileLength,
			file_name: fileName,
			file_type: fileType,
		},
		{
			headers: {
				Authorization: `Bearer ${accessToken}`,
				"Content-Type": "application/json",
			},
		},
	);

	return {
		uploadSessionId: response.data.id,
	};
}

type UploadFileDataToMetaParams = {
	uploadSessionId: string;
	accessToken: string;
	fileBuffer: Buffer;
};

type UploadFileDataToMetaResponse = {
	headerHandle: string;
};

/**
 * Step 2: Uploads the binary file data to Meta using the session ID
 * @see https://developers.facebook.com/docs/graph-api/guides/upload
 */
export async function uploadFileDataToMeta({
	uploadSessionId,
	accessToken,
	fileBuffer,
}: UploadFileDataToMetaParams): Promise<UploadFileDataToMetaResponse> {
	const response = await axios.post(`${GRAPH_API_BASE_URL}/${uploadSessionId}`, fileBuffer, {
		headers: {
			Authorization: `OAuth ${accessToken}`,
			file_offset: "0",
			"Content-Type": "application/octet-stream",
		},
	});

	return {
		headerHandle: response.data.h,
	};
}

type UploadTemplateMediaToMetaParams = {
	appId: string;
	accessToken: string;
	fileBuffer: Buffer;
	fileName: string;
	fileType: string;
};

type UploadTemplateMediaToMetaResponse = {
	headerHandle: string;
};

/**
 * Combined function: Creates upload session and uploads file in one step
 */
export async function uploadTemplateMediaToMeta({
	appId,
	accessToken,
	fileBuffer,
	fileName,
	fileType,
}: UploadTemplateMediaToMetaParams): Promise<UploadTemplateMediaToMetaResponse> {
	console.log(`[INFO] [META_MEDIA_UPLOAD] Starting upload for file: ${fileName} (${fileType}, ${fileBuffer.length} bytes)`);

	// Step 1: Create upload session
	const { uploadSessionId } = await startMetaResumableUpload({
		appId,
		accessToken,
		fileLength: fileBuffer.length,
		fileName,
		fileType,
	});

	console.log(`[INFO] [META_MEDIA_UPLOAD] Upload session created: ${uploadSessionId}`);

	// Step 2: Upload file data
	const { headerHandle } = await uploadFileDataToMeta({
		uploadSessionId,
		accessToken,
		fileBuffer,
	});

	console.log(`[INFO] [META_MEDIA_UPLOAD] Upload complete. Header handle: ${headerHandle}`);

	return { headerHandle };
}

type FetchAndUploadToMetaParams = {
	fileUrl: string;
	appId: string;
	accessToken: string;
};

type FetchAndUploadToMetaResponse = {
	headerHandle: string;
};

/**
 * Fetches a file from a URL (e.g., Supabase) and uploads it to Meta
 * This is used server-side when creating templates with media headers
 */
export async function fetchAndUploadToMeta({
	fileUrl,
	appId,
	accessToken,
}: FetchAndUploadToMetaParams): Promise<FetchAndUploadToMetaResponse> {
	console.log(`[INFO] [META_MEDIA_UPLOAD] Fetching file from URL: ${fileUrl}`);

	// Fetch the file from the URL
	const response = await fetch(fileUrl);

	if (!response.ok) {
		throw new Error(`Failed to fetch file from URL: ${response.status} ${response.statusText}`);
	}

	const arrayBuffer = await response.arrayBuffer();
	const buffer = Buffer.from(arrayBuffer);

	// Get content type from response headers
	const contentType = response.headers.get("content-type") || "application/octet-stream";

	// Extract filename from URL
	const urlParts = fileUrl.split("/");
	const fileName = urlParts[urlParts.length - 1]?.split("?")[0] || "file";

	console.log(`[INFO] [META_MEDIA_UPLOAD] File fetched: ${fileName} (${contentType}, ${buffer.length} bytes)`);

	// Upload to Meta
	return uploadTemplateMediaToMeta({
		appId,
		accessToken,
		fileBuffer: buffer,
		fileName,
		fileType: contentType,
	});
}

/**
 * Determines if a header type is a media type that requires upload
 */
export function isMediaHeaderType(headerType: string): headerType is TemplateMediaHeaderType {
	return ["image", "video", "document"].includes(headerType);
}

/**
 * Gets the accept string for file input based on header type
 */
export function getAcceptForHeaderType(headerType: TemplateMediaHeaderType): string {
	const constraints = TEMPLATE_MEDIA_CONSTRAINTS[headerType];
	return constraints.types.join(",");
}

/**
 * Formats file size for display
 */
export function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
