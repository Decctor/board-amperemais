import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { TUseOrganizationOnboardingState } from "@/state-hooks/use-organization-onboarding-state";
import { BadgePercent, Clock, Coins, Gift, type LucideIcon, Sparkles, Tag } from "lucide-react";
import type { ReactNode } from "react";

type CashbackConfigStageProps = {
	state: TUseOrganizationOnboardingState["state"];
	updateCashback: TUseOrganizationOnboardingState["updateCashback"];
};

export function CashbackConfigStage({ state, updateCashback }: CashbackConfigStageProps) {
	const cashback = state.cashback;
	const valorLabel = cashback.acumuloTipo === "PERCENTUAL" ? `${cashback.acumuloValor}%` : `R$ ${cashback.acumuloValor}`;

	return (
		<div className="flex w-full flex-col gap-4">
			{/* Activation toggle */}
			<div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
				<div className="flex items-start gap-3">
					<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFB900]/15 text-yellow-700">
						<BadgePercent className="h-5 w-5" />
					</span>
					<div className="flex flex-col gap-0.5">
						<span className="font-bold text-gray-900 tracking-tight">Programa de cashback</span>
						<span className="text-sm text-muted-foreground leading-snug">
							Devolva parte de cada compra para incentivar o cliente a voltar. Você pode ativar agora ou deixar para depois.
						</span>
					</div>
				</div>
				<Switch checked={cashback.ativo} onCheckedChange={(checked) => updateCashback({ ativo: checked })} />
			</div>

			{cashback.ativo ? (
				<>
					{/* Gold preview */}
					<div className="relative overflow-hidden rounded-2xl border border-[#FFB900]/30 bg-linear-to-br from-[#FFB900]/12 to-[#FFB900]/4 p-4">
						<Sparkles className="pointer-events-none absolute -top-2 -right-2 h-16 w-16 text-[#FFB900]/15" />
						<p className="text-[11px] font-bold uppercase tracking-wider text-yellow-700/80">Como o cliente vê</p>
						<p className="mt-1 text-xl font-extrabold tracking-tight text-gray-900">
							Ganhe <span className="text-yellow-700">{valorLabel}</span> de volta
						</p>
						<p className="mt-0.5 text-sm text-gray-600">
							em {cashback.terminologia === "PONTOS" ? "pontos" : "cashback"} a cada compra
							{cashback.expiracaoRegraValidadeValor > 0 ? `, válido por ${cashback.expiracaoRegraValidadeValor} dias` : ""}.
						</p>
					</div>

					<Section title="ACÚMULO" icon={Coins}>
						<SegmentedControl
							options={[
								{ value: "PERCENTUAL", label: "Percentual (%)" },
								{ value: "FIXO", label: "Valor fixo (R$)" },
							]}
							value={cashback.acumuloTipo}
							onChange={(value) => updateCashback({ acumuloTipo: value as "PERCENTUAL" | "FIXO" })}
						/>
						<NumberField
							label={cashback.acumuloTipo === "PERCENTUAL" ? "Percentual de retorno (%)" : "Valor de retorno (R$)"}
							value={cashback.acumuloValor}
							onChange={(value) => updateCashback({ acumuloValor: value })}
						/>
					</Section>

					<Section title="VALIDADE E RESGATE" icon={Clock}>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							<NumberField
								label="Validade do saldo (dias)"
								value={cashback.expiracaoRegraValidadeValor}
								onChange={(value) => updateCashback({ expiracaoRegraValidadeValor: value })}
							/>
							<NumberField
								label="Limite de resgate por compra (%)"
								value={cashback.resgateLimiteValor ?? 0}
								onChange={(value) => updateCashback({ resgateLimiteTipo: "PERCENTUAL", resgateLimiteValor: value })}
							/>
						</div>
					</Section>

					<Section title="MODALIDADES" icon={Gift}>
						<ToggleRow
							icon={<Tag className="h-4 w-4" />}
							label="Resgate como desconto"
							description="O cliente abate o saldo direto no valor da compra."
							checked={cashback.modalidadeDescontosPermitida}
							onChange={(checked) => updateCashback({ modalidadeDescontosPermitida: checked })}
						/>
						<ToggleRow
							icon={<Gift className="h-4 w-4" />}
							label="Resgate por recompensas"
							description="O cliente troca o saldo por prêmios que você cadastra."
							checked={cashback.modalidadeRecompensasPermitida}
							onChange={(checked) => updateCashback({ modalidadeRecompensasPermitida: checked })}
						/>
					</Section>
				</>
			) : (
				<div className="rounded-2xl border border-dashed border-border bg-superficie/40 p-6 text-center">
					<p className="text-sm text-muted-foreground">
						Sem cashback por enquanto. Suas campanhas vão usar mensagens de relacionamento, sem ofertas de cashback. Você pode ativar quando quiser nas
						configurações.
					</p>
				</div>
			)}
		</div>
	);
}

function Section({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) {
	return (
		<div className="flex w-full flex-col gap-2">
			<div className="flex w-fit items-center gap-2 rounded bg-primary/15 px-2 py-1">
				<Icon className="h-4 w-4 text-primary" />
				<span className="text-xs font-bold uppercase tracking-wide text-primary">{title}</span>
			</div>
			<div className="flex w-full flex-col gap-3">{children}</div>
		</div>
	);
}

function SegmentedControl({ options, value, onChange }: { options: { value: string; label: string }[]; value: string; onChange: (value: string) => void }) {
	return (
		<div className="inline-flex w-fit rounded-xl border border-border bg-superficie/60 p-1">
			{options.map((option) => (
				<button
					type="button"
					key={option.value}
					onClick={() => onChange(option.value)}
					className={cn(
						"rounded-lg px-4 py-1.5 text-sm font-semibold transition-all",
						value === option.value ? "bg-white text-[#24549C] shadow-sm" : "text-muted-foreground hover:text-gray-700",
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
		<label className="flex flex-col gap-1.5">
			<span className="text-xs font-bold uppercase tracking-wide text-gray-500">{label}</span>
			<input
				type="number"
				inputMode="decimal"
				min={0}
				value={Number.isFinite(value) ? value : 0}
				onChange={(event) => {
					const parsed = Number(event.target.value);
					onChange(Number.isFinite(parsed) ? parsed : 0);
				}}
				className="h-11 rounded-lg border border-border bg-white px-3 text-gray-900 outline-none transition-all focus:border-[#24549C] focus:ring-2 focus:ring-[#24549C]/15"
			/>
		</label>
	);
}

function ToggleRow({
	icon,
	label,
	description,
	checked,
	onChange,
}: {
	icon: ReactNode;
	label: string;
	description: string;
	checked: boolean;
	onChange: (checked: boolean) => void;
}) {
	return (
		<div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-white p-3.5">
			<div className="flex items-start gap-2.5">
				<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-superficie text-gray-500">{icon}</span>
				<div className="flex flex-col gap-0.5">
					<span className="text-sm font-semibold text-gray-900">{label}</span>
					<span className="text-xs text-muted-foreground leading-snug">{description}</span>
				</div>
			</div>
			<Switch checked={checked} onCheckedChange={onChange} />
		</div>
	);
}
