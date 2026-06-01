"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage } from "@/lib/errors";
import { updateShopSettings } from "@/lib/mutations/shop";
import { getShopAvailability } from "@/lib/shop/availability";
import type { TGetShopSettingsOutput } from "@/app/api/shop/settings/route";
import type { TShopScheduleException, TShopSettingsConfiguration, TShopTimeRange } from "@/schemas/shop";
import type { TShopWeekdayEnum } from "@/schemas/enums";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
	AlertCircle,
	CalendarDays,
	Image as ImageIcon,
	Package,
	Plus,
	RotateCcw,
	Save,
	Settings2,
	ShoppingBag,
	Store,
	Trash2,
	Truck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type TSettings = NonNullable<TGetShopSettingsOutput["data"]>;
type TSection = "visao-geral" | "atendimento" | "horarios" | "operacao" | "aparencia" | "produtos";

const WEEKDAYS: Array<{ value: TShopWeekdayEnum; label: string }> = [
	{ value: "SEGUNDA", label: "Segunda-feira" },
	{ value: "TERCA", label: "Terça-feira" },
	{ value: "QUARTA", label: "Quarta-feira" },
	{ value: "QUINTA", label: "Quinta-feira" },
	{ value: "SEXTA", label: "Sexta-feira" },
	{ value: "SABADO", label: "Sábado" },
	{ value: "DOMINGO", label: "Domingo" },
];

const SECTIONS: Array<{ value: TSection; label: string; icon: typeof Store }> = [
	{ value: "visao-geral", label: "Visão geral", icon: Store },
	{ value: "atendimento", label: "Atendimento", icon: Truck },
	{ value: "horarios", label: "Horários", icon: CalendarDays },
	{ value: "operacao", label: "Operação", icon: Settings2 },
	{ value: "aparencia", label: "Aparência", icon: ImageIcon },
	{ value: "produtos", label: "Produtos", icon: ShoppingBag },
];

