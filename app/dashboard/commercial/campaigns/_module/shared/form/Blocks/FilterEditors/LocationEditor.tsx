"use client";

import MultipleSelectInputVirtualized from "@/components/Inputs/MultipleSelectInputVirtualized";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { CampaignLocationFilterConfigSchema, type TCampaignLocationFilterConfig } from "@/schemas/campaigns";
import { BrazilStatesAndCities, BrazilianStatesOptions, BrazillianCitiesOptions } from "@/utils/states-cities";
import { MapPin, Plus, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type LocationLevel = "estados" | "cidades" | "bairros";

type LocationEditorProps = {
	initialValue?: TCampaignLocationFilterConfig;
	focusLevel?: LocationLevel;
	onConfirm: (config: TCampaignLocationFilterConfig) => void;
	closeModal: () => void;
};

export default function LocationEditor({ initialValue, focusLevel, onConfirm, closeModal }: LocationEditorProps) {
	const [estados, setEstados] = useState<string[]>(initialValue?.estados ?? []);
	const [cidades, setCidades] = useState<string[]>(initialValue?.cidades ?? []);
	const [bairros, setBairros] = useState<string[]>(initialValue?.bairros ?? []);

	// Cidades options: filter to only cities from the selected states. If no state is
	// selected, allow the full Brazilian catalog so the user isn't blocked.
	const cidadesOptions = useMemo(() => {
		if (estados.length === 0) return BrazillianCitiesOptions;
		const cities = estados.flatMap((uf) => BrazilStatesAndCities[uf as keyof typeof BrazilStatesAndCities] ?? []);
		return cities.map((city, index) => ({ id: `${city}-${index}`, label: city, value: city }));
	}, [estados]);

	// If the user narrows states after picking cities, drop any cities no longer valid.
	function handleEstadosChange(next: string[]) {
		setEstados(next);
		if (next.length === 0) return;
		const allowed = new Set(next.flatMap((uf) => BrazilStatesAndCities[uf as keyof typeof BrazilStatesAndCities] ?? []));
		setCidades((prev) => prev.filter((city) => allowed.has(city)));
	}

	function handleConfirm() {
		const candidate: TCampaignLocationFilterConfig = {};
		if (estados.length > 0) candidate.estados = estados;
		if (cidades.length > 0) candidate.cidades = cidades;
		if (bairros.length > 0) candidate.bairros = bairros;

		const parsed = CampaignLocationFilterConfigSchema.safeParse(candidate);
		if (!parsed.success) {
			const firstIssue = parsed.error.issues[0];
			toast.error(firstIssue?.message ?? "Informe ao menos um nível de localização para o filtro.");
			return;
		}
		onConfirm(parsed.data);
		closeModal();
	}

	return (
		<ResponsiveMenu
			menuTitle="FILTRO DE LOCALIZAÇÃO"
			menuDescription="Informe ao menos um nível de localização. Os níveis preenchidos funcionam em conjunto."
			menuActionButtonText="CONFIRMAR"
			menuCancelButtonText="CANCELAR"
			actionFunction={handleConfirm}
			actionIsLoading={false}
			stateIsLoading={false}
			stateError={null}
			closeMenu={closeModal}
			dialogVariant="sm"
		>
			<ResponsiveMenuSection title="LOCALIZAÇÃO" icon={<MapPin className="h-4 min-h-4 w-4 min-w-4" />}>
				<div>
					<MultipleSelectInputVirtualized
						label="ESTADOS"
						selected={estados}
						options={BrazilianStatesOptions}
						resetOptionLabel="Buscar / limpar estados"
						handleChange={handleEstadosChange}
						onReset={() => handleEstadosChange([])}
					/>
					{estados.length > 0 ? <SelectedBadges values={estados} onRemove={(v) => handleEstadosChange(estados.filter((e) => e !== v))} /> : null}
				</div>

				<div>
					<MultipleSelectInputVirtualized
						label={estados.length > 0 ? "CIDADES (FILTRADAS PELOS ESTADOS SELECIONADOS)" : "CIDADES"}
						selected={cidades}
						options={cidadesOptions}
						resetOptionLabel="Buscar / limpar cidades"
						handleChange={(values) => setCidades(values)}
						onReset={() => setCidades([])}
					/>
					{cidades.length > 0 ? <SelectedBadges values={cidades} onRemove={(v) => setCidades(cidades.filter((c) => c !== v))} /> : null}
				</div>

				<BairrosChipInput
					values={bairros}
					autoFocus={focusLevel === "bairros"}
					onAdd={(raw) => {
						const value = raw.trim();
						if (!value) return;
						setBairros((prev) => (prev.includes(value) ? prev : [...prev, value]));
					}}
					onRemove={(idx) => setBairros((prev) => prev.filter((_, i) => i !== idx))}
				/>
			</ResponsiveMenuSection>
		</ResponsiveMenu>
	);
}

// ---------- Selected values badges (shared display for virtualized selects) ----------

function SelectedBadges({ values, onRemove }: { values: string[]; onRemove: (value: string) => void }) {
	return (
		<div className="mt-2 flex w-full flex-wrap items-center gap-1.5">
			{values.map((value) => (
				<span key={value} className="inline-flex items-center gap-1 rounded-md border border-border bg-primary/10 px-2 py-0.5 text-xs">
					<span className="font-medium">{value}</span>
					<button
						type="button"
						aria-label={`Remover ${value}`}
						className="text-muted-foreground transition-colors hover:text-destructive"
						onClick={() => onRemove(value)}
					>
						<X className="h-3 w-3" />
					</button>
				</span>
			))}
		</div>
	);
}

// ---------- Bairros chip input (kept as free-text) ----------

type BairrosChipInputProps = {
	values: string[];
	autoFocus?: boolean;
	onAdd: (raw: string) => void;
	onRemove: (index: number) => void;
};
function BairrosChipInput({ values, autoFocus, onAdd, onRemove }: BairrosChipInputProps) {
	const [draft, setDraft] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);

	function commit() {
		if (!draft.trim()) return;
		onAdd(draft);
		setDraft("");
		inputRef.current?.focus();
	}

	return (
		<div>
			<div className="flex w-full flex-col gap-2">
				<Label htmlFor="location-bairros" className="text-sm font-medium tracking-tight text-foreground/80">
					BAIRROS
				</Label>
				<div className="flex w-full flex-wrap items-center gap-2">
					{values.length === 0 ? (
						<span className="text-xs italic text-muted-foreground">Nenhum bairro adicionado.</span>
					) : (
						values.map((value, idx) => (
							<span key={`${value}-${idx}`} className="inline-flex items-center gap-1 rounded-md border border-border bg-primary/10 px-2 py-1 text-xs">
								<span className="font-medium">{value}</span>
								<button
									type="button"
									aria-label={`Remover bairro ${value}`}
									className="text-muted-foreground transition-colors hover:text-destructive"
									onClick={() => onRemove(idx)}
								>
									<X className="h-3 w-3" />
								</button>
							</span>
						))
					)}
				</div>
				<div className="flex w-full items-center gap-2">
					<Input
						ref={inputRef}
						id="location-bairros"
						autoFocus={autoFocus}
						value={draft}
						placeholder="Ex: Pinheiros — pressione Enter para adicionar"
						onChange={(e) => setDraft(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								e.preventDefault();
								commit();
							}
						}}
						className="w-full rounded-md border border-border p-3 text-sm shadow-xs outline-hidden duration-500 ease-in-out placeholder:italic focus:border-border"
					/>
					<Button type="button" size="sm" variant="outline" onClick={commit} className="flex items-center gap-1.5">
						<Plus className="h-3.5 w-3.5" />
						ADICIONAR
					</Button>
				</div>
			</div>
		</div>
	);
}
