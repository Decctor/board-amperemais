"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { CircleGauge, Diamond, Eye, Pencil, Phone, Plus, RefreshCw, Send } from "lucide-react";
import { useMessageTemplates } from "@/lib/queries/message-templates";
import GeneralPaginationComponent from "@/components/Utils/Pagination";
import ErrorComponent from "@/components/Layouts/ErrorComponent";
import { TGetMessageTemplatesOutputDefault } from "@/app/api/message-templates/route";
import { getErrorMessage } from "@/lib/errors";
import { formatDateAsLocale } from "@/lib/formatting";
import { BsCalendarPlus } from "react-icons/bs";
import { TemplatePhoneHoverItem } from "@/components/MessageTemplates/TemplatePhoneHoverItem";
import { useMemo, useState } from "react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import TemplatePreview from "@/components/MessageTemplates/TemplatePreview";
import { useWhatsappConnections } from "@/lib/queries/whatsapp-connections";
import { TGetWhatsappConnectionsOutput } from "@/app/api/whatsapp-connections/route";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import TestMessageTemplate from "@/components/Modals/MessageTemplates/TestMessageTemplate";
import { ViewMessageTemplatePhone } from "@/components/Modals/MessageTemplates/ViewMessageTemplatePhone";
import { LoadingButton } from "@/components/loading-button";
import { createMessageTemplatePhone, syncMessageTemplates } from "@/lib/mutations/message-templates";
import { toast } from "sonner";
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
export default function CommunicationTemplatesPage({ organizationName: _organizationName }: CommunicationTemplatesPageProps) {
	const queryClient = useQueryClient();

	const { data: whatsappConnections } = useWhatsappConnections();
	const {
		data: templatesResult,
		isLoading,
		isSuccess,
		isError,
		error,
		params,
		queryKey,
		updateParams,
	} = useMessageTemplates({ initialParams: { search: "", page: 1 } });
	const templates = templatesResult?.messageTemplates ?? [];
	const templatesMatched = templatesResult?.messageTemplatesMatched ?? 0;
	const totalPages = templatesResult?.totalPages ?? 0;

	const whatsappConnectionPhones = useMemo(() => getWhatsappConnectionPhones(whatsappConnections ?? []), [whatsappConnections]);
	const hasMetaCloudApiConnection = useMemo(
		() => (whatsappConnections ?? []).some((connection) => connection.tipoConexao === "META_CLOUD_API"),
		[whatsappConnections],
	);
	const handleOnMutate = async () => await queryClient.cancelQueries({ queryKey });
	const handleOnSettled = async () => await queryClient.invalidateQueries({ queryKey });
	const { mutate: syncTemplatesMutation, isPending: isSyncingTemplates } = useMutation({
		mutationKey: ["sync-message-templates"],
		mutationFn: syncMessageTemplates,
		onMutate: handleOnMutate,
		onSuccess: (response) => toast.success(response.message),
		onError: (error) => toast.error(getErrorMessage(error)),
		onSettled: handleOnSettled,
	});
	return (
		<div className="w-full h-full flex flex-col gap-3">
			<div className="w-full flex flex-col gap-3">
				<div className="w-full flex items-center justify-end gap-2">
					{hasMetaCloudApiConnection ? (
						<LoadingButton
							size="sm"
							variant="secondary"
							className="flex items-center gap-2"
							onClick={() => syncTemplatesMutation({})}
							loading={isSyncingTemplates}
							disabled={isSyncingTemplates}
						>
							<RefreshCw className="w-4 h-4 min-w-4 min-h-4" />
							SINCRONIZAR TEMPLATES
						</LoadingButton>
					) : null}
					<Button size="sm" asChild>
						<Link href="/dashboard/communication/builder" className="flex items-center gap-2">
							<Plus className="w-4 h-4 min-w-4 min-h-4" />
							NOVO TEMPLATE
						</Link>
					</Button>
				</div>
				<div className="w-full flex items-center gap-2 flex-col-reverse lg:flex-row">
					<Input
						value={params.search ?? ""}
						placeholder="Pesquisar template..."
						onChange={(e) => updateParams({ search: e.target.value })}
						className="grow rounded-xl"
					/>
				</div>

				<GeneralPaginationComponent
					activePage={params.page ?? 1}
					queryLoading={isLoading}
					selectPage={(page) => updateParams({ page })}
					totalPages={totalPages ?? 0}
					itemsMatchedText={`${templatesMatched} ${templatesMatched === 1 ? "template encontrado." : "templates encontrados."}`}
					itemsShowingText={`${templates.length} ${templates.length === 1 ? "template exibido." : "templates exibidos."}`}
				/>
			</div>
			{isLoading ? <p className="w-full flex items-center justify-center animate-pulse">Carregando templates...</p> : null}
			{isError ? <ErrorComponent msg={getErrorMessage(error)} /> : null}
			{isSuccess ? (
				<div className="w-full flex flex-col gap-1.5">
					{templates.length > 0 ? (
						templates.map((template) => (
							<TemplateCard
								key={template.id}
								template={template}
								callbacks={{ onMutate: handleOnMutate, onSettled: handleOnSettled }}
								whatsappConnectionPhones={whatsappConnectionPhones}
							/>
						))
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
};

function TemplateCard({ template, whatsappConnectionPhones, callbacks }: TemplateCardProps) {
	const [testingTemplate, setTestingTemplate] = useState(false);
	const [pendingPhoneId, setPendingPhoneId] = useState<string | null>(null);
	const [viewPhoneTelefoneId, setViewPhoneTelefoneId] = useState<string | null>(null);
	const { mutate: createPhoneMutation } = useMutation({
		mutationKey: ["create-message-template-phone", template.id],
		mutationFn: createMessageTemplatePhone,
		onMutate: (input) => {
			setPendingPhoneId(input.telefoneId);
			callbacks.onMutate?.();
		},
		onSuccess: (response) => toast.success(response.message),
		onError: (error) => toast.error(getErrorMessage(error)),
		onSettled: () => {
			setPendingPhoneId(null);
			callbacks.onSettled?.();
		},
	});

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
							<HoverCardContent className="flex w-80 flex-col gap-2.5 p-3">
								<div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
									<h3 className="text-xs font-medium tracking-tight">TELEFONES CONECTADOS</h3>
									<span className="text-[0.65rem] text-muted-foreground">
										{byPhoneApprovedCount}/{whatsappConnectionPhones.length} aprovados
									</span>
								</div>
								<div className="flex max-h-[min(50vh,280px)] w-full flex-col gap-2 overflow-y-auto scrollbar-thin scrollbar-track-primary/10 scrollbar-thumb-primary/30">
									{whatsappConnectionPhones.map((telefone) => {
										const phoneTemplateData = byPhone.find((phone) => phone.id === telefone.phoneId);
										return (
											<TemplatePhoneHoverItem
												key={telefone.phoneId}
												phoneLabel={telefone.phoneNumber}
												templatePhone={
													phoneTemplateData
														? {
																id: phoneTemplateData.id,
																status: phoneTemplateData.status,
																qualidade: phoneTemplateData.qualidade,
															}
														: null
												}
												onAdd={() => {
													createPhoneMutation({ messageTemplateId: template.id, telefoneId: telefone.phoneId });
												}}
												onView={setViewPhoneTelefoneId}
												isAdding={pendingPhoneId === telefone.phoneId}
											/>
										);
									})}
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
					<div className="flex items-center gap-1">
						<Button variant="ghost" className="flex items-center gap-1.5" size="sm" onClick={() => setTestingTemplate(true)}>
							<Send className="w-3 min-w-3 h-3 min-h-3" />
							TESTAR
						</Button>
						<Button variant="ghost" className="flex items-center gap-1.5" size="sm" asChild>
							<Link href={`/dashboard/communication/builder?templateId=${template.id}`}>
								<Pencil className="w-3 min-w-3 h-3 min-h-3" />
								EDITAR
							</Link>
						</Button>
					</div>
				) : null}
			</div>
			{viewPhoneTelefoneId ? (
				<ViewMessageTemplatePhone
					messageTemplateId={template.id}
					telefoneId={viewPhoneTelefoneId}
					closeMenu={() => setViewPhoneTelefoneId(null)}
					callbacks={callbacks}
				/>
			) : null}
			{testingTemplate ? <TestMessageTemplate template={template} closeModal={() => setTestingTemplate(false)} callbacks={callbacks} /> : null}
		</div>
	);
}
