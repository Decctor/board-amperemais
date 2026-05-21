"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import TemplateMediaUpload from "@/components/Modals/WhatsappTemplates/Blocks/TemplateMediaUpload";
import { getDefaultAppOrigin, getMessageTemplateButtonPreset, MESSAGE_TEMPLATE_BUTTON_PRESET_OPTIONS } from "@/lib/message-templates/button-presets";
import { cn } from "@/lib/utils";
import { ArrowLeft, BadgeCheck, Braces, Check, Eye, FileText, ImageIcon, LinkIcon, Mail, Plus, Save, Smartphone, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
	buildEmptyMessageTemplateDraft,
	extractTemplateVariables,
	extractUnknownTemplateVariables,
	findStoredMessageTemplateDraft,
	getDefaultMessageTemplateVariableExample,
	MessageTemplateDynamicHeaderPresetOptions,
	MessageTemplateNativeVariables,
	upsertStoredMessageTemplateDraft,
	type TMessageTemplateDraft,
	type TTemplateButtonDraft,
	type TTemplateChannel,
	type TTemplateCategory,
	type TTemplateDynamicHeaderPreset,
	type TTemplateParameterDraft,
	type TTemplateStatus,
} from "../../_components/template-draft-store";
import { DynamicHeaderImagePreview, type OrganizationTemplateTheme } from "../../_components/dynamic-header-image-preview";
import { WhatsappIcon } from "@/components/icons";

type MessageTemplateBuilderProps = {
	templateId: string | null;
	organizationId: string;
	organizationName: string;
	organizationLogoUrl: string | null;
	organizationPrimaryColor: string | null;
	organizationPrimaryForeground: string | null;
	organizationSecondaryColor: string | null;
	organizationSecondaryForeground: string | null;
};

const channelOptions: Array<{ id: TTemplateChannel; label: string; icon: React.ElementType; description: string }> = [
	{ id: "WHATSAPP", label: "WhatsApp", icon: Smartphone, description: "Template aprovado pela Meta, com corpo curto e botões objetivos." },
	{ id: "EMAIL", label: "E-mail", icon: Mail, description: "Mensagem com assunto, preheader e layout padrão do Recompra." },
];

const categoryOptions: TTemplateCategory[] = ["MARKETING", "UTILIDADE", "AUTENTICAÇÃO"];
const statusOptions: TTemplateStatus[] = ["RASCUNHO", "ATIVO", "ARQUIVADO"];
const headerTypeOptions: Array<{ id: TMessageTemplateDraft["cabecalho"]["tipo"]; label: string }> = [
	{ id: "NENHUM", label: "Nenhum" },
	{ id: "TEXTO", label: "Texto" },
	{ id: "IMAGEM", label: "Imagem" },
	{ id: "VIDEO", label: "Vídeo" },
	{ id: "DOCUMENTO", label: "Documento" },
	{ id: "IMAGEM_DINAMICA", label: "Imagem dinâmica" },
];

