"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

type Props = {
	label: string;
	value: string;
};

export function CopyableCode({ label, value }: Props) {
	const [copied, setCopied] = useState(false);

	async function copyValue() {
		await navigator.clipboard.writeText(value);
		setCopied(true);
		window.setTimeout(() => setCopied(false), 2000);
	}

	return (
		<div className="rounded-2xl bg-white/8 p-4 ring-1 ring-white/10">
			<p className="text-[0.68rem] font-extrabold uppercase tracking-[0.08em] text-slate-400">{label}</p>
			<code className="mt-2 block break-all text-sm font-bold text-white">{value}</code>
			<button
				type="button"
				onClick={copyValue}
				className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/16 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
			>
				{copied ? <Check className="size-3.5 text-[#FFB900]" /> : <Copy className="size-3.5" />}
				{copied ? "Endereço copiado" : "Copiar endereço"}
			</button>
		</div>
	);
}
