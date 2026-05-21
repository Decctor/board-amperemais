"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { CalendarPlus, Copy, Edit3, Link, Mail, MessageSquareText, Pencil, Plus, Search, Send, Smartphone, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { buildEmptyMessageTemplateDraft, type TMessageTemplateDraft, type TTemplateChannel } from "./template-draft-store";
import { useMessageTemplates } from "@/lib/queries/message-templates";
import GeneralPaginationComponent from "@/components/Utils/Pagination";
import ErrorComponent from "@/components/Layouts/ErrorComponent";
import { TGetMessageTemplatesOutputDefault } from "@/app/api/message-templates/route";
import { PencilIcon } from "lucide-react";
import { getErrorMessage } from "@/lib/errors";
import { formatDateAsLocale } from "@/lib/formatting";
import { BsCalendarPlus } from "react-icons/bs";
import { ViewWhatsappTemplatePhone } from "@/components/Modals/WhatsappTemplates/Phones/ViewWhatsappTemplatePhone";

type CommunicationTemplatesPageProps = {
	organizationName: string;
};

const channelMeta: Record<TTemplateChannel, { label: string; icon: React.ElementType; className: string }> = {
	WHATSAPP: { label: "WhatsApp", icon: Smartphone, className: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" },
	EMAIL: { label: "E-mail", icon: Mail, className: "bg-sky-500/10 text-sky-700 border-sky-500/20" },
};

export default function CommunicationTemplatesPage({ organizationName }: CommunicationTemplatesPageProps) {
	const {
		data: templatesResult,
		isLoading,
		isSuccess,
		isError,
		error,
		params,
		updateParams,
	} = useMessageTemplates({ initialParams: { search: "", page: 1 } });
	const templates = templatesResult?.messageTemplates ?? [];
	const templatesMatched = templatesResult?.messageTemplatesMatched;
	const totalPages = templatesResult?.totalPages;
	return (
		<div className="w-full h-full flex flex-col gap-3">
			<div className="w-full flex flex-col gap-3">
				<div className="w-full flex items-center justify-end gap-2">
					<Button className="flex items-center gap-2" size="sm" asChild>
						<Link href="/dashboard/communication/builder">
							<Plus className="w-4 h-4 min-w-4 min-h-4" />
							NOVO TEMPLATE
						</Link>
					</Button>
				</div>
				<div className="w-full flex items-center gap-2 flex-col-reverse lg:flex-row">
					<Input
						value={params.search ?? ""}
						placeholder="Pesquisar campanha..."
						onChange={(e) => updateParams({ search: e.target.value })}
						className="grow rounded-xl"
					/>
				</div>

				<GeneralPaginationComponent
					activePage={params.page ?? 1}
					queryLoading={isLoading}
					selectPage={(page) => updateParams({ page })}
					totalPages={totalPages ?? 0}
					itemsMatchedText={`${templatesMatched} ${templatesMatched === 1 ? "template encontrada." : "templates encontradas."}`}
					itemsShowingText={`${templates.length} ${templates.length === 1 ? "template exibido." : "templates exibidos."}`}
				/>
			</div>
			{isLoading ? <p className="w-full flex items-center justify-center animate-pulse">Carregando campanhas...</p> : null}
			{isError ? <ErrorComponent msg={getErrorMessage(error)} /> : null}
			{isSuccess ? (
				<div className="w-full flex flex-col gap-1.5">
					{templates.length > 0 ? (
						templates.map((template) => <TemplateCard key={template.id} template={template} />)
					) : (
						<p className="w-full flex items-center justify-center">Nenhuma template encontrada</p>
					)}
				</div>
			) : null}
		</div>
	);
}

type TemplateCardProps = {
	template: TGetMessageTemplatesOutputDefault["messageTemplates"][number];
	callbacks: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: () => void;
		onSettled?: () => void;
	};
};