export default function MessageTemplateBuilder({
	templateId,
	organizationId,
	organizationName,
	organizationLogoUrl,
	organizationPrimaryColor,
	organizationPrimaryForeground,
	organizationSecondaryColor,
	organizationSecondaryForeground,
}: MessageTemplateBuilderProps) {
	const router = useRouter();
	const [draft, setDraft] = useState<TMessageTemplateDraft>(() => buildEmptyMessageTemplateDraft(organizationName));
	const [hydrated, setHydrated] = useState(false);
	const organizationTheme = useMemo<OrganizationTemplateTheme>(
		() => ({
			name: organizationName,
			logoUrl: organizationLogoUrl,
			primaryColor: organizationPrimaryColor || "#24549c",
			primaryForeground: organizationPrimaryForeground || "#f8fafc",
			secondaryColor: organizationSecondaryColor || "#ffb900",
			secondaryForeground: organizationSecondaryForeground || "#171717",
		}),
		[
			organizationLogoUrl,
			organizationName,
			organizationPrimaryColor,
			organizationPrimaryForeground,
			organizationSecondaryColor,
			organizationSecondaryForeground,
		],
	);

	useEffect(() => {
		if (templateId) {
			const stored = findStoredMessageTemplateDraft(templateId);
			if (stored) setDraft(stored);
		}
		setHydrated(true);
	}, [templateId]);

	const detectedVariables = useMemo(
		() =>
			extractTemplateVariables([
				draft.email.assunto,
				draft.email.preheader,
				draft.cabecalho.conteudoTexto,
				draft.corpo.conteudo,
				draft.rodape,
				...draft.botoes.map((button) => button.texto),
			]),
		[draft],
	);
	const unknownVariables = useMemo(
		() =>
			extractUnknownTemplateVariables([
				draft.email.assunto,
				draft.email.preheader,
				draft.cabecalho.conteudoTexto,
				draft.corpo.conteudo,
				draft.rodape,
				...draft.botoes.map((button) => button.texto),
			]),
		[draft],
	);

	useEffect(() => {
		if (!hydrated) return;
		setDraft((current) => {
			const existingById = new Map(current.corpo.parametros.map((parametro) => [parametro.identificadorInterno, parametro]));
			const nextParametros = detectedVariables.map((identificadorInterno, index) => {
				const existing = existingById.get(identificadorInterno);
				if (existing)
					return {
						...existing,
						identificadorExterno: String(index + 1),
						exemplo: existing.exemplo || getDefaultMessageTemplateVariableExample(identificadorInterno),
					};
				return {
					identificadorInterno,
					identificadorExterno: String(index + 1),
					exemplo: getDefaultMessageTemplateVariableExample(identificadorInterno),
				};
			});
			const same =
				nextParametros.length === current.corpo.parametros.length &&
				nextParametros.every(
					(parametro, index) =>
						parametro.identificadorInterno === current.corpo.parametros[index]?.identificadorInterno &&
						parametro.identificadorExterno === current.corpo.parametros[index]?.identificadorExterno &&
						parametro.exemplo === current.corpo.parametros[index]?.exemplo,
				);
			if (same) return current;
			return { ...current, corpo: { ...current.corpo, parametros: nextParametros } };
		});
	}, [detectedVariables, hydrated]);

	function updateDraft(update: Partial<TMessageTemplateDraft>) {
		setDraft((current) => ({ ...current, ...update }));
	}

	function updateEmail(update: Partial<TMessageTemplateDraft["email"]>) {
		setDraft((current) => ({ ...current, email: { ...current.email, ...update } }));
	}

	function updateCabecalho(update: Partial<TMessageTemplateDraft["cabecalho"]>) {
		setDraft((current) => ({ ...current, cabecalho: { ...current.cabecalho, ...update } }));
	}

	function updateCorpo(update: Partial<TMessageTemplateDraft["corpo"]>) {
		setDraft((current) => ({ ...current, corpo: { ...current.corpo, ...update } }));
	}

	function updateParametro(index: number, update: Partial<TTemplateParameterDraft>) {
		setDraft((current) => ({
			...current,
			corpo: {
				...current.corpo,
				parametros: current.corpo.parametros.map((parametro, itemIndex) => (itemIndex === index ? { ...parametro, ...update } : parametro)),
			},
		}));
	}

	function toggleChannel(channel: TTemplateChannel) {
		setDraft((current) => {
			const hasChannel = current.canais.includes(channel);
			const nextChannels = hasChannel ? current.canais.filter((item) => item !== channel) : [...current.canais, channel];
			return { ...current, canais: nextChannels.length > 0 ? nextChannels : current.canais };
		});
	}

	function addButton() {
		setDraft((current) => ({
			...current,
			botoes: [...current.botoes, { tipo: "URL", texto: "Abrir link", url: "https://" }],
		}));
	}

	function addPresetButton(presetId: "CLIENT_POI_PROFILE") {
		const preset = getMessageTemplateButtonPreset(presetId);
		if (!preset) return;
		setDraft((current) => ({
			...current,
			botoes: [
				...current.botoes,
				{
					tipo: "URL_PRESET",
					preset: preset.id,
					texto: preset.defaultText,
					exemplo: preset.resolveWhatsappParameterExample(),
				},
			],
		}));
	}

	function updateButton(index: number, button: TTemplateButtonDraft) {
		setDraft((current) => ({ ...current, botoes: current.botoes.map((item, itemIndex) => (itemIndex === index ? button : item)) }));
	}

	function removeButton(index: number) {
		setDraft((current) => ({ ...current, botoes: current.botoes.filter((_, itemIndex) => itemIndex !== index) }));
	}

	function handleSave() {
		if (!draft.nome.trim()) {
			toast.error("Informe o nome do template.");
			return;
		}
		if (!draft.corpo.conteudo.trim()) {
			toast.error("Informe o conteúdo do corpo.");
			return;
		}
		if (unknownVariables.length > 0) {
			toast.error("Existem variáveis fora do catálogo nativo.", {
				description: unknownVariables.map((variable) => `{{${variable}}}`).join(", "),
			});
			return;
		}
		const invalidPresetButton = draft.botoes.find((button) => button.tipo === "URL_PRESET" && !button.texto.trim());
		if (invalidPresetButton) {
			toast.error("Preencha o texto dos botões de preset.");
			return;
		}
		if (draft.canais.includes("EMAIL") && !draft.email.assunto.trim()) {
			toast.error("Informe o assunto do e-mail.");
			return;
		}
		const saved = upsertStoredMessageTemplateDraft(draft);
		setDraft(saved);
		toast.success("Template salvo localmente.", {
			description: "A UI já está pronta para ser conectada à API de templates.",
		});
		router.push("/dashboard/communication");
	}

	const whatsappWarnings = getWhatsappWarnings(draft);
	const emailWarnings = getEmailWarnings(draft);

	return (
		<div className="flex w-full flex-col gap-4">
			<header className="border-border bg-card flex flex-col gap-3 rounded-lg border p-4 shadow-xs lg:flex-row lg:items-center lg:justify-between">
				<div className="flex min-w-0 items-start gap-3">
					<Button variant="ghost" size="icon-sm" type="button" onClick={() => router.push("/dashboard/communication")}>
						<ArrowLeft className="h-4 w-4" />
					</Button>
					<div className="min-w-0">
						<p className="text-muted-foreground text-xs font-bold uppercase">BUILDER DE TEMPLATE UNIVERSAL</p>
						<h1 className="truncate text-xl font-bold">{templateId ? "Editar template" : "Novo template de mensagem"}</h1>
					</div>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<Button variant="outline" type="button" className="gap-2" onClick={() => router.push("/dashboard/communication")}>
						CANCELAR
					</Button>
					<Button type="button" className="gap-2" onClick={handleSave}>
						<Save className="h-4 w-4" />
						SALVAR TEMPLATE
					</Button>
				</div>
			</header>

			<div className="grid min-h-[calc(100vh-12rem)] gap-4 xl:grid-cols-[minmax(280px,0.8fr)_minmax(520px,1.5fr)_minmax(340px,1fr)]">
				<BuilderPanel icon={<BadgeCheck className="h-4 w-4" />} title="CONFIGURAÇÃO" description="Identidade, canais e regras de envio.">
					<div className="flex flex-col gap-4">
						<Field label="Nome interno">
							<Input value={draft.nome} onChange={(event) => updateDraft({ nome: event.target.value })} placeholder="cashback_expirando_7_dias" />
						</Field>
						<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
							<Field label="Status">
								<Select value={draft.status} onValueChange={(value) => updateDraft({ status: value as TTemplateStatus })}>
									<SelectTrigger className="w-full">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{statusOptions.map((status) => (
											<SelectItem key={status} value={status}>
												{status}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</Field>
							<Field label="Categoria">
								<Select value={draft.categoria} onValueChange={(value) => updateDraft({ categoria: value as TTemplateCategory })}>
									<SelectTrigger className="w-full">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{categoryOptions.map((category) => (
											<SelectItem key={category} value={category}>
												{category}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</Field>
						</div>

						<div className="flex flex-col gap-2">
							<p className="text-xs font-bold uppercase">Canais</p>
							{channelOptions.map((channel) => {
								const Icon = channel.icon;
								const selected = draft.canais.includes(channel.id);
								return (
									<button
										key={channel.id}
										type="button"
										onClick={() => toggleChannel(channel.id)}
										className={cn(
											"border-border bg-background flex gap-3 rounded-lg border p-3 text-left transition-colors",
											selected && "border-primary bg-primary/5",
										)}
									>
										<span className="bg-muted flex h-9 w-9 items-center justify-center rounded-lg">
											<Icon className="h-4 w-4" />
										</span>
										<span className="min-w-0 flex-1">
											<span className="flex items-center gap-2 text-sm font-bold">
												{channel.label}
												{selected ? <Check className="text-primary h-3.5 w-3.5" /> : null}
											</span>
											<span className="text-muted-foreground text-xs leading-5">{channel.description}</span>
										</span>
									</button>
								);
							})}
						</div>

						{draft.canais.includes("EMAIL") ? (
							<div className="border-border bg-muted/20 flex flex-col gap-3 rounded-lg border p-3">
								<p className="flex items-center gap-1.5 text-xs font-bold uppercase">
									<Mail className="h-3.5 w-3.5" />
									E-mail
								</p>
								<Field label="Assunto">
									<Input
										value={draft.email.assunto}
										onChange={(event) => updateEmail({ assunto: event.target.value })}
										placeholder="{{clientName}}, temos novidades"
									/>
								</Field>
								<Field label="Preheader">
									<Input
										value={draft.email.preheader}
										onChange={(event) => updateEmail({ preheader: event.target.value })}
										placeholder="Texto de apoio exibido na caixa de entrada."
									/>
								</Field>
								<p className="text-muted-foreground text-xs">
									Remetente previsto: <strong>{slugifySender(organizationName)}@recompracrm.com.br</strong>
								</p>
							</div>
						) : null}
					</div>
				</BuilderPanel>

				<BuilderPanel icon={<FileText className="h-4 w-4" />} title="CONTEÚDO UNIVERSAL" description="O mesmo texto alimenta WhatsApp e e-mail.">
					<div className="flex flex-col gap-4">
						<Field label="Cabeçalho">
							<Select
								value={draft.cabecalho.tipo}
								onValueChange={(value) =>
									updateCabecalho({
										tipo: value as TMessageTemplateDraft["cabecalho"]["tipo"],
										conteudoMidiaUrl: value === "IMAGEM_DINAMICA" ? "" : draft.cabecalho.conteudoMidiaUrl,
										imagemDinamicaPreset: draft.cabecalho.imagemDinamicaPreset || "CASHBACK_AVAILABLE_BALANCE",
									})
								}
							>
								<SelectTrigger className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{headerTypeOptions.map((type) => (
										<SelectItem key={type.id} value={type.id}>
											{type.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</Field>
						{draft.cabecalho.tipo === "TEXTO" ? (
							<Field label="Texto do cabeçalho">
								<Input value={draft.cabecalho.conteudoTexto} onChange={(event) => updateCabecalho({ conteudoTexto: event.target.value })} />
							</Field>
						) : draft.cabecalho.tipo === "IMAGEM_DINAMICA" ? (
							<DynamicHeaderPresetPicker
								presetId={draft.cabecalho.imagemDinamicaPreset || "CASHBACK_AVAILABLE_BALANCE"}
								onChange={(presetId) => updateCabecalho({ imagemDinamicaPreset: presetId })}
							/>
						) : draft.cabecalho.tipo !== "NENHUM" ? (
							<HeaderMediaUpload
								headerType={draft.cabecalho.tipo}
								currentUrl={draft.cabecalho.conteudoMidiaUrl}
								organizationId={organizationId}
								onUploaded={(url) => updateCabecalho({ conteudoMidiaUrl: url })}
								onRemoved={() => updateCabecalho({ conteudoMidiaUrl: "" })}
							/>
						) : null}

						<Field label="Corpo da mensagem">
							<VariableTextarea
								value={draft.corpo.conteudo}
								onChange={(value) => updateCorpo({ conteudo: value })}
								placeholder="Digite { para inserir uma variável nativa..."
							/>
						</Field>

						<Field label="Rodapé">
							<Input value={draft.rodape} onChange={(event) => updateDraft({ rodape: event.target.value })} placeholder="Mensagem automática da sua loja." />
						</Field>

						<div className="border-border bg-muted/20 flex flex-col gap-3 rounded-lg border p-3">
							<div className="flex items-center justify-between gap-2">
								<p className="flex items-center gap-1.5 text-xs font-bold uppercase">
									<LinkIcon className="h-3.5 w-3.5" />
									Botões
								</p>
								<Button type="button" variant="ghost" size="xs" className="gap-1" onClick={addButton}>
									<Plus className="h-3.5 w-3.5" />
									MANUAL
								</Button>
							</div>
							<div className="flex flex-wrap gap-2">
								{MESSAGE_TEMPLATE_BUTTON_PRESET_OPTIONS.map((preset) => (
									<Button key={preset.id} type="button" variant="outline" size="xs" className="gap-1" onClick={() => addPresetButton(preset.id)}>
										<Plus className="h-3.5 w-3.5" />
										{preset.label}
									</Button>
								))}
							</div>
							{draft.botoes.length > 0 ? (
								draft.botoes.map((button, index) => (
									<ButtonEditor key={index} button={button} index={index} updateButton={updateButton} removeButton={removeButton} />
								))
							) : (
								<p className="text-muted-foreground text-xs">Nenhum botão configurado.</p>
							)}
						</div>

						<div className="border-border bg-muted/20 flex flex-col gap-3 rounded-lg border p-3">
							<p className="flex items-center gap-1.5 text-xs font-bold uppercase">
								<Braces className="h-3.5 w-3.5" />
								Variáveis detectadas
							</p>
							{draft.corpo.parametros.length > 0 ? (
								<div className="flex flex-col gap-2">
									{draft.corpo.parametros.map((parametro, index) => (
										<div key={parametro.identificadorInterno} className="grid gap-2 rounded-lg bg-background p-2 md:grid-cols-[1fr_1fr]">
											<div className="border-border bg-muted/30 flex min-h-9 items-center rounded-4xl border px-3 font-mono text-sm">
												{`{{${parametro.identificadorInterno}}}`}
											</div>
											<Input value={parametro.exemplo} onChange={(event) => updateParametro(index, { exemplo: event.target.value })} placeholder="Exemplo" />
										</div>
									))}
								</div>
							) : (
								<p className="text-muted-foreground text-xs">Use variáveis como {"{{clientName}}"} no conteúdo.</p>
							)}
							{unknownVariables.length > 0 ? (
								<div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs font-medium text-red-700">
									Variáveis não permitidas: {unknownVariables.map((variable) => `{{${variable}}}`).join(", ")}.
								</div>
							) : null}
						</div>
					</div>
				</BuilderPanel>

				<BuilderPanel icon={<Eye className="h-4 w-4" />} title="PREVIEW E VALIDAÇÃO" description="Confira a leitura em cada canal.">
					<div className="flex flex-col gap-4">
						{draft.canais.includes("WHATSAPP") ? <WhatsappPreview draft={draft} organizationTheme={organizationTheme} warnings={whatsappWarnings} /> : null}
						{draft.canais.includes("EMAIL") ? (
							<EmailPreview
								draft={draft}
								organizationId={organizationId}
								organizationName={organizationName}
								organizationTheme={organizationTheme}
								warnings={emailWarnings}
							/>
						) : null}
					</div>
				</BuilderPanel>
			</div>
		</div>
	);
}

function BuilderPanel({
	icon,
	title,
	description,
	children,
}: {
	icon: React.ReactNode;
	title: string;
	description: string;
	children: React.ReactNode;
}) {
	return (
		<section className="border-border bg-card flex min-h-0 flex-col rounded-lg border shadow-xs">
			<div className="border-border border-b px-4 py-3">
				<div className="flex items-center gap-1.5">
					{icon}
					<h2 className="text-sm font-bold">{title}</h2>
				</div>
				<p className="text-muted-foreground mt-0.5 text-xs leading-5">{description}</p>
			</div>
			<div className="min-h-0 flex-1 overflow-auto p-4">{children}</div>
		</section>
	);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<label className="flex flex-col gap-1.5">
			<span className="text-xs font-bold uppercase">{label}</span>
			{children}
		</label>
	);
}

function HeaderMediaUpload({
	headerType,
	currentUrl,
	organizationId,
	onUploaded,
	onRemoved,
}: {
	headerType: "IMAGEM" | "VIDEO" | "DOCUMENTO";
	currentUrl: string;
	organizationId: string;
	onUploaded: (url: string) => void;
	onRemoved: () => void;
}) {
	const mappedType = headerType === "IMAGEM" ? "image" : headerType === "VIDEO" ? "video" : "document";

	return (
		<div className="sm:col-span-2">
			<TemplateMediaUpload
				headerType={mappedType}
				currentUrl={currentUrl || null}
				onMediaUploaded={onUploaded}
				onMediaRemoved={onRemoved}
				organizationId={organizationId}
			/>
		</div>
	);
}

function DynamicHeaderPresetPicker({
	presetId,
	onChange,
}: {
	presetId: TTemplateDynamicHeaderPreset;
	onChange: (presetId: TTemplateDynamicHeaderPreset) => void;
}) {
	const selectedPreset =
		MessageTemplateDynamicHeaderPresetOptions.find((preset) => preset.id === presetId) ?? MessageTemplateDynamicHeaderPresetOptions[0];

	return (
		<div className="sm:col-span-2">
			<div className="flex flex-col gap-3">
				<Field label="Preset da imagem">
					<Select value={presetId} onValueChange={(value) => onChange(value as TTemplateDynamicHeaderPreset)}>
						<SelectTrigger className="w-full">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{MessageTemplateDynamicHeaderPresetOptions.map((preset) => (
								<SelectItem key={preset.id} value={preset.id}>
									{preset.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</Field>
				<div className="text-muted-foreground flex gap-2 rounded-lg bg-background p-3 text-xs leading-5">
					<ImageIcon className="mt-0.5 h-4 w-4 shrink-0" />
					<p>{selectedPreset?.description}</p>
				</div>
			</div>
		</div>
	);
}

function VariableTextarea({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
	const textareaRef = useRef<HTMLTextAreaElement | null>(null);
	const previewRef = useRef<HTMLPreElement | null>(null);
	const [cursorPosition, setCursorPosition] = useState(0);
	const [selectedIndex, setSelectedIndex] = useState(0);

	const trigger = useMemo(() => getVariableTrigger(value, cursorPosition), [value, cursorPosition]);
	const suggestions = useMemo(() => {
		if (!trigger.active) return [];
		const query = trigger.query.toLowerCase();
		return MessageTemplateNativeVariables.filter((variable) => {
			return (
				variable.identificador.toLowerCase().includes(query) ||
				variable.label.toLowerCase().includes(query) ||
				variable.description.toLowerCase().includes(query)
			);
		}).slice(0, 10);
	}, [trigger]);

	useEffect(() => {
		setSelectedIndex(0);
	}, [trigger.query]);

	function syncCursorPosition() {
		const textarea = textareaRef.current;
		if (!textarea) return;
		setCursorPosition(textarea.selectionStart);
	}

	function syncScroll() {
		if (!textareaRef.current || !previewRef.current) return;
		previewRef.current.scrollTop = textareaRef.current.scrollTop;
		previewRef.current.scrollLeft = textareaRef.current.scrollLeft;
	}

	function insertVariable(identifier: string) {
		if (!trigger.active) return;
		const before = value.slice(0, trigger.start);
		const after = value.slice(cursorPosition);
		const insertion = `{{${identifier}}}`;
		const nextValue = `${before}${insertion}${after}`;
		onChange(nextValue);

		window.requestAnimationFrame(() => {
			const textarea = textareaRef.current;
			if (!textarea) return;
			const nextCursor = before.length + insertion.length;
			textarea.focus();
			textarea.setSelectionRange(nextCursor, nextCursor);
			setCursorPosition(nextCursor);
		});
	}

	function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
		if (!trigger.active || suggestions.length === 0) return;
		if (event.key === "ArrowDown") {
			event.preventDefault();
			setSelectedIndex((current) => (current + 1) % suggestions.length);
		}
		if (event.key === "ArrowUp") {
			event.preventDefault();
			setSelectedIndex((current) => (current + suggestions.length - 1) % suggestions.length);
		}
		if (event.key === "Enter" || event.key === "Tab") {
			event.preventDefault();
			const selected = suggestions[selectedIndex];
			if (selected) insertVariable(selected.identificador);
		}
		if (event.key === "Escape") {
			setCursorPosition(0);
		}
	}

	return (
		<div className="relative">
			<pre
				ref={previewRef}
				aria-hidden
				className="pointer-events-none absolute inset-0 min-h-56 overflow-hidden whitespace-pre-wrap break-words rounded-xl border border-transparent px-3 py-3 font-sans text-sm leading-6"
			>
				{renderRawTemplateWithHighlights(value)}
			</pre>
			<Textarea
				ref={textareaRef}
				className="relative min-h-56 resize-y bg-transparent font-sans text-sm leading-6 text-transparent caret-foreground selection:bg-primary/20"
				value={value}
				onChange={(event) => {
					onChange(event.target.value);
					setCursorPosition(event.target.selectionStart);
				}}
				onScroll={syncScroll}
				onClick={syncCursorPosition}
				onKeyUp={syncCursorPosition}
				onSelect={syncCursorPosition}
				onKeyDown={handleKeyDown}
				placeholder={placeholder}
			/>
			{trigger.active ? (
				<div className="bg-popover text-popover-foreground border-border absolute z-50 mt-2 max-h-80 w-full overflow-y-auto rounded-lg border p-2 shadow-xl">
					<div className="border-border mb-1 border-b px-2 pb-2">
						<p className="text-muted-foreground text-[0.65rem] font-bold uppercase">Variáveis nativas</p>
						<p className="text-muted-foreground text-[0.65rem]">Use setas e Enter, ou clique para inserir.</p>
					</div>
					{suggestions.length > 0 ? (
						suggestions.map((variable, index) => (
							<button
								key={variable.identificador}
								type="button"
								className={cn(
									"flex w-full flex-col gap-0.5 rounded-md px-2 py-2 text-left transition-colors",
									index === selectedIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent/60",
								)}
								onMouseDown={(event) => {
									event.preventDefault();
									insertVariable(variable.identificador);
								}}
							>
								<span className="flex items-center justify-between gap-2">
									<span className="text-xs font-bold uppercase">{variable.label}</span>
									<span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[0.6rem] font-bold">
										{getVariableContextLabel(variable.contexto)}
									</span>
								</span>
								<span className="font-mono text-[0.7rem]">{`{{${variable.identificador}}}`}</span>
								<span className="text-muted-foreground line-clamp-2 text-[0.7rem]">{variable.description}</span>
							</button>
						))
					) : (
						<p className="text-muted-foreground px-2 py-3 text-sm">Nenhuma variável nativa encontrada.</p>
					)}
				</div>
			) : null}
		</div>
	);
}

function renderRawTemplateWithHighlights(text: string) {
	const nodes: React.ReactNode[] = [];
	let lastIndex = 0;
	let index = 0;
	for (const match of text.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)) {
		const start = match.index ?? 0;
		const end = start + match[0].length;
		if (start > lastIndex) nodes.push(text.slice(lastIndex, start));
		nodes.push(
			<span key={`${match[0]}-${index}`} className="rounded-sm bg-primary/15 text-primary">
				{match[0]}
			</span>,
		);
		lastIndex = end;
		index += 1;
	}
	if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
	return nodes.length > 0 ? nodes : <span className="text-muted-foreground">{""}</span>;
}

function getVariableTrigger(value: string, cursorPosition: number) {
	const beforeCursor = value.slice(0, cursorPosition);
	const lastOpen = beforeCursor.lastIndexOf("{");
	if (lastOpen === -1) return { active: false as const, start: -1, query: "" };

	const between = beforeCursor.slice(lastOpen + 1);
	if (between.includes("}") || between.includes("\n")) return { active: false as const, start: -1, query: "" };
	if (!/^[a-zA-Z0-9_]*$/.test(between)) return { active: false as const, start: -1, query: "" };

	return { active: true as const, start: lastOpen, query: between };
}

function getVariableContextLabel(contexto: string) {
	if (contexto === "CLIENTE") return "Cliente";
	if (contexto === "COMPRA") return "Compra";
	if (contexto === "CASHBACK") return "Cashback";
	if (contexto === "CASHBACK_EXPIRANDO") return "Expiração";
	return contexto;
}

function ButtonEditor({
	button,
	index,
	updateButton,
	removeButton,
}: {
	button: TTemplateButtonDraft;
	index: number;
	updateButton: (index: number, button: TTemplateButtonDraft) => void;
	removeButton: (index: number) => void;
}) {
	if (button.tipo === "URL_PRESET") {
		const preset = getMessageTemplateButtonPreset(button.preset);

		return (
			<div className="grid gap-2 rounded-lg bg-background p-2">
				<div className="flex flex-wrap items-start justify-between gap-2">
					<div className="min-w-0">
						<p className="text-xs font-bold uppercase">{preset?.label ?? button.preset}</p>
						<p className="text-muted-foreground text-xs">{preset?.description}</p>
					</div>
					<Button type="button" variant="ghost-destructive" size="icon-sm" onClick={() => removeButton(index)}>
						<Trash2 className="h-4 w-4" />
					</Button>
				</div>
				<Input value={button.texto} onChange={(event) => updateButton(index, { ...button, texto: event.target.value })} placeholder="Texto do botão" />
			</div>
		);
	}

	return (
		<div className="grid gap-2 rounded-lg bg-background p-2 md:grid-cols-[140px_1fr_1fr_auto]">
			<Select
				value={button.tipo}
				onValueChange={(value) => {
					if (value === "URL") updateButton(index, { tipo: "URL", texto: button.texto, url: "url" in button ? button.url : "https://" });
					if (value === "RESPOSTA RÁPIDA") updateButton(index, { tipo: "RESPOSTA RÁPIDA", texto: button.texto });
					if (value === "TELEFONE") updateButton(index, { tipo: "TELEFONE", texto: button.texto, telefone: "telefone" in button ? button.telefone : "" });
				}}
			>
				<SelectTrigger className="w-full">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="URL">URL</SelectItem>
					<SelectItem value="RESPOSTA RÁPIDA">RESPOSTA RÁPIDA</SelectItem>
					<SelectItem value="TELEFONE">TELEFONE</SelectItem>
				</SelectContent>
			</Select>
			<Input
				value={button.texto}
				onChange={(event) => updateButton(index, { ...button, texto: event.target.value } as TTemplateButtonDraft)}
				placeholder="Texto"
			/>
			{"url" in button ? (
				<Input value={button.url} onChange={(event) => updateButton(index, { ...button, url: event.target.value })} placeholder="https://" />
			) : "telefone" in button ? (
				<Input value={button.telefone} onChange={(event) => updateButton(index, { ...button, telefone: event.target.value })} placeholder="+55..." />
			) : (
				<div />
			)}
			<Button type="button" variant="ghost-destructive" size="icon-sm" onClick={() => removeButton(index)}>
				<Trash2 className="h-4 w-4" />
			</Button>
		</div>
	);
}

function WhatsappPreview({
	draft,
	organizationTheme,
	warnings,
}: {
	draft: TMessageTemplateDraft;
	organizationTheme: OrganizationTemplateTheme;
	warnings: string[];
}) {
	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-center gap-2 text-sm font-bold">
				<WhatsappIcon className="h-4 w-4 text-emerald-600" />
				WhatsApp
			</div>
			<div className="rounded-2xl bg-[#e8f5e9] p-3">
				<div className="ml-auto flex max-w-[92%] flex-col gap-2 rounded-xl bg-white p-3 text-sm shadow-sm">
					{draft.cabecalho.tipo === "TEXTO" && draft.cabecalho.conteudoTexto ? (
						<p className="font-bold">{renderResolvedTemplateWithHighlights(draft.cabecalho.conteudoTexto, draft.corpo.parametros)}</p>
					) : draft.cabecalho.tipo === "IMAGEM_DINAMICA" ? (
						<DynamicHeaderImagePreview
							presetId={draft.cabecalho.imagemDinamicaPreset || "CASHBACK_AVAILABLE_BALANCE"}
							organizationTheme={organizationTheme}
						/>
					) : draft.cabecalho.tipo !== "NENHUM" ? (
						<MediaPreview type={draft.cabecalho.tipo} url={draft.cabecalho.conteudoMidiaUrl} />
					) : null}
					<p className="whitespace-pre-wrap leading-5">{renderResolvedTemplateWithHighlights(draft.corpo.conteudo, draft.corpo.parametros)}</p>
					{draft.rodape ? (
						<p className="text-muted-foreground border-t pt-2 text-xs">{renderResolvedTemplateWithHighlights(draft.rodape, draft.corpo.parametros)}</p>
					) : null}
					{draft.botoes.length > 0 ? (
						<div className="flex flex-col gap-1 border-t pt-2">
							{draft.botoes.map((button, index) => (
								<button key={index} type="button" className="text-sky-600 text-xs font-bold">
									{button.texto}
									{button.tipo === "URL_PRESET" ? " ↗" : null}
								</button>
							))}
						</div>
					) : null}
				</div>
			</div>
			<Warnings warnings={warnings} />
		</div>
	);
}

function EmailPreview({
	draft,
	organizationId,
	organizationName,
	organizationTheme,
	warnings,
}: {
	draft: TMessageTemplateDraft;
	organizationId: string;
	organizationName: string;
	organizationTheme: OrganizationTemplateTheme;
	warnings: string[];
}) {
	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-center gap-2 text-sm font-bold">
				<Mail className="h-4 w-4 text-sky-600" />
				E-mail
			</div>
			<div className="border-border overflow-hidden rounded-xl border bg-white text-zinc-950">
				<div className="border-b bg-zinc-50 p-3">
					<p className="text-xs text-zinc-500">
						De: {organizationName} &lt;{slugifySender(organizationName)}@recompracrm.com.br&gt;
					</p>
					<p className="mt-1 text-sm font-bold">
						{renderResolvedTemplateWithHighlights(draft.email.assunto || "Assunto do e-mail", draft.corpo.parametros)}
					</p>
					{draft.email.preheader ? (
						<p className="text-xs text-zinc-500">{renderResolvedTemplateWithHighlights(draft.email.preheader, draft.corpo.parametros)}</p>
					) : null}
				</div>
				<div className="p-4">
					{draft.cabecalho.tipo === "TEXTO" && draft.cabecalho.conteudoTexto ? (
						<h3 className="mb-3 text-lg font-bold">{renderResolvedTemplateWithHighlights(draft.cabecalho.conteudoTexto, draft.corpo.parametros)}</h3>
					) : draft.cabecalho.tipo === "IMAGEM_DINAMICA" ? (
						<div className="mb-4">
							<DynamicHeaderImagePreview
								presetId={draft.cabecalho.imagemDinamicaPreset || "CASHBACK_AVAILABLE_BALANCE"}
								organizationTheme={organizationTheme}
							/>
						</div>
					) : draft.cabecalho.tipo !== "NENHUM" ? (
						<div className="mb-4">
							<MediaPreview type={draft.cabecalho.tipo} url={draft.cabecalho.conteudoMidiaUrl} />
						</div>
					) : null}
					<p className="whitespace-pre-wrap text-sm leading-6">{renderResolvedTemplateWithHighlights(draft.corpo.conteudo, draft.corpo.parametros)}</p>
					{draft.botoes[0] ? <EmailPreviewButton button={draft.botoes[0]} organizationId={organizationId} /> : null}
					{draft.rodape ? (
						<p className="mt-5 border-t pt-3 text-xs text-zinc-500">{renderResolvedTemplateWithHighlights(draft.rodape, draft.corpo.parametros)}</p>
					) : null}
				</div>
			</div>
			<Warnings warnings={warnings} />
		</div>
	);
}

function EmailPreviewButton({ button, organizationId }: { button: TTemplateButtonDraft; organizationId: string }) {
	const href =
		button.tipo === "URL"
			? button.url
			: button.tipo === "URL_PRESET"
				? (getMessageTemplateButtonPreset(button.preset)?.buildRuntimeUrl({
						origin: getDefaultAppOrigin(),
						orgId: organizationId,
						clientId: button.exemplo || "CLIENT_ID",
					}) ?? "#")
				: "#";

	return (
		<a
			href={href}
			className="mt-4 inline-flex rounded-md bg-zinc-950 px-4 py-2 text-xs font-bold text-white"
			onClick={(event) => event.preventDefault()}
		>
			{button.texto}
		</a>
	);
}

function MediaPreview({ type, url }: { type: TMessageTemplateDraft["cabecalho"]["tipo"]; url: string }) {
	if (!url) {
		return <div className="bg-muted text-muted-foreground flex h-24 items-center justify-center rounded-lg text-xs font-semibold">{type}</div>;
	}
	if (type === "IMAGEM") {
		return <img src={url} alt="Cabeçalho do template" className="h-32 w-full rounded-lg object-cover" />;
	}
	if (type === "VIDEO") {
		return (
			<video src={url} className="h-32 w-full rounded-lg object-cover" controls>
				<track kind="captions" />
			</video>
		);
	}
	return (
		<a
			href={url}
			target="_blank"
			rel="noreferrer"
			className="bg-muted text-muted-foreground flex h-20 items-center justify-center rounded-lg text-xs font-semibold"
		>
			Documento anexado
		</a>
	);
}

function renderResolvedTemplateWithHighlights(text: string, parametros: TTemplateParameterDraft[]) {
	const nodes: React.ReactNode[] = [];
	let lastIndex = 0;
	let index = 0;
	for (const match of text.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)) {
		const start = match.index ?? 0;
		const end = start + match[0].length;
		const parametro = parametros.find((item) => item.identificadorInterno === match[1]);
		if (start > lastIndex) nodes.push(text.slice(lastIndex, start));
		nodes.push(
			<span key={`${match[0]}-${index}`} className="rounded-md bg-primary/15 px-1 py-0.5 font-semibold text-primary">
				{parametro?.exemplo || match[0]}
			</span>,
		);
		lastIndex = end;
		index += 1;
	}
	if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
	return nodes.length > 0 ? nodes : text;
}

function Warnings({ warnings }: { warnings: string[] }) {
	if (warnings.length === 0) {
		return (
			<div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs font-medium text-emerald-700">
				Pronto para revisão neste canal.
			</div>
		);
	}
	return (
		<div className="flex flex-col gap-1 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs font-medium text-amber-800">
			{warnings.map((warning) => (
				<p key={warning}>- {warning}</p>
			))}
		</div>
	);
}

function getWhatsappWarnings(draft: TMessageTemplateDraft) {
	const warnings: string[] = [];
	if (draft.corpo.conteudo.length > 1024) warnings.push("O corpo está longo para WhatsApp.");
	if (draft.botoes.length > 3) warnings.push("WhatsApp costuma funcionar melhor com até 3 botões.");
	if (
		draft.cabecalho.tipo !== "NENHUM" &&
		draft.cabecalho.tipo !== "TEXTO" &&
		draft.cabecalho.tipo !== "IMAGEM_DINAMICA" &&
		!draft.cabecalho.conteudoMidiaUrl
	) {
		warnings.push("Envie a mídia do cabeçalho.");
	}
	return warnings;
}

function getEmailWarnings(draft: TMessageTemplateDraft) {
	const warnings: string[] = [];
	if (!draft.email.assunto.trim()) warnings.push("O e-mail precisa de assunto.");
	if (draft.email.assunto.length > 80) warnings.push("O assunto pode ficar cortado em caixas de entrada.");
	if (!draft.email.preheader.trim()) warnings.push("Preheader recomendado para melhorar leitura na caixa de entrada.");
	return warnings;
}

function slugifySender(value: string) {
	return value
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "")
		.slice(0, 32);
}
