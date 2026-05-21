"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { CalendarPlus, Copy, Edit3, Mail, MessageSquareText, Plus, Search, Send, Smartphone, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
	buildEmptyMessageTemplateDraft,
	getStoredMessageTemplateDrafts,
	type TMessageTemplateDraft,
	type TTemplateChannel,
} from "./template-draft-store";

type CommunicationTemplatesPageProps = {
	organizationName: string;
};

const channelMeta: Record<TTemplateChannel, { label: string; icon: React.ElementType; className: string }> = {
	WHATSAPP: { label: "WhatsApp", icon: Smartphone, className: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" },
	EMAIL: { label: "E-mail", icon: Mail, className: "bg-sky-500/10 text-sky-700 border-sky-500/20" },
};

function buildDemoTemplates(organizationName: string): TMessageTemplateDraft[] {
	const base = buildEmptyMessageTemplateDraft(organizationName);
	return [
		{
			...base,
			id: "demo-cashback-expiring",
			nome: "cashback_expirando_7_dias",
			status: "ATIVO",
			categoria: "MARKETING",
			email: {
				assunto: "{{clientName}}, seu cashback vence em breve",
				preheader: "Use seu saldo antes da data de expiração.",
			},
			corpo: {
				conteudo: "Olá {{clientName}}, você tem {{cashbackExpiringAmount}} em cashback que vence em {{cashbackExpiringDate}}. Aproveite antes que expire.",
				parametros: [
					{ identificadorInterno: "clientName", identificadorExterno: "1", exemplo: "Ana" },
					{ identificadorInterno: "cashbackExpiringAmount", identificadorExterno: "2", exemplo: "R$ 38,90" },
					{ identificadorInterno: "cashbackExpiringDate", identificadorExterno: "3", exemplo: "27/05/2026" },
				],
			},
			rodape: "Mensagem automática da sua loja.",
		},
		{
			...base,
			id: "demo-birthday",
			nome: "aniversario_cliente",
			status: "RASCUNHO",
			categoria: "UTILIDADE",
			canais: ["WHATSAPP"],
			email: { assunto: "", preheader: "" },
			corpo: {
				conteudo: "Feliz aniversário, {{clientName}}. Preparamos um presente especial para você usar nesta semana.",
				parametros: [{ identificadorInterno: "clientName", identificadorExterno: "1", exemplo: "Carlos" }],
			},
			botoes: [{ tipo: "RESPOSTA RÁPIDA", texto: "Quero meu presente" }],
		},
	];
}

export default function CommunicationTemplatesPage({ organizationName }: CommunicationTemplatesPageProps) {
	const router = useRouter();
	const [search, setSearch] = useState("");
	const [storedTemplates, setStoredTemplates] = useState<TMessageTemplateDraft[]>([]);

	useEffect(() => {
		setStoredTemplates(getStoredMessageTemplateDrafts());
	}, []);

	const templates = useMemo(() => [...storedTemplates, ...buildDemoTemplates(organizationName)], [organizationName, storedTemplates]);
	const filteredTemplates = useMemo(() => {
		const normalizedSearch = search.trim().toLowerCase();
		if (!normalizedSearch) return templates;
		return templates.filter((template) => [template.nome, template.categoria, template.status].join(" ").toLowerCase().includes(normalizedSearch));
	}, [search, templates]);

	const activeCount = templates.filter((template) => template.status === "ATIVO").length;
	const universalCount = templates.filter((template) => template.canais.length > 1).length;

	return (
		<div className="flex w-full flex-col gap-5">
			<section className="border-border bg-card grid gap-4 rounded-lg border p-4 shadow-xs lg:grid-cols-[1fr_auto]">
				<div className="flex min-w-0 flex-col gap-2">
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant="secondary" className="rounded-md">
							Comunicação
						</Badge>
						<span className="text-muted-foreground text-xs font-medium">Templates universais para mensagens automatizadas</span>
					</div>
					<div>
						<h1 className="text-2xl font-bold tracking-normal">Templates de mensagem</h1>
						<p className="text-muted-foreground mt-1 max-w-2xl text-sm">
							Crie um conteúdo base e acompanhe a compatibilidade para WhatsApp e e-mail sem duplicar a estratégia da campanha.
						</p>
					</div>
				</div>
				<div className="flex flex-col gap-2 sm:flex-row lg:items-start">
					<Button variant="outline" className="gap-2" type="button">
						<Send className="h-4 w-4" />
						TESTAR ENVIO
					</Button>
					<Button className="gap-2" type="button" onClick={() => router.push("/dashboard/communication/builder")}>
						<Plus className="h-4 w-4" />
						NOVO TEMPLATE
					</Button>
				</div>
			</section>

			<section className="grid gap-3 md:grid-cols-3">
				<MetricCard label="Templates" value={String(templates.length)} icon={MessageSquareText} />
				<MetricCard label="Ativos" value={String(activeCount)} icon={Sparkles} />
				<MetricCard label="Universais" value={String(universalCount)} icon={Copy} />
			</section>

			<section className="border-border bg-card flex flex-col gap-3 rounded-lg border p-3 shadow-xs">
				<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
					<div className="relative max-w-xl flex-1">
						<Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
						<Input className="pl-9" placeholder="Buscar por nome, categoria ou status..." value={search} onChange={(event) => setSearch(event.target.value)} />
					</div>
					<p className="text-muted-foreground text-xs font-medium">
						Mostrando {filteredTemplates.length} de {templates.length} templates.
					</p>
				</div>

				<div className="flex flex-col gap-2">
					{filteredTemplates.length > 0 ? (
						filteredTemplates.map((template) => (
							<TemplateCard
								key={template.id}
								template={template}
								isDemo={template.id.startsWith("demo-")}
								onEdit={() => router.push(`/dashboard/communication/builder?templateId=${template.id}`)}
							/>
						))
					) : (
						<div className="border-border flex min-h-56 flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-6 text-center">
							<MessageSquareText className="text-muted-foreground h-8 w-8" />
							<p className="text-sm font-semibold">Nenhum template encontrado.</p>
							<p className="text-muted-foreground max-w-sm text-xs">Ajuste a busca ou crie um novo template para começar.</p>
						</div>
					)}
				</div>
			</section>
		</div>
	);
}

function MetricCard({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) {
	return (
		<div className="border-border bg-card flex items-center justify-between rounded-lg border p-4 shadow-xs">
			<div>
				<p className="text-muted-foreground text-xs font-semibold uppercase">{label}</p>
				<p className="text-2xl font-bold">{value}</p>
			</div>
			<div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-lg">
				<Icon className="h-5 w-5" />
			</div>
		</div>
	);
}

function TemplateCard({ template, isDemo, onEdit }: { template: TMessageTemplateDraft; isDemo: boolean; onEdit: () => void }) {
	const statusClassName =
		template.status === "ATIVO"
			? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
			: template.status === "ARQUIVADO"
				? "bg-zinc-500/10 text-zinc-700 border-zinc-500/20"
				: "bg-amber-500/10 text-amber-700 border-amber-500/20";

	return (
		<article className="border-border bg-background hover:bg-muted/30 grid gap-3 rounded-lg border p-3 transition-colors lg:grid-cols-[1fr_auto]">
			<div className="flex min-w-0 gap-3">
				<div className="bg-primary/10 text-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-lg">
					<MessageSquareText className="h-5 w-5" />
				</div>
				<div className="min-w-0 flex-1">
					<div className="flex flex-wrap items-center gap-2">
						<h2 className="truncate text-sm font-bold">{template.nome || "Template sem nome"}</h2>
						<span className={cn("rounded-md border px-2 py-0.5 text-[0.65rem] font-bold", statusClassName)}>{template.status}</span>
						{isDemo ? <span className="bg-secondary text-secondary-foreground rounded-md px-2 py-0.5 text-[0.65rem] font-bold">EXEMPLO</span> : null}
					</div>
					<p className="text-muted-foreground mt-1 line-clamp-2 text-xs">{template.corpo.conteudo}</p>
					<div className="mt-3 flex flex-wrap items-center gap-2">
						{template.canais.map((channel) => {
							const meta = channelMeta[channel];
							const Icon = meta.icon;
							return (
								<span key={channel} className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[0.7rem] font-bold", meta.className)}>
									<Icon className="h-3 w-3" />
									{meta.label}
								</span>
							);
						})}
						<span className="bg-secondary text-secondary-foreground rounded-md px-2 py-1 text-[0.7rem] font-bold">{template.categoria}</span>
					</div>
				</div>
			</div>
			<div className="flex items-center justify-between gap-3 lg:flex-col lg:items-end">
				<div className="text-muted-foreground flex items-center gap-1 text-[0.7rem] font-medium">
					<CalendarPlus className="h-3.5 w-3.5" />
					{new Date(template.dataAtualizacao).toLocaleDateString("pt-BR")}
				</div>
				<Button variant="ghost" size="sm" className="gap-1.5" type="button" onClick={onEdit}>
					<Edit3 className="h-3.5 w-3.5" />
					EDITAR
				</Button>
			</div>
		</article>
	);
}
