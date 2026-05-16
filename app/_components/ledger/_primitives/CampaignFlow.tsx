"use client";

import { cn } from "@/lib/utils";
import { CheckCircle2, MessageCircle, Sparkles, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Event = {
	time: string;
	customer: string;
	action: string;
	tag: "msg" | "lido" | "resgate" | "recebida" | "retorno" | "resp";
	highlight?: string;
};

const EVENTS: Event[] = [
	{ time: "14:23", customer: "Maria Souza", action: "Cashback expira · mensagem enviada", tag: "msg" },
	{ time: "14:18", customer: "João Santos", action: "Voltou à loja", tag: "retorno", highlight: "+R$ 187,00" },
	{ time: "14:11", customer: "Ana Lima", action: "Resgatou cashback", tag: "resgate", highlight: "R$ 28,50" },
	{ time: "13:55", customer: "Carlos Ramos", action: "Mensagem recebida", tag: "resp" },
	{ time: "13:42", customer: "Beatriz Costa", action: "Mensagem lida", tag: "lido" },
	{ time: "13:21", customer: "Paulo Ferreira", action: "Mensagem enviada · 1ª compra +60d", tag: "msg" },
];

const TAG_STYLES: Record<Event["tag"], { label: string; cls: string }> = {
	msg: { label: "MENSAGEM", cls: "bg-[#24549c]/10 text-[#24549c]" },
	lido: { label: "LIDO", cls: "bg-[#24549c]/8 text-[#24549c]/70" },
	resgate: { label: "RESGATE", cls: "bg-[#ffb900]/22 text-[#171717]" },
	retorno: { label: "RETORNO", cls: "bg-[#16a34a]/14 text-[#16a34a]" },
	recebida: { label: "RECEBIDA", cls: "bg-[#24549c]/14 text-[#24549c]" },
	resp: { label: "RESPOSTA", cls: "bg-[#24549c]/14 text-[#24549c]" },
};

type CampaignFlowProps = {
	className?: string;
};

export function CampaignFlow({ className }: CampaignFlowProps) {
	const ref = useRef<HTMLDivElement | null>(null);
	const [visible, setVisible] = useState(0);

	useEffect(() => {
		const node = ref.current;
		if (!node) return;
		const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
		if (reduceMotion) {
			setVisible(EVENTS.length);
			return;
		}

		const obs = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						obs.disconnect();
						let i = 0;
						setVisible(0);
						const tick = () => {
							i += 1;
							setVisible(i);
							if (i < EVENTS.length) setTimeout(tick, 320);
						};
						setTimeout(tick, 420);
					}
				}
			},
			{ threshold: 0.15 },
		);
		obs.observe(node);
		return () => obs.disconnect();
	}, []);

	return (
		<div ref={ref} className={cn("relative space-y-5", className)}>
			{/* Campaign panel — TOP */}
			<div className="relative rounded-3xl bg-white border border-[#e5e5e5] shadow-[0_18px_50px_-18px_rgba(36,84,156,0.28),0_4px_8px_rgba(0,0,0,0.04)] p-5 sm:p-6">
				{/* Status header */}
				<div className="flex items-center justify-between mb-4">
					<div className="inline-flex items-center gap-2 rounded-full bg-[#16a34a]/12 text-[#16a34a] px-3 py-1.5">
						<span className="ledger-pulse-dot inline-block w-1.5 h-1.5 rounded-full bg-[#16a34a]" />
						<span className="text-[10px] font-extrabold tracking-[0.14em] uppercase">Campanha ativa</span>
					</div>
					<span className="text-[10px] font-bold tracking-[0.1em] uppercase text-[#737373] ledger-tabular">12 dias no ar</span>
				</div>

				{/* Campaign name + trigger */}
				<div className="mb-5">
					<p className="text-[10px] font-extrabold tracking-[0.16em] uppercase text-[#737373] mb-1">Campanha automática</p>
					<p className="font-extrabold text-[20px] leading-tight tracking-tight text-[#171717]">Reativação de inativos</p>
					<div className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#24549c]/10 text-[#24549c] px-3 py-1">
						<Zap className="w-3 h-3" />
						<span className="text-[11px] font-bold">Gatilho · cashback expira em 3 dias</span>
					</div>
				</div>

				{/* Stats grid */}
				<div className="grid grid-cols-3 gap-2 mb-5">
					<div className="rounded-2xl bg-[#f7f9fc] border border-[#e5e5e5] p-3 text-center">
						<p className="text-[24px] font-extrabold leading-none text-[#24549c] ledger-tabular">143</p>
						<p className="text-[9px] font-extrabold tracking-[0.1em] uppercase text-[#737373] mt-1.5">Audiência</p>
					</div>
					<div className="rounded-2xl bg-[#f7f9fc] border border-[#e5e5e5] p-3 text-center">
						<p className="text-[24px] font-extrabold leading-none text-[#24549c] ledger-tabular">480</p>
						<p className="text-[9px] font-extrabold tracking-[0.1em] uppercase text-[#737373] mt-1.5">Disparos</p>
					</div>
					<div className="rounded-2xl bg-[#ffb900]/10 border border-[#ffb900]/30 p-3 text-center">
						<p className="text-[24px] font-extrabold leading-none text-[#171717] ledger-tabular">47</p>
						<p className="text-[9px] font-extrabold tracking-[0.1em] uppercase text-[#737373] mt-1.5">Conversões</p>
					</div>
				</div>

				{/* Message preview */}
				<div className="rounded-2xl bg-[#f7f9fc] border border-[#e5e5e5] p-3.5">
					<div className="flex items-center gap-2 mb-2">
						<MessageCircle className="w-3.5 h-3.5 text-[#24549c]" />
						<p className="text-[10px] font-extrabold tracking-[0.12em] uppercase text-[#737373]">Mensagem WhatsApp · prévia</p>
					</div>
					<p className="text-[13px] text-[#171717] leading-snug">
						Oi <strong>Maria</strong>! Você tem <strong className="bg-[#ffb900]/35 px-1 rounded">R$ 28,50</strong> de cashback. Vence em 3 dias.
					</p>
				</div>
			</div>

			{/* Live events panel — BOTTOM */}
			<div className="relative rounded-3xl bg-white border border-[#e5e5e5] shadow-[0_18px_50px_-18px_rgba(36,84,156,0.18),0_2px_4px_rgba(0,0,0,0.04)] overflow-hidden">
				<div className="flex items-center justify-start px-5 py-3 border-b border-[#e5e5e5] bg-[#f7f9fc]">
					<div className="inline-flex items-center gap-2">
						<Sparkles className="w-3.5 h-3.5 text-[#24549c]" />
						<p className="text-[10px] font-extrabold tracking-[0.14em] uppercase text-[#171717]">Eventos · ao vivo</p>
					</div>
				</div>

				<ul className="divide-y divide-[#e5e5e5]">
					{EVENTS.slice(0, 5).map((ev, i) => {
						const isVisible = i < visible;
						const style = TAG_STYLES[ev.tag];
						return (
							<li
								key={ev.time + ev.customer}
								className="px-5 py-3 transition-all duration-[440ms] ease-out"
								style={{
									opacity: isVisible ? 1 : 0,
									transform: isVisible ? "translateY(0)" : "translateY(8px)",
								}}
							>
								<div className="flex items-baseline justify-between gap-2 mb-1">
									<div className="flex items-baseline gap-2 min-w-0">
										<span className="text-[10px] font-bold ledger-tabular text-[#737373] shrink-0">{ev.time}</span>
										<span className="text-[13px] font-extrabold text-[#171717] truncate">{ev.customer}</span>
									</div>
									<span
										className={cn("inline-flex items-center text-[9px] font-extrabold tracking-[0.1em] uppercase rounded-full px-2 py-0.5 shrink-0", style.cls)}
									>
										{style.label}
									</span>
								</div>
								<div className="flex items-center justify-between gap-2">
									<p className="text-[12px] text-[#737373] leading-snug">{ev.action}</p>
									{ev.highlight ? (
										<p className="text-[12px] font-extrabold text-[#171717] ledger-tabular shrink-0">{ev.highlight}</p>
									) : (
										<CheckCircle2 className="w-3 h-3 text-[#16a34a] shrink-0" />
									)}
								</div>
							</li>
						);
					})}
				</ul>
			</div>
		</div>
	);
}