function TemplateCard({ template, callbacks }: TemplateCardProps) {
	const [viewWhatsappTemplatePhoneId, setViewWhatsappTemplatePhoneId] = useState<string | null>(null);

	const statusClassName =
		template.status === "ATIVO"
			? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
			: template.status === "ARQUIVADO"
				? "bg-zinc-500/10 text-zinc-700 border-zinc-500/20"
				: "bg-amber-500/10 text-amber-700 border-amber-500/20";

	return (
		<div className={cn("bg-card border-border flex w-full flex-col gap-1 rounded-xl border px-3 py-4 shadow-2xs")}>
			<div className="w-full flex flex-col gap-2">
				<div className="w-full flex items-center justify-between gap-2">
					<div className="flex flex-wrap items-center gap-2">
						<span className={"text-sm leading-none font-bold tracking-tight font-mono"}>TEMPLATE</span>
						<p className="text-xs px-2 py-1 rounded-lg bg-primary/10">{whatsappTemplate.nome}</p>
					</div>
					<div className="flex items-center gap-2">
						<HoverCard openDelay={200}>
							<HoverCardTrigger asChild>
								<Button type="button" size="sm" variant="ghost" className="flex items-center gap-1.5">
									<Eye className="h-3.5 w-3.5" />
									PREVIEW
								</Button>
							</HoverCardTrigger>
							<HoverCardContent
								className="w-[360px] p-2 overflow-auto max-h-[70vh] scrollbar-thin scrollbar-track-primary/10 scrollbar-thumb-primary/30"
								side="left"
								align="end"
							>
								<TemplatePreview components={whatsappTemplate.componentes} />
							</HoverCardContent>
						</HoverCard>
						<HoverCard>
							<HoverCardTrigger asChild>
								<div className="flex items-center gap-2">
									{whatsappConnectionPhones.length > 0 ? (
										<div className="flex items-center gap-1 text-xs text-muted-foreground">
											<Phone className="w-3 h-3" />
											<span>
												{whatsappTemplate.telefonesAprovados}/{whatsappConnectionPhones.length}
											</span>
										</div>
									) : null}

									<div
										className={cn("px-2 py-0.5 rounded-lg text-[0.65rem] font-bold", {
											"bg-blue-500 text-white": whatsappTemplate.statusGeral === "APROVADO",
											"bg-primary/20 text-foreground": whatsappTemplate.statusGeral === "PENDENTE",
											"bg-red-500 text-white": whatsappTemplate.statusGeral === "REJEITADO",
											"bg-orange-500 text-white": whatsappTemplate.statusGeral === "PAUSADO",
											"bg-gray-500 text-white": whatsappTemplate.statusGeral === "DESABILITADO" || whatsappTemplate.statusGeral === "RASCUNHO",
										})}
									>
										{whatsappTemplate.statusGeral}
									</div>
								</div>
							</HoverCardTrigger>
							<HoverCardContent className="flex flex-col gap-3 w-72 p-3">
								<h3 className="text-xs font-medium tracking-tight">TELEFONES CONECTADOS</h3>
								<div className="w-full flex flex-col gap-2">
									{whatsappConnectionPhones.map((telefone) => (
										<PhoneItemCard
											key={telefone.id}
											connectionPhone={telefone}
											handleCreateTemplatePhone={(phoneId) =>
												handleCreateWhatsappTemplatePhoneMutation({ whatsappTemplatePhone: { templateId: whatsappTemplate.id, telefoneId: phoneId } })
											}
											isCreatingWhatsappTemplatePhone={isCreatingWhatsappTemplatePhone}
											viewWhatsappTemplatePhone={viewWhatsappTemplatePhoneId}
										/>
									))}
								</div>
							</HoverCardContent>
						</HoverCard>
					</div>
				</div>

				<div className="flex flex-wrap items-center gap-2">
					<div className="flex items-center gap-1">
						<Diamond className="w-4 h-4 min-w-4 min-h-4" />
						<p className="text-xs font-medium text-foreground/80">{whatsappTemplate.categoria}</p>
					</div>
					<div className="flex items-center gap-1">
						<CircleGauge className="w-4 h-4 min-w-4 min-h-4" />
						<p className="text-xs font-medium text-foreground/80">{whatsappTemplate.qualidadeGeral}</p>
					</div>
				</div>
			</div>
			<div className="w-full flex items-center justify-between gap-2">
				<div className="flex items-center gap-1">
					<BsCalendarPlus className="w-4 h-4 min-w-4 min-h-4" />
					<p className="text-xs font-medium text-foreground/80">{formatDateAsLocale(whatsappTemplate.dataInsercao, true)}</p>
				</div>
				{/** GENERAL TEMPLATES ARE NOT EDITABLE (THOSE WITHOUT ORGANIZATION ID) */}
				{template.organizacaoId ? (
					<Button variant="ghost" className="flex items-center gap-1.5" size="sm" onClick={onEditClick}>
						<Pencil className="w-3 min-w-3 h-3 min-h-3" />
						EDITAR
					</Button>
				) : null}
			</div>
			{viewWhatsappTemplatePhoneId ? (
				<ViewWhatsappTemplatePhone
					whatsappTemplatePhoneId={viewWhatsappTemplatePhoneId}
					closeMenu={() => setViewWhatsappTemplatePhoneId(null)}
					callbacks={callbacks}
				/>
			) : null}
		</div>
	);
}
