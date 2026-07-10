"use client";

import TextInput from "@/components/Inputs/TextInput";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft, CircleCheck, CircleDashed } from "lucide-react";
import Link from "next/link";
import { useBuilderCoupon } from "./builder-provider";

export default function BuilderHeader({ backToUrl }: { backToUrl: string }) {
	const { state, updateCoupon } = useBuilderCoupon();
	const { coupon } = state;

	return (
		<header className="flex w-full flex-col gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm">
			<div className="flex w-full items-start justify-between gap-3 flex-col lg:flex-row">
				<div className="flex items-center gap-2">
					<Button type="button" variant="ghost" size="sm" className="flex items-center gap-1.5" asChild>
						<Link href={backToUrl}>
							<ArrowLeft className="h-3.5 w-3.5" />
							VOLTAR
						</Link>
					</Button>
					<div className="flex flex-col">
						<p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Novo cupom</p>
						<h1 className="text-sm font-semibold tracking-tight">CONSTRUTOR DE CUPONS</h1>
					</div>
				</div>
				<button
					type="button"
					onClick={() => updateCoupon({ ativo: !coupon.ativo })}
					className={cn(
						"flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition-colors",
						coupon.ativo
							? "bg-green-500/15 text-green-600 hover:bg-green-500/25 dark:text-green-400"
							: "bg-muted text-muted-foreground hover:bg-muted/80",
					)}
					aria-pressed={coupon.ativo}
				>
					{coupon.ativo ? <CircleCheck className="h-3.5 w-3.5" /> : <CircleDashed className="h-3.5 w-3.5" />}
					{coupon.ativo ? "Ativo" : "Inativo"}
				</button>
			</div>
			<div className="flex w-full items-start gap-2 flex-col lg:flex-row">
				<div className="w-full lg:w-2/3">
					<TextInput
						label="TÍTULO DO CUPOM"
						value={coupon.titulo}
						placeholder="Ex: 10% de boas-vindas"
						handleChange={(value) => updateCoupon({ titulo: value })}
					/>
				</div>
				<div className="w-full lg:w-1/3">
					<TextInput
						label="CÓDIGO"
						value={coupon.codigo}
						placeholder="Ex: BEMVINDO10"
						handleChange={(value) => updateCoupon({ codigo: value.toUpperCase() })}
					/>
				</div>
			</div>
		</header>
	);
}
