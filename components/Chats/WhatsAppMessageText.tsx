"use client";

import { cn } from "@/lib/utils";
import { Fragment, type ReactNode, useMemo } from "react";

/**
 * Renderiza o texto de uma mensagem com a formatação do WhatsApp:
 * `*negrito*`, `_itálico_`, `~riscado~`, `` `monoespaçado` `` e autolink.
 *
 * Tokenizador em vez de regex por regra. As três coisas que uma abordagem por regex
 * erra e que o WhatsApp acerta:
 *
 * 1. **Fronteira de palavra.** `2*3*4` é aritmética, não negrito. Um delimitador só
 *    abre quando o caractere anterior não é alfanumérico e o seguinte não é espaço.
 * 2. **Pontuação final do link.** Em "veja em https://site.com/x." o ponto é da frase,
 *    não da URL.
 * 3. **Conteúdo vazio.** `* *` e `**` são literais, não negrito de nada.
 *
 * Nada de `dangerouslySetInnerHTML`: o texto vem do cliente final e é hostil por
 * definição — o parser produz nós React, então nada do que ele escrever vira markup.
 */

type InlineToken =
	| { type: "text"; value: string }
	| { type: "link"; value: string; href: string }
	| { type: "bold"; children: InlineToken[] }
	| { type: "italic"; children: InlineToken[] }
	| { type: "strike"; children: InlineToken[] }
	| { type: "code"; value: string };

type WhatsAppMessageTextProps = {
	text: string;
	/** Bolhas de saída e de falha têm fundo colorido; links e code precisam inverter. */
	onColoredSurface: boolean;
	className?: string;
};

const URL_PATTERN = /^(https?:\/\/[^\s<]+|www\.[^\s<]+)/i;
const TRAILING_URL_PUNCTUATION = /[),.;:!?]+$/;

const FORMATTING_BY_DELIMITER = { "*": "bold", _: "italic", "~": "strike" } as const;

function isAlphaNumeric(value: string | undefined) {
	return !!value && /[\p{L}\p{N}]/u.test(value);
}

function isWhitespace(value: string | undefined) {
	return !!value && /\s/u.test(value);
}

function splitUrl(rawValue: string) {
	const value = rawValue.replace(TRAILING_URL_PUNCTUATION, "");
	return { value, href: value.startsWith("www.") ? `https://${value}` : value, trailing: rawValue.slice(value.length) };
}

function canOpenFormatting(source: string, index: number) {
	return !isAlphaNumeric(source[index - 1]) && !isWhitespace(source[index + 1]);
}

function canCloseFormatting(source: string, index: number) {
	return !isWhitespace(source[index - 1]) && !isAlphaNumeric(source[index + 1]);
}

function findClosingDelimiter(source: string, delimiter: string, startIndex: number) {
	for (let index = startIndex; index < source.length; index++) {
		if (source[index] !== delimiter || !canCloseFormatting(source, index)) continue;
		if (source.slice(startIndex, index).trim().length === 0) continue;
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
		const urlMatch = URL_PATTERN.exec(source.slice(index));
		if (urlMatch) {
			flushPlainText();
			const { value, href, trailing } = splitUrl(urlMatch[0]);
			tokens.push({ type: "link", value, href });
			if (trailing) tokens.push({ type: "text", value: trailing });
			index += urlMatch[0].length;
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

		if ((char === "*" || char === "_" || char === "~") && canOpenFormatting(source, index)) {
			const closingIndex = findClosingDelimiter(source, char, index + 1);
			if (closingIndex !== -1) {
				flushPlainText();
				tokens.push({ type: FORMATTING_BY_DELIMITER[char], children: parseInlineText(source.slice(index + 1, closingIndex)) });
				index = closingIndex + 1;
				continue;
			}
		}

		plainText += char;
		index++;
	}

	flushPlainText();
	return tokens;
}

function renderInlineTokens(tokens: InlineToken[], onColoredSurface: boolean, keyPrefix: string): ReactNode {
	return tokens.map((token, index) => {
		const key = `${keyPrefix}-${index}`;

		if (token.type === "text") return <Fragment key={key}>{token.value}</Fragment>;

		if (token.type === "link") {
			return (
				<a
					key={key}
					href={token.href}
					target="_blank"
					rel="noreferrer noopener"
					className={cn(
						"font-medium underline decoration-1 underline-offset-2 transition-opacity hover:opacity-80",
						// Sobre fundo colorido o azul da marca sumiria; herdar a cor do texto
						// mantém o contraste que a própria bolha já garante.
						onColoredSurface ? "text-current decoration-current/60" : "text-primary decoration-primary/50",
					)}
				>
					{token.value}
				</a>
			);
		}

		if (token.type === "bold") {
			return (
				<strong key={key} className="font-semibold">
					{renderInlineTokens(token.children, onColoredSurface, key)}
				</strong>
			);
		}

		if (token.type === "italic") {
			return (
				<em key={key} className="italic">
					{renderInlineTokens(token.children, onColoredSurface, key)}
				</em>
			);
		}

		if (token.type === "strike") {
			return (
				<del key={key} className="opacity-80">
					{renderInlineTokens(token.children, onColoredSurface, key)}
				</del>
			);
		}

		return (
			<code key={key} className={cn("rounded px-1 py-0.5 font-mono text-[0.86em]", onColoredSurface ? "bg-current/15" : "bg-muted")}>
				{token.value}
			</code>
		);
	});
}

export function WhatsAppMessageText({ text, onColoredSurface, className }: WhatsAppMessageTextProps) {
	const lines = useMemo(() => text.split("\n").map((line) => parseInlineText(line)), [text]);

	return (
		<span className={cn("whitespace-pre-wrap break-words", className)}>
			{lines.map((tokens, index) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: linhas de um texto imutável
				<Fragment key={index}>
					{index > 0 && <br />}
					{renderInlineTokens(tokens, onColoredSurface, `line-${index}`)}
				</Fragment>
			))}
		</span>
	);
}
