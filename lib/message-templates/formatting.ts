export function sanitizeMessageTemplateParameter(value: unknown) {
	if (value === null || value === undefined) return "";
	return String(value)
		.replace(/[\n\r\t]+/g, " ")
		.replace(/\s{4,}/g, "   ")
		.trim();
}

const EMAIL_ALLOWED_TAGS = new Set(["p", "br", "strong", "b", "em", "i", "s", "del", "ul", "ol", "li"]);

function decodeHtmlEntities(text: string) {
	return text
		.replace(/&nbsp;/g, " ")
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'");
}

function applyWhatsappMarkdownToTextSegment(text: string) {
	return text
		.replace(/\*([^*\n]+)\*/g, "<strong>$1</strong>")
		.replace(/_([^_\n]+)_/g, "<em>$1</em>")
		.replace(/~([^~\n]+)~/g, "<del>$1</del>");
}

function applyWhatsappMarkdownToHtml(html: string) {
	return html
		.split(/(<[^>]+>)/g)
		.map((part) => (part.startsWith("<") ? part : applyWhatsappMarkdownToTextSegment(part)))
		.join("");
}

function normalizeSemanticHtmlTags(html: string) {
	return html
		.replace(/<b(\s[^>]*)?>/gi, "<strong>")
		.replace(/<\/b>/gi, "</strong>")
		.replace(/<i(\s[^>]*)?>/gi, "<em>")
		.replace(/<\/i>/gi, "</em>");
}

function sanitizeEmailHtml(html: string) {
	return html
		.replace(/<script[\s\S]*?<\/script>/gi, "")
		.replace(/<style[\s\S]*?<\/style>/gi, "")
		.replace(/<\/?([a-z0-9]+)(?:\s[^>]*)?>/gi, (match, tagName: string) => {
			const tag = tagName.toLowerCase();
			if (!EMAIL_ALLOWED_TAGS.has(tag)) return "";
			if (match.startsWith("</")) return `</${tag}>`;
			if (tag === "br") return "<br />";
			return `<${tag}>`;
		});
}

function normalizeEmailParagraphStyles(html: string) {
	const withParagraphStyles = html.replace(/<p>/gi, '<p style="margin:0 0 1em;">');
	if (/<(p|ul|ol|li|br)\b/i.test(withParagraphStyles)) return withParagraphStyles;
	return `<p style="margin:0;">${withParagraphStyles}</p>`;
}

export function convertHtmlToPlainMessageText(html: string): string {
	return decodeHtmlEntities(
		html
			.replace(/<\/p>\s*<p[^>]*>/gi, "\n")
			.replace(/<p[^>]*>/gi, "")
			.replace(/<\/p>/gi, "")
			.replace(/<br\s*\/?>/gi, "\n")
			.replace(/<[^>]+>/g, "")
			.replace(/[ \t]+/g, " ")
			.replace(/\n\s+/g, "\n")
			.replace(/\s+\n/g, "\n")
			.trim(),
	);
}

export function convertHtmlToEmailHtml(html: string) {
	if (!html.trim()) return "";

	let result = html
		.replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '<p style="margin:0 0 1em;"><strong>$1</strong></p>')
		.replace(/<br\s*\/?>/gi, "<br />")
		.replace(/<\/p>\s*<p[^>]*>/gi, "</p><p>")
		.replace(/<p[^>]*>/gi, "<p>")
		.replace(/<\/p>/gi, "</p>");

	result = normalizeSemanticHtmlTags(result);
	result = applyWhatsappMarkdownToHtml(result);
	result = sanitizeEmailHtml(result);
	result = decodeHtmlEntities(result);
	result = normalizeEmailParagraphStyles(result);

	return result.trim();
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
