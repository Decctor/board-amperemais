"use client";

import { Fragment, type ReactNode, useMemo } from "react";

/**
 * Renderiza o texto de uma mensagem com a formatação do WhatsApp.
 *
 * `*negrito*`, `_itálico_`, `~riscado~`, `` `monoespaçado` `` e autolink. Sem
 * `dangerouslySetInnerHTML`: o conteúdo vem do cliente final e é hostil por definição —
 * o parser produz nós React, então nada do que o cliente escrever vira markup.
 */

type WhatsAppMessageTextProps = {
	text: string;
	className?: string;
};

const URL_PATTERN = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;

function linkify(text: string, keyPrefix: string): ReactNode[] {
	const nodes: ReactNode[] = [];
	let lastIndex = 0;
	let match: RegExpExecArray | null;
	URL_PATTERN.lastIndex = 0;

	// biome-ignore lint/suspicious/noAssignInExpressions: iteração padrão de regex global
	while ((match = URL_PATTERN.exec(text)) !== null) {
		if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
		const raw = match[0];
		const href = raw.startsWith("http") ? raw : `https://${raw}`;
		nodes.push(
			<a
				key={`${keyPrefix}-link-${match.index}`}
				href={href}
				target="_blank"
				rel="noopener noreferrer"
				className="underline underline-offset-2 hover:opacity-80"
			>
				{raw}
			</a>,
		);
		lastIndex = match.index + raw.length;
	}
	if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
	return nodes;
}

type TFormatRule = { pattern: RegExp; render: (content: ReactNode[], key: string) => ReactNode };

const FORMAT_RULES: TFormatRule[] = [
	{ pattern: /`([^`\n]+)`/, render: (content, key) => <code key={key} className="rounded bg-black/10 px-1 py-0.5 font-mono text-[0.9em]">{content}</code> },
	{ pattern: /\*([^*\n]+)\*/, render: (content, key) => <strong key={key}>{content}</strong> },
	{ pattern: /_([^_\n]+)_/, render: (content, key) => <em key={key}>{content}</em> },
	{ pattern: /~([^~\n]+)~/, render: (content, key) => <s key={key}>{content}</s> },
];

function parseSegment(text: string, ruleIndex: number, keyPrefix: string): ReactNode[] {
	if (ruleIndex >= FORMAT_RULES.length) return linkify(text, keyPrefix);

	const rule = FORMAT_RULES[ruleIndex];
	const nodes: ReactNode[] = [];
	let rest = text;
	let occurrence = 0;

	while (rest.length > 0) {
		const match = rule.pattern.exec(rest);
		if (!match || match.index === undefined) {
			nodes.push(...parseSegment(rest, ruleIndex + 1, `${keyPrefix}-${ruleIndex}-${occurrence}`));
			break;
		}
		if (match.index > 0) {
			nodes.push(...parseSegment(rest.slice(0, match.index), ruleIndex + 1, `${keyPrefix}-${ruleIndex}-pre${occurrence}`));
		}
		// O conteúdo interno continua a partir da PRÓXIMA regra: sem isso, `*_a_*` perderia
		// o itálico, e um marcador dentro de si mesmo entraria em recursão infinita.
		const inner = parseSegment(match[1], ruleIndex + 1, `${keyPrefix}-${ruleIndex}-in${occurrence}`);
		nodes.push(rule.render(inner, `${keyPrefix}-${ruleIndex}-${occurrence}`));
		rest = rest.slice(match.index + match[0].length);
		occurrence++;
	}

	return nodes;
}

export function WhatsAppMessageText({ text, className }: WhatsAppMessageTextProps) {
	const lines = useMemo(() => text.split("\n"), [text]);

	return (
		<span className={className}>
			{lines.map((line, index) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: linhas de um texto imutável
				<Fragment key={index}>
					{index > 0 && <br />}
					{parseSegment(line, 0, `l${index}`)}
				</Fragment>
			))}
		</span>
	);
}
