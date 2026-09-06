"use client";

import { Switch } from "@/components/ui/switch";
import { formatCashbackPreview } from "@/lib/onboarding/copy";
import { cn } from "@/lib/utils";
import type { TUseOrganizationOnboardingState } from "@/state-hooks/use-organization-onboarding-state";
import type { ReactNode } from "react";

type CashbackStageProps = {
	cashback: TUseOrganizationOnboardingState["state"]["cashback"];
	updateCashback: TUseOrganizationOnboardingState["updateCashback"];
	nicheLabel: string | null;
};

function SectionLabel({ children }: { children: ReactNode }) {
	return <p className="text-[11px] font-extrabold tracking-[0.08em] text-muted-foreground uppercase">{children}</p>;
}

export function CashbackStage({ cashback, updateCashback, nicheLabel }: CashbackStageProps) {
	const preview = formatCashbackPreview({
		acumuloTipo: cashback.acumuloTipo,
		acumuloValor: cashback.acumuloValor,
		validadeDias: cashback.expiracaoRegraValidadeValor,
		limiteResgate:
			cashback.resgateLimiteTipo && cashback.resgateLimiteValor !== null
				? { tipo: cashback.resgateLimiteTipo, valor: cashback.resgateLimiteValor }
				: null,
	});

	return (
		<div className="flex w-full max-w-[640px] flex-col gap-6">
			<div className="flex items-center justify-between gap-4 rounded-xl border border-border p-4">
				<div className="flex flex-col gap-0.5">
					<label htmlFor="cashback-ativo" className="cursor-pointer text-sm font-bold">
						Ativar o cashback agora
					</label>
					<p className="text-sm text-muted-foreground">
						Desligado, o programa fica configurado e você ativa quando quiser. As campanhas seguem sem oferta de cashback até lá.
					</p>
				</div>
				<Switch id="cashback-ativo" checked={cashback.ativo} onCheckedChange={(checked) => updateCashback({ ativo: checked })} />
			</div>

			{/* Único bloco com cor de marca na jornada: a prévia do que o cliente ganha. */}
			<div className="flex flex-col gap-1 rounded-2xl border border-brand/40 bg-brand/10 p-4">
				<p className="text-[11px] font-extrabold tracking-[0.08em] text-foreground/70 uppercase">Como o cliente vê</p>
				<p className="text-base font-bold">{preview.principal}</p>
				{preview.secundaria ? <p className="text-sm text-foreground/80">{preview.secundaria}</p> : null}
				{nicheLabel ? <p className="pt-1 text-xs text-foreground/60">Sugestão para {nicheLabel}. Ajuste como fizer sentido para a sua margem.</p> : null}
			</div>

			<section className="flex flex-col gap-3">
				<SectionLabel>Acúmulo</SectionLabel>
				<div className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-end">
					<SegmentedControl
						options={[
							{ value: "PERCENTUAL", label: "Percentual" },
							{ value: "FIXO", label: "Valor fixo" },
						]}
						value={cashback.acumuloTipo}
						onChange={(value) => updateCashback({ acumuloTipo: value as "PERCENTUAL" | "FIXO" })}
					/>
					<NumberField
						label={cashback.acumuloTipo === "PERCENTUAL" ? "Retorno por compra (%)" : "Retorno por compra (R$)"}
						value={cashback.acumuloValor}
						onChange={(value) => updateCashback({ acumuloValor: value })}
					/>
				</div>
			</section>

			<section className="flex flex-col gap-3">
				<SectionLabel>Validade e resgate</SectionLabel>
				<div className="grid gap-3 sm:grid-cols-2">
					<NumberField
						label="Validade do saldo (dias)"
						value={cashback.expiracaoRegraValidadeValor}
						onChange={(value) => updateCashback({ expiracaoRegraValidadeValor: value })}
					/>
					<NumberField
						label="Limite de uso por compra (%)"
						value={cashback.resgateLimiteValor ?? 0}
						onChange={(value) => updateCashback({ resgateLimiteTipo: "PERCENTUAL", resgateLimiteValor: value })}
					/>
				</div>
			</section>

			<section className="flex flex-col gap-3">
				<SectionLabel>Como o cliente usa</SectionLabel>
				<ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
					<ToggleRow
						id="modalidade-desconto"
						label="Desconto na compra"
						description="O saldo abate direto o valor da próxima compra."
						checked={cashback.modalidadeDescontosPermitida}
						onChange={(checked) => updateCashback({ modalidadeDescontosPermitida: checked })}
					/>
					<ToggleRow
						id="modalidade-recompensa"
						label="Troca por recompensas"
						description="O cliente troca o saldo por prêmios que você cadastra."
						checked={cashback.modalidadeRecompensasPermitida}
						onChange={(checked) => updateCashback({ modalidadeRecompensasPermitida: checked })}
					/>
				</ul>
			</section>
		</div>
	);
}

function SegmentedControl({
	options,
	value,
	onChange,
}: {
	options: { value: string; label: string }[];
	value: string;
	onChange: (value: string) => void;
}) {
	return (
		<div role="radiogroup" className="inline-flex h-10 w-fit items-center rounded-lg border border-border bg-muted/40 p-1">
			{options.map((option) => (
				<button
					type="button"
					role="radio"
					aria-checked={value === option.value}
					key={option.value}
					onClick={() => onChange(option.value)}
					className={cn(
						"h-full rounded-md px-3 text-sm font-semibold transition-colors",
						value === option.value ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
					)}
				>
					{option.label}
				</button>
			))}
		</div>
	);
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
	return (
		<label className="flex flex-col gap-1">
			<span className="text-sm font-medium tracking-tight text-foreground/80">{label}</span>
			<input
				type="number"
				inputMode="decimal"
				min={0}
				value={Number.isFinite(value) ? value : 0}
				onChange={(event) => {
					const parsed = Number(event.target.value);
					onChange(Number.isFinite(parsed) ? parsed : 0);
				}}
				className="h-10 rounded-md border border-border bg-background px-3 text-sm tabular-nums shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
			/>
		</label>
	);
}

function ToggleRow({
	id,
	label,
	description,
	checked,
	onChange,
}: {
	id: string;
	label: string;
	description: string;
	checked: boolean;
	onChange: (checked: boolean) => void;
}) {
	return (
		<li className="flex items-center justify-between gap-3 p-4">
			<div className="flex flex-col gap-0.5">
				<label htmlFor={id} className="cursor-pointer text-sm font-semibold">
					{label}
				</label>
				<span className="text-sm leading-snug text-muted-foreground">{description}</span>
			</div>
			<Switch id={id} checked={checked} onCheckedChange={onChange} />
		</li>
	);
}
