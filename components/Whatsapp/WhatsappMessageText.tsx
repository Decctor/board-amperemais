"use client";

import { cn } from "@/lib/utils";
import { Fragment, type ReactNode, useMemo } from "react";

type InlineToken =
	| { type: "text"; value: string }
	| { type: "link"; value: string; href: string }
	| { type: "bold"; children: InlineToken[] }
	| { type: "italic"; children: InlineToken[] }
	| { type: "strike"; children: InlineToken[] }
	| { type: "code"; value: string }
	| { type: "variable"; identifier: string; raw: string };

export type TRenderWhatsappVariable = (props: { identifier: string; raw: string }) => ReactNode;

export type TWhatsappTextRenderOptions = {
	onPrimary?: boolean;
	renderVariable?: TRenderWhatsappVariable;
};

const URL_PATTERN = /^(https?:\/\/[^\s<]+|www\.[^\s<]+)/i;
const TRAILING_URL_PUNCTUATION = /[),.;:!?]+$/;
const VARIABLE_PATTERN = /^\{\{\s*([^{}\n]+?)\s*\}\}/;

const FORMATTING_BY_DELIMITER = {
	"*": "bold",
	_: "italic",
	"~": "strike",
} as const;

function isAlphaNumeric(value: string | undefined) {
	return !!value && /[\p{L}\p{N}]/u.test(value);
}

function isWhitespace(value: string | undefined) {
	return !!value && /\s/u.test(value);
}

function normalizeHref(value: string) {
	return value.startsWith("www.") ? `https://${value}` : value;
}

function splitUrl(rawValue: string) {
	const value = rawValue.replace(TRAILING_URL_PUNCTUATION, "");
	return {
		value,
		href: normalizeHref(value),
		trailing: rawValue.slice(value.length),
	};
}

// Regras de abertura/fechamento fiéis ao WhatsApp: um delimitador solto no meio de
// uma palavra ou encostado em espaço não vira formatação.
function canOpenFormatting(source: string, index: number) {
	const previous = source[index - 1];
	const next = source[index + 1];
	return !isAlphaNumeric(previous) && !isWhitespace(next);
}

function canCloseFormatting(source: string, index: number) {
	const previous = source[index - 1];
	const next = source[index + 1];
	return !isWhitespace(previous) && !isAlphaNumeric(next);
}

function findClosingDelimiter(source: string, delimiter: string, startIndex: number) {
	for (let index = startIndex; index < source.length; index++) {
		if (source[index] !== delimiter || !canCloseFormatting(source, index)) continue;

		const content = source.slice(startIndex, index);
		if (content.trim().length === 0) continue;

		return index;
	}

	return -1;
}

function parseInlineText(source: string): InlineToken[] {
	const tokens: InlineToken[] = [];
	let plainText = "";
	let index = 0;

	function flushPlainText() {
		if (!plainText) return;
		tokens.push({ type: "text", value: plainText });
		plainText = "";
	}

	while (index < source.length) {
		const remaining = source.slice(index);
		const urlMatch = URL_PATTERN.exec(remaining);

		if (urlMatch) {
			flushPlainText();

			const { value, href, trailing } = splitUrl(urlMatch[0]);
			tokens.push({ type: "link", value, href });
			if (trailing) tokens.push({ type: "text", value: trailing });

			index += urlMatch[0].length;
			continue;
		}

		const variableMatch = VARIABLE_PATTERN.exec(remaining);

		if (variableMatch) {
			flushPlainText();
			tokens.push({ type: "variable", identifier: variableMatch[1], raw: variableMatch[0] });
			index += variableMatch[0].length;
			continue;
		}

		const char = source[index];

		if (char === "`" && !isWhitespace(source[index + 1])) {
			const closingIndex = source.indexOf("`", index + 1);
			if (closingIndex > index + 1 && source.slice(index + 1, closingIndex).trim()) {
				flushPlainText();
				tokens.push({ type: "code", value: source.slice(index + 1, closingIndex) });
				index = closingIndex + 1;
				continue;
			}
		}

		if (char === "*" || char === "_" || char === "~") {
			if (canOpenFormatting(source, index)) {
				const closingIndex = findClosingDelimiter(source, char, index + 1);

				if (closingIndex !== -1) {
					flushPlainText();
					tokens.push({
						type: FORMATTING_BY_DELIMITER[char],
						children: parseInlineText(source.slice(index + 1, closingIndex)),
					});
					index = closingIndex + 1;
					continue;
				}
			}
		}

		plainText += char;
		index++;
	}

	flushPlainText();
	return tokens;
}

function renderInlineTokens(tokens: InlineToken[], options: TWhatsappTextRenderOptions, keyPrefix: string): ReactNode {
	const { onPrimary = false, renderVariable } = options;

	return tokens.map((token, index) => {
		const key = `${keyPrefix}-${index}`;

		if (token.type === "text") return <Fragment key={key}>{token.value}</Fragment>;

		if (token.type === "variable") {
			return <Fragment key={key}>{renderVariable ? renderVariable({ identifier: token.identifier, raw: token.raw }) : token.raw}</Fragment>;
		}

		if (token.type === "link") {
			return (
				<a
					key={key}
					href={token.href}
					target="_blank"
					rel="noreferrer noopener"
					className={cn(
						"font-medium underline decoration-1 underline-offset-2 transition-opacity hover:opacity-80",
						onPrimary ? "text-white decoration-white/65" : "text-sky-600 decoration-sky-600/50",
					)}
				>
					{token.value}
				</a>
			);
		}

		if (token.type === "bold") {
			return (
				<strong key={key} className="font-semibold">
					{renderInlineTokens(token.children, options, key)}
				</strong>
			);
		}

		if (token.type === "italic") {
			return (
				<em key={key} className="italic">
					{renderInlineTokens(token.children, options, key)}
				</em>
			);
		}

		if (token.type === "strike") {
			return (
				<del key={key} className="opacity-80">
					{renderInlineTokens(token.children, options, key)}
				</del>
			);
		}

		return (
			<code key={key} className={cn("rounded px-1 py-0.5 font-mono text-[0.86em]", onPrimary ? "bg-white/15 text-white" : "bg-muted text-foreground")}>
				{token.value}
			</code>
		);
	});
}

/**
 * Converte texto com formatação do WhatsApp (*negrito*, _itálico_, ~tachado~, `mono`,
 * links e variáveis {{...}}) em nós React formatados, sem dangerouslySetInnerHTML.
 * Use dentro de um elemento com `whitespace-pre-wrap`.
 */
export function renderWhatsappTextWithFormatting(text: string, options: TWhatsappTextRenderOptions = {}): ReactNode {
	return text.split("\n").map((line, index) => (
		<Fragment key={index}>
			{index > 0 ? <br /> : null}
			{renderInlineTokens(parseInlineText(line), options, `line-${index}`)}
		</Fragment>
	));
}

type WhatsappMessageTextProps = {
	text: string;
	className?: string;
	onPrimary?: boolean;
	renderVariable?: TRenderWhatsappVariable;
};

export function WhatsappMessageText({ text, className, onPrimary = false, renderVariable }: WhatsappMessageTextProps) {
	const content = useMemo(() => renderWhatsappTextWithFormatting(text, { onPrimary, renderVariable }), [text, onPrimary, renderVariable]);

	return <p className={cn("whitespace-pre-wrap break-words", className)}>{content}</p>;
}
