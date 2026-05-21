"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
	CalendarPlus,
	CircleGauge,
	Copy,
	Diamond,
	Edit3,
	Eye,
	Link,
	Mail,
	MessageSquareText,
	Pencil,
	Phone,
	Plus,
	Search,
	Send,
	Smartphone,
	Sparkles,
} from "lucide-react";
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
import { useMemo, useState } from "react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import TemplatePreview from "@/components/Modals/WhatsappTemplates/Blocks/TemplatePreview";
import { useWhatsappConnection } from "@/lib/queries/whatsapp-connections";
import { TGetWhatsappConnectionsOutput } from "@/app/api/whatsapp-connections/route";
import { LoadingButton } from "@/components/loading-button";

type CommunicationTemplatesPageProps = {
	organizationName: string;
};

function getWhatsappConnectionPhones(whatsappConnections: TGetWhatsappConnectionsOutput["data"]) {
	return whatsappConnections.flatMap((connection) =>
		connection.telefones.map((phone) => ({
			phoneId: phone.id,
			phoneNumber: phone.numero,
			connectionId: connection.id,
			connectionType: connection.tipoConexao,
		})),
	);
}
type TGetWhatsappConnectionPhones = ReturnType<typeof getWhatsappConnectionPhones>;
export default function CommunicationTemplatesPage({ organizationName }: CommunicationTemplatesPageProps) {
	const { data: whatsappConnections } = useWhatsappConnection();
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
						templates.map((template) => <TemplateCard key={template.id} template={template} callbacks={{}} />)
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
	whatsappConnectionPhones: TGetWhatsappConnectionPhones;
	callbacks: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: () => void;
		onSettled?: () => void;
	};
	handleEditClick: () => void;
};

