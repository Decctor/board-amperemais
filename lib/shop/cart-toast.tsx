"use client";

import { Check } from "lucide-react";
import { toast } from "sonner";
import { triggerHaptic } from "./haptics";

type NotifyItemAddedArgs = {
	name: string;
	imageUrl?: string | null;
	// Org colors are passed as inline values because the Toaster is portaled to
	// document.body, outside the shop's scoped color wrapper, so `bg-brand`
	// classes wouldn't pick up the org's palette there.
	primaryColor: string;
	primaryForeground: string;
	mode?: "added" | "updated";
};

export function notifyItemAddedToCart({ name, imageUrl, primaryColor, primaryForeground, mode = "added" }: NotifyItemAddedArgs) {
	// A short, single tap. Confirmation-level feedback, not a buzz.
	triggerHaptic(12);

	const label = mode === "updated" ? "Atualizado no carrinho" : "Adicionado ao carrinho";

	toast.custom(
		(id) => (
			<button
				type="button"
				onClick={() => toast.dismiss(id)}
				className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-2.5 text-left shadow-lg"
			>
				{imageUrl ? (
					// Plain img: this renders inside Sonner's body portal, and the source is
					// an already-loaded remote thumbnail, so next/image adds no value here.
					// eslint-disable-next-line @next/next/no-img-element
					<img src={imageUrl} alt="" className="size-11 shrink-0 rounded-xl object-cover" />
				) : (
					<span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted text-base font-black text-muted-foreground/60">
						{name.charAt(0).toUpperCase()}
					</span>
				)}
				<div className="min-w-0 flex-1">
					<p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: primaryColor }}>
						{label}
					</p>
					<p className="truncate text-sm font-semibold text-foreground">{name}</p>
				</div>
				<span
					className="flex size-7 shrink-0 items-center justify-center rounded-full"
					style={{ backgroundColor: primaryColor, color: primaryForeground }}
				>
					<Check className="size-4" strokeWidth={3} />
				</span>
			</button>
		),
		{ position: "top-center", duration: 2500 },
	);
}