export default function ShopSettingsPanel({ settings }: { settings: TSettings }) {
	const queryClient = useQueryClient();
	const [section, setSection] = useState<TSection>("visao-geral");
	const [draft, setDraft] = useState(settings);

	useEffect(() => setDraft(settings), [settings]);

	const isDirty = JSON.stringify(draft) !== JSON.stringify(settings);
	const hasSchedule = draft.configuracoes.operacao.horarios.some((item) => item.periodos.length > 0);

	const { mutate: save, isPending } = useMutation({
		mutationKey: ["update-shop-settings"],
		mutationFn: updateShopSettings,
		onSuccess: (data) => {
			toast.success(data.message);
			queryClient.invalidateQueries({ queryKey: ["shop-settings"] });
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const updateConfig = (configuracoes: TShopSettingsConfiguration) => setDraft((prev) => ({ ...prev, configuracoes }));
	const updateOperation = (operacao: TShopSettingsConfiguration["operacao"]) => updateConfig({ ...draft.configuracoes, operacao });
	const updateService = (atendimento: TShopSettingsConfiguration["atendimento"]) => updateConfig({ ...draft.configuracoes, atendimento });

	const handleSave = () => {
		if (draft.ativo && !hasSchedule) {
			toast.error("Cadastre pelo menos um horário antes de ativar a loja.");
			setSection("horarios");
			return;
		}
		save({ ativo: draft.ativo, modo: draft.modo, configuracoes: draft.configuracoes });
	};

	return (
		<Card className="relative min-h-[42rem] gap-0 py-0">
			<CardContent className="grid min-h-[42rem] p-0 lg:grid-cols-[13rem_minmax(0,1fr)]">
				<nav className="border-b bg-muted/30 p-3 lg:border-r lg:border-b-0">
					<div className="scrollbar-thin flex gap-1 overflow-x-auto lg:flex-col">
						{SECTIONS.map((item) => {
							const Icon = item.icon;
							return (
								<button
									key={item.value}
									type="button"
									onClick={() => setSection(item.value)}
									className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-extrabold tracking-[0.08em] uppercase transition-colors ${
										section === item.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
									}`}
								>
									<Icon className="size-4 shrink-0" />
									{item.label}
								</button>
							);
						})}
					</div>
				</nav>

				<div className="min-w-0 p-4 pb-24 sm:p-6 sm:pb-24">
					{section === "visao-geral" ? (
						<Overview settings={draft} hasSchedule={hasSchedule} onNavigate={setSection} setAtivo={(ativo) => setDraft((prev) => ({ ...prev, ativo }))} />
					) : null}
					{section === "atendimento" ? <ServiceSection config={draft.configuracoes} updateService={updateService} /> : null}
					{section === "horarios" ? <SchedulesSection config={draft.configuracoes} updateOperation={updateOperation} /> : null}
					{section === "operacao" ? <OperationSection config={draft.configuracoes} updateOperation={updateOperation} /> : null}
					{section === "aparencia" ? <AppearanceSection config={draft.configuracoes} updateConfig={updateConfig} /> : null}
					{section === "produtos" ? (
						<ProductsSection
							config={draft.configuracoes}
							updateConfig={updateConfig}
							modo={draft.modo}
							setModo={(modo) => setDraft((prev) => ({ ...prev, modo }))}
						/>
					) : null}
				</div>
			</CardContent>

			{isDirty ? (
				<div className="absolute right-3 bottom-3 left-3 flex flex-col gap-3 rounded-2xl border bg-background/95 p-3 shadow-lg sm:flex-row sm:items-center sm:justify-between">
					<p className="text-sm font-semibold">Você tem alterações não salvas.</p>
					<div className="flex gap-2">
						<Button variant="outline" className="gap-2" onClick={() => setDraft(settings)} disabled={isPending}>
							<RotateCcw className="size-4" />
							Descartar
						</Button>
						<Button className="gap-2" onClick={handleSave} disabled={isPending}>
							<Save className="size-4" />
							Salvar alterações
						</Button>
					</div>
				</div>
			) : null}
		</Card>
	);
}

function Overview({
	settings,
	hasSchedule,
	onNavigate,
	setAtivo,
}: {
	settings: TSettings;
	hasSchedule: boolean;
	onNavigate: (section: TSection) => void;
	setAtivo: (ativo: boolean) => void;
}) {
	const availability = getShopAvailability({ ativo: settings.ativo, configuracoes: settings.configuracoes });
	const service = settings.configuracoes.atendimento;
	const nextException = settings.configuracoes.operacao.excecoesHorarios
		.toSorted((a, b) => a.data.localeCompare(b.data))
		.find((item) => item.data >= new Date().toISOString().slice(0, 10));

	return (
		<SectionIntro title="Visão geral" description="Acompanhe o estado atual da loja e acesse rapidamente o que precisa de ajuste.">
			<SettingBlock
				title="Loja digital ativa"
				icon={<Store className="size-4" />}
				action={<Switch checked={settings.ativo} disabled={!hasSchedule && !settings.ativo} onCheckedChange={setAtivo} />}
			>
				<p className="text-sm text-muted-foreground">
					{hasSchedule
						? "Quando ativa, a loja recebe pedidos dentro dos horários configurados."
						: "Cadastre pelo menos um horário para liberar a ativação."}
				</p>
			</SettingBlock>
			<div className="divide-y rounded-2xl border">
				<SummaryRow
					label="Status operacional"
					value={availability.status === "ABERTA" ? "Aberta agora" : availability.status === "INDISPONIVEL" ? "Loja inativa" : "Fechada agora"}
					onEdit={() => onNavigate("horarios")}
				/>
				<SummaryRow
					label="Modalidades"
					value={[service.retirada.ativo ? "Retirada" : null, service.entrega.ativo ? "Entrega" : null].filter(Boolean).join(" e ")}
					onEdit={() => onNavigate("atendimento")}
				/>
				<SummaryRow label="Modo da loja" value={settings.modo === "CARDAPIO" ? "Cardápio" : "Catálogo"} onEdit={() => onNavigate("produtos")} />
				<SummaryRow
					label="Próxima exceção"
					value={nextException ? `${nextException.data}${nextException.mensagem ? `, ${nextException.mensagem}` : ""}` : "Nenhuma exceção futura"}
					onEdit={() => onNavigate("horarios")}
				/>
			</div>
			{!hasSchedule ? (
				<div className="flex items-start gap-3 rounded-2xl border border-brand-secondary/30 bg-brand-secondary/10 p-4">
					<AlertCircle className="mt-0.5 size-5 shrink-0" />
					<div>
						<p className="font-bold">Cadastre os horários de atendimento</p>
						<p className="mt-1 text-sm text-muted-foreground">A loja precisa de pelo menos um período configurado antes de receber pedidos.</p>
					</div>
				</div>
			) : null}
		</SectionIntro>
	);
}

function ServiceSection({
	config,
	updateService,
}: {
	config: TShopSettingsConfiguration;
	updateService: (service: TShopSettingsConfiguration["atendimento"]) => void;
}) {
	const service = config.atendimento;
	return (
		<SectionIntro title="Atendimento" description="Escolha como os clientes recebem os pedidos e defina as regras da entrega.">
			<SettingBlock
				title="Retirada"
				icon={<Package className="size-4" />}
				action={<Switch checked={service.retirada.ativo} onCheckedChange={(ativo) => updateService({ ...service, retirada: { ativo } })} />}
			>
				<p className="text-sm text-muted-foreground">O cliente retira o pedido no endereço cadastrado para a organização.</p>
			</SettingBlock>
			<SettingBlock
				title="Entrega"
				icon={<Truck className="size-4" />}
				action={
					<Switch checked={service.entrega.ativo} onCheckedChange={(ativo) => updateService({ ...service, entrega: { ...service.entrega, ativo } })} />
				}
			>
				{service.entrega.ativo ? (
					<div className="grid gap-4 sm:grid-cols-2">
						<NumberField
							label="Pedido mínimo (R$)"
							value={service.entrega.pedidoMinimo}
							onChange={(pedidoMinimo) => updateService({ ...service, entrega: { ...service.entrega, pedidoMinimo } })}
						/>
						<NumberField
							label="Prazo estimado (min)"
							value={service.entrega.prazoMinutos}
							onChange={(prazoMinutos) => updateService({ ...service, entrega: { ...service.entrega, prazoMinutos } })}
						/>
					</div>
				) : (
					<p className="text-sm text-muted-foreground">Ative para configurar pedido mínimo e prazo estimado.</p>
				)}
			</SettingBlock>
		</SectionIntro>
	);
}

function SchedulesSection({
	config,
	updateOperation,
}: {
	config: TShopSettingsConfiguration;
	updateOperation: (operation: TShopSettingsConfiguration["operacao"]) => void;
}) {
	const operation = config.operacao;
	const [newException, setNewException] = useState<TShopScheduleException>({ data: "", periodos: [], mensagem: null });

	const updateDay = (day: TShopWeekdayEnum, ranges: TShopTimeRange[]) => {
		const horarios = [...operation.horarios.filter((item) => item.dia !== day), { dia: day, periodos: ranges }];
		updateOperation({ ...operation, horarios });
	};

	const addException = () => {
		if (!newException.data) return;
		updateOperation({
			...operation,
			excecoesHorarios: [...operation.excecoesHorarios.filter((item) => item.data !== newException.data), newException],
		});
		setNewException({ data: "", periodos: [], mensagem: null });
	};

	return (
		<SectionIntro
			title="Horários"
			description="Defina quando a loja recebe pedidos. Fora desses períodos, o catálogo continua disponível para consulta."
		>
			<div className="divide-y rounded-2xl border">
				{WEEKDAYS.map((weekday) => {
					const ranges = operation.horarios.find((item) => item.dia === weekday.value)?.periodos ?? [];
					return <WeekdayRow key={weekday.value} label={weekday.label} ranges={ranges} onChange={(next) => updateDay(weekday.value, next)} />;
				})}
			</div>
			<div className="space-y-3">
				<div>
					<h3 className="font-black">Exceções de horário</h3>
					<p className="text-sm text-muted-foreground">Use para feriados, inventários ou dias com expediente reduzido.</p>
				</div>
				<div className="space-y-2">
					{operation.excecoesHorarios
						.toSorted((a, b) => a.data.localeCompare(b.data))
						.map((exception) => (
							<div key={exception.data} className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2">
								<div>
									<p className="text-sm font-bold">{exception.data}</p>
									<p className="text-xs text-muted-foreground">
										{formatRanges(exception.periodos)}
										{exception.mensagem ? `, ${exception.mensagem}` : ""}
									</p>
								</div>
								<Button
									size="icon"
									variant="ghost"
									onClick={() =>
										updateOperation({ ...operation, excecoesHorarios: operation.excecoesHorarios.filter((item) => item.data !== exception.data) })
									}
								>
									<Trash2 className="size-4" />
								</Button>
							</div>
						))}
				</div>
				<div className="grid gap-2 rounded-2xl border bg-muted/20 p-3 sm:grid-cols-[10rem_1fr_auto]">
					<Input type="date" value={newException.data} onChange={(event) => setNewException((prev) => ({ ...prev, data: event.target.value }))} />
					<Input
						placeholder="Mensagem opcional"
						value={newException.mensagem ?? ""}
						onChange={(event) => setNewException((prev) => ({ ...prev, mensagem: event.target.value || null }))}
					/>
					<Button type="button" onClick={addException}>
						Adicionar
					</Button>
					<div className="space-y-3 sm:col-span-3">
						<div className="flex items-center gap-2">
							<Switch
								checked={newException.periodos.length === 0}
								onCheckedChange={(checked) => setNewException((prev) => ({ ...prev, periodos: checked ? [] : [{ inicio: "08:00", fim: "18:00" }] }))}
							/>
							<p className="text-sm font-semibold">Fechado o dia inteiro</p>
						</div>
						{newException.periodos.length > 0 ? (
							<RangesEditor ranges={newException.periodos} onChange={(periodos) => setNewException((prev) => ({ ...prev, periodos }))} />
						) : null}
					</div>
				</div>
			</div>
		</SectionIntro>
	);
}

function WeekdayRow({ label, ranges, onChange }: { label: string; ranges: TShopTimeRange[]; onChange: (ranges: TShopTimeRange[]) => void }) {
	const enabled = ranges.length > 0;
	return (
		<div className="grid gap-3 px-3 py-3 sm:grid-cols-[9rem_auto_1fr] sm:items-center">
			<p className="text-sm font-bold">{label}</p>
			<Switch checked={enabled} onCheckedChange={(checked) => onChange(checked ? [{ inicio: "08:00", fim: "18:00" }] : [])} />
			{enabled ? <RangesEditor ranges={ranges} onChange={onChange} /> : <p className="text-sm text-muted-foreground">Fechado</p>}
		</div>
	);
}

function RangesEditor({ ranges, onChange }: { ranges: TShopTimeRange[]; onChange: (ranges: TShopTimeRange[]) => void }) {
	return (
		<div className="space-y-2">
			{ranges.map((range, index) => (
				<div key={`${range.inicio}-${range.fim}-${index}`} className="flex items-center gap-2">
					<Input
						type="time"
						value={range.inicio}
						onChange={(event) => onChange(ranges.map((item, itemIndex) => (itemIndex === index ? { ...item, inicio: event.target.value } : item)))}
					/>
					<span className="text-xs text-muted-foreground">até</span>
					<Input
						type="time"
						value={range.fim}
						onChange={(event) => onChange(ranges.map((item, itemIndex) => (itemIndex === index ? { ...item, fim: event.target.value } : item)))}
					/>
					{ranges.length > 1 ? (
						<Button type="button" size="icon" variant="ghost" onClick={() => onChange(ranges.filter((_, itemIndex) => itemIndex !== index))}>
							<Trash2 className="size-4" />
						</Button>
					) : null}
				</div>
			))}
			<Button type="button" size="sm" variant="ghost" className="gap-2" onClick={() => onChange([...ranges, { inicio: "18:00", fim: "22:00" }])}>
				<Plus className="size-4" />
				Adicionar período
			</Button>
		</div>
	);
}

function OperationSection({
	config,
	updateOperation,
}: {
	config: TShopSettingsConfiguration;
	updateOperation: (operation: TShopSettingsConfiguration["operacao"]) => void;
}) {
	const operation = config.operacao;
	return (
		<SectionIntro title="Operação" description="Defina as informações usadas para orientar o cliente antes do envio.">
			<NumberField
				label="Tempo médio de preparo (min)"
				value={operation.preparoMinutos}
				onChange={(preparoMinutos) => updateOperation({ ...operation, preparoMinutos })}
			/>
			<div className="space-y-2">
				<Label htmlFor="checkout-message">Mensagem antes da finalização</Label>
				<Textarea
					id="checkout-message"
					placeholder="Ex.: Confira os itens e informe observações importantes."
					value={operation.mensagemCheckout ?? ""}
					onChange={(event) => updateOperation({ ...operation, mensagemCheckout: event.target.value || null })}
				/>
				<p className="text-xs text-muted-foreground">A mensagem aparece na revisão do pedido, antes do cliente enviar.</p>
			</div>
		</SectionIntro>
	);
}

function AppearanceSection({
	config,
	updateConfig,
}: {
	config: TShopSettingsConfiguration;
	updateConfig: (config: TShopSettingsConfiguration) => void;
}) {
	const appearance = config.aparencia;
	return (
		<SectionIntro title="APARÊNCIA" description="Personalize a capa e escolha os blocos exibidos no início da loja.">
			<div className="space-y-2">
				<Label>URL da capa</Label>
				<Input
					value={appearance.headerCoverUrl ?? ""}
					onChange={(event) => updateConfig({ ...config, aparencia: { ...appearance, headerCoverUrl: event.target.value || null } })}
					placeholder="https://..."
				/>
			</div>
			<div className="flex gap-2">
				{(["IMAGEM", "VIDEO"] as const).map((type) => (
					<Button
						key={type}
						type="button"
						variant={appearance.headerCoverTipo === type ? "default" : "outline"}
						onClick={() => updateConfig({ ...config, aparencia: { ...appearance, headerCoverTipo: type } })}
					>
						{type === "IMAGEM" ? "Imagem" : "Vídeo"}
					</Button>
				))}
			</div>
			<div className="divide-y rounded-2xl border">
				{appearance.blocos.map((block, index) => (
					<div key={block.tipo} className="flex items-center justify-between gap-3 px-3 py-3">
						<p className="text-sm font-bold">
							{block.tipo === "EM_DESTAQUE" ? "Em destaque" : block.tipo === "MAIS_PEDIDOS" ? "Mais pedidos" : "Grupos de produtos"}
						</p>
						<Switch
							checked={block.ativo}
							onCheckedChange={(ativo) =>
								updateConfig({
									...config,
									aparencia: { ...appearance, blocos: appearance.blocos.map((item, itemIndex) => (itemIndex === index ? { ...item, ativo } : item)) },
								})
							}
						/>
					</div>
				))}
			</div>
		</SectionIntro>
	);
}

function ProductsSection({
	config,
	updateConfig,
	modo,
	setModo,
}: {
	config: TShopSettingsConfiguration;
	updateConfig: (config: TShopSettingsConfiguration) => void;
	modo: "CARDAPIO" | "CATALOGO";
	setModo: (mode: "CARDAPIO" | "CATALOGO") => void;
}) {
	return (
		<SectionIntro title="PRODUTOS" description="Escolha a apresentação da loja e quais produtos ficam disponíveis.">
			<div className="grid gap-2 sm:grid-cols-2">
				{(["CARDAPIO", "CATALOGO"] as const).map((mode) => (
					<Button key={mode} type="button" variant={modo === mode ? "default" : "outline"} onClick={() => setModo(mode)}>
						{mode === "CARDAPIO" ? "Cardápio" : "Catálogo"}
					</Button>
				))}
			</div>
			<div className="grid gap-2">
				{(["ATIVOS", "INCLUIR", "EXCLUIR"] as const).map((mode) => (
					<button
						key={mode}
						type="button"
						className={`rounded-xl border p-3 text-left ${config.produtos.modo === mode ? "border-primary bg-primary/5" : "border-border"}`}
						onClick={() => updateConfig({ ...config, produtos: { ...config.produtos, modo: mode } })}
					>
						<p className="text-sm font-bold">
							{mode === "ATIVOS" ? "Todos os produtos ativos" : mode === "INCLUIR" ? "Incluir selecionados" : "Excluir selecionados"}
						</p>
					</button>
				))}
			</div>
			<p className="text-sm text-muted-foreground">A seleção individual de produtos continua disponível na página de produtos.</p>
		</SectionIntro>
	);
}

function SectionIntro({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-xl font-black tracking-tight">{title}</h2>
				<p className="mt-1 text-sm text-muted-foreground">{description}</p>
			</div>
			{children}
		</div>
	);
}

function SettingBlock({
	title,
	icon,
	action,
	children,
}: {
	title: string;
	icon: React.ReactNode;
	action: React.ReactNode;
	children: React.ReactNode;
}) {
	return (
		<div className="space-y-4 rounded-2xl border p-4">
			<div className="flex items-center justify-between gap-3">
				<div className="flex items-center gap-2 font-black">
					{icon}
					{title}
				</div>
				{action}
			</div>
			{children}
		</div>
	);
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
	return (
		<div className="space-y-2">
			<Label>{label}</Label>
			<Input type="number" min={0} value={value} onChange={(event) => onChange(Number(event.target.value))} />
		</div>
	);
}

function SummaryRow({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
	return (
		<div className="flex items-center justify-between gap-3 px-4 py-3">
			<div>
				<p className="text-xs font-black tracking-wider text-muted-foreground uppercase">{label}</p>
				<p className="mt-1 text-sm font-semibold">{value || "Não configurado"}</p>
			</div>
			<Button variant="ghost" size="sm" onClick={onEdit}>
				Editar
			</Button>
		</div>
	);
}

function formatRanges(ranges: TShopTimeRange[]) {
	return ranges.length === 0 ? "Fechado o dia inteiro" : ranges.map((range) => `${range.inicio} - ${range.fim}`).join(", ");
}