function TemplateCard({ template, whatsappConnectionPhones, callbacks, handleEditClick }: TemplateCardProps) {
	const [viewWhatsappTemplatePhoneId, setViewWhatsappTemplatePhoneId] = useState<string | null>(null);

	const statusClassName =
		template.status === "ATIVO"
			? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
			: template.status === "ARQUIVADO"
				? "bg-zinc-500/10 text-zinc-700 border-zinc-500/20"
				: "bg-amber-500/10 text-amber-700 border-amber-500/20";

	const byPhone = useMemo(
		() =>
			Object.entries(template.metadados?.porNumeroTelefone ?? {}).map(([phoneId, phoneData]) => {
				const phoneInfo = whatsappConnectionPhones.find((phone) => phone.phoneId === phoneId);
				return {
					id: phoneId,
					numero: phoneInfo?.phoneNumber ?? "NÃO ENCONTRADO",
					...phoneData,
				};
			}),
		[template.metadados?.porNumeroTelefone, whatsappConnectionPhones],
	);
	const byPhoneApprovedCount = useMemo(() => byPhone.filter((phone) => phone.status === "APROVADO").length, [byPhone]);

	const PhoneItemCard = useMemo(
		() =>
			({
				connectionPhone,
				handleCreateTemplatePhone,
				isCreatingWhatsappTemplatePhone,
				viewWhatsappTemplatePhone,
			}: {
				connectionPhone: Exclude<TGetWhatsappConnectionsOutput["data"], null>[number]["telefones"][number];
				handleCreateTemplatePhone: (id: string) => void;
				isCreatingWhatsappTemplatePhone: boolean;
				viewWhatsappTemplatePhone: string | null;
			}) => {
				const phoneTemplateData = byPhone.find((phone) => phone.id === connectionPhone.id);
				return (
					<div className="w-full flex items-center gap-2 justify-between">
						<div className="flex items-center gap-1.5">
							<Phone className="w-3 h-3 min-w-3 min-h-3" />
							<span className="text-xs font-medium text-foreground/80">{connectionPhone.nome}</span>
						</div>
						<div className="flex items-center gap-1.5">
							{phoneTemplateData ? (
								<div className="flex items-center gap-1.5">
									<div
										className={cn("px-2 py-0.5 rounded-lg text-[0.65rem] font-bold", {
											"bg-blue-500 text-white": phoneTemplateData.status === "APROVADO",
											"bg-primary/20 text-foreground": phoneTemplateData.status === "PENDENTE",
											"bg-red-500 text-white": phoneTemplateData.status === "REJEITADO",
											"bg-orange-500 text-white": phoneTemplateData.status === "PAUSADO",
											"bg-gray-500 text-white": phoneTemplateData.status === "DESABILITADO" || phoneTemplateData.status === "RASCUNHO",
										})}
									>
										{phoneTemplateData.status}
									</div>
									<div className="flex items-center gap-1">
										<CircleGauge className="w-4 h-4 min-w-4 min-h-4" />
										<p className="text-[0.65rem] font-medium text-foreground/80">{phoneTemplateData.qualidade}</p>
									</div>
									<Button
										variant="ghost"
										size="fit"
										className="flex items-center gap-1.5 text-[0.65rem] px-2 py-1 rounded-xl"
										onClick={() => setViewWhatsappTemplatePhoneId(phoneTemplateData.id)}
									>
										<Eye className="w-4 h-4 min-w-4 min-h-4" />
									</Button>
								</div>
							) : (
								<LoadingButton
									onClick={() => handleCreateTemplatePhone(connectionPhone.id)}
									variant="ghost"
									size="fit"
									className="flex items-center gap-1.5 text-[0.65rem] px-2 py-1 rounded-xl"
									loading={isCreatingWhatsappTemplatePhone}
								>
									ADICIONAR
								</LoadingButton>
							)}
						</div>
					</div>
				);
			},
		[whatsappTemplate.telefones, whatsappConnectionPhones],
	);
	return (
		<div className={cn("bg-card border-border flex w-full flex-col gap-1 rounded-xl border px-3 py-4 shadow-2xs")}>
			<div className="w-full flex flex-col gap-2">
				<div className="w-full flex items-center justify-between gap-2">
					<div className="flex flex-wrap items-center gap-2">
						<span className={"text-sm leading-none font-bold tracking-tight font-mono"}>TEMPLATE</span>
						<p className="text-xs px-2 py-1 rounded-lg bg-primary/10">{template.nome}</p>
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
								<TemplatePreview content={template.conteudo} />
							</HoverCardContent>
						</HoverCard>
						<HoverCard>
							<HoverCardTrigger asChild>
								<div className="flex items-center gap-2">
									{byPhone.length > 0 ? (
										<div className="flex items-center gap-1 text-xs text-muted-foreground">
											<Phone className="w-3 h-3" />
											<span>
												{byPhoneApprovedCount}/{byPhone.length}
											</span>
										</div>
									) : null}

									<div
										className={cn("px-2 py-0.5 rounded-lg text-[0.65rem] font-bold", {
											"bg-blue-500 text-white": template.statusGeral === "APROVADO",
											"bg-primary/20 text-foreground": template.statusGeral === "PENDENTE",
											"bg-red-500 text-white": template.statusGeral === "REJEITADO",
											"bg-orange-500 text-white": template.statusGeral === "PAUSADO",
											"bg-gray-500 text-white": template.statusGeral === "DESABILITADO" || template.statusGeral === "RASCUNHO",
										})}
									>
										{template.statusGeral}
									</div>
								</div>
							</HoverCardTrigger>
							<HoverCardContent className="flex flex-col gap-3 w-72 p-3">
								<h3 className="text-xs font-medium tracking-tight">TELEFONES CONECTADOS</h3>
								<div className="w-full flex flex-col gap-2">
									{whatsappConnectionPhones.map((telefone) => (
										<PhoneItemCard
											key={telefone.phoneId}
											connectionPhone={{
												id: telefone.phoneId,
												nome: telefone.phoneNumber,
												conexaoId: telefone.connectionId,
												whatsappBusinessAccountId: null,
												whatsappTelefoneId: null,
												numero: telefone.phoneNumber,
											}}
											handleCreateTemplatePhone={(phoneId) => {
												console.log(phoneId);
											}}
											isCreatingWhatsappTemplatePhone={false}
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
						<p className="text-xs font-medium text-foreground/80">{template.categoria}</p>
					</div>
					<div className="flex items-center gap-1">
						<CircleGauge className="w-4 h-4 min-w-4 min-h-4" />
						<p className="text-xs font-medium text-foreground/80">{template.qualidadeGeral}</p>
					</div>
				</div>
			</div>
			<div className="w-full flex items-center justify-between gap-2">
				<div className="flex items-center gap-1">
					<BsCalendarPlus className="w-4 h-4 min-w-4 min-h-4" />
					<p className="text-xs font-medium text-foreground/80">{formatDateAsLocale(template.dataInsercao, true)}</p>
				</div>
				{/** GENERAL TEMPLATES ARE NOT EDITABLE (THOSE WITHOUT ORGANIZATION ID) */}
				{template.organizacaoId ? (
					<Button variant="ghost" className="flex items-center gap-1.5" size="sm" onClick={handleEditClick}>
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
