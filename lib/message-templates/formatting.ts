export function sanitizeMessageTemplateParameter(value: unknown) {
	if (value === null || value === undefined) return "";
	return String(value)
		.replace(/[\n\r\t]+/g, " ")
		.replace(/\s{4,}/g, "   ")
		.trim();
}

export function convertHtmlToPlainMessageText(html: string): string {
	return html
		.replace(/<\/p>\s*<p[^>]*>/gi, "\n")
		.replace(/<p[^>]*>/gi, "")
		.replace(/<\/p>/gi, "")
		.replace(/<br\s*\/?>/gi, "\n")
		.replace(/<[^>]+>/g, "")
		.replace(/&nbsp;/g, " ")
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/[ \t]+/g, " ")
		.replace(/\n\s+/g, "\n")
		.replace(/\s+\n/g, "\n")
		.trim();
}

export function convertHtmlToWhatsappText(html: string): string {
	return html
		.replace(/<strong>(.*?)<\/strong>/gi, "*$1*")
		.replace(/<b>(.*?)<\/b>/gi, "*$1*")
		.replace(/<em>(.*?)<\/em>/gi, "_$1_")
		.replace(/<i>(.*?)<\/i>/gi, "_$1_")
		.replace(/<s>(.*?)<\/s>/gi, "~$1~")
		.replace(/<del>(.*?)<\/del>/gi, "~$1~")
		.replace(/<br\s*\/?>/gi, "\n")
		.replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
		.replace(/<p[^>]*>/gi, "")
		.replace(/<\/p>/gi, "\n")
		.replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, "*$1*\n")
		.replace(/<ul[^>]*>/gi, "")
		.replace(/<\/ul>/gi, "\n")
		.replace(/<ol[^>]*>/gi, "")
		.replace(/<\/ol>/gi, "\n")
		.replace(/<li[^>]*>(.*?)<\/li>/gi, "• $1\n")
		.replace(/<span[^>]+data-(?:label|id)=["']([^"']+)["'][^>]*>.*?<\/span>/gi, (match, label) => {
			const variableMatch = String(match).match(/\{\{(\d+|[a-zA-Z0-9_]+)\}\}/);
			return variableMatch ? variableMatch[0] : `{{${label}}}`;
		})
		.replace(/<[^>]+>/g, "")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

export function formatPhoneAsWhatsappId(phone: string) {
	const onlyNumbers = phone.replace(/[^0-9]/g, "");
	return onlyNumbers.startsWith("55") ? onlyNumbers : `55${onlyNumbers}`;
}
