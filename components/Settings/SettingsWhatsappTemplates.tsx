import type { TGetWhatsappTemplatesOutputDefault } from "@/app/api/whatsapp-templates/route";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { getErrorMessage } from "@/lib/errors";
import { syncWhatsappTemplates } from "@/lib/mutations/whatsapp-templates";
import { useWhatsappTemplates } from "@/lib/queries/whatsapp-templates";
import { cn } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CircleGauge, Diamond, Phone, Plus, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import ErrorComponent from "../Layouts/ErrorComponent";
import LoadingComponent from "../Layouts/LoadingComponent";
import NewWhatsappTemplate from "../Modals/WhatsappTemplates/NewWhatsappTemplate";
import GeneralPaginationComponent from "../Utils/Pagination";
import { Button } from "../ui/button";

type SettingsWhatsappTemplatesProps = {
	user: TAuthUserSession["user"];
};
export default function SettingsWhatsappTemplates({ user }: SettingsWhatsappTemplatesProps) {
	const queryClient = useQueryClient();
	const [newWhatsappTemplateModalIsOpen, setNewWhatsappTemplateModalIsOpen] = useState(false);

	const {
		data: whatsappTemplatesResult,
		queryKey,
		isLoading,
		isError,
		isSuccess,
		error,
		params,
		updateParams,
	} = useWhatsappTemplates({ initialParams: { search: "" } });
	const whatsappTemplates = whatsappTemplatesResult?.whatsappTemplates;
	const whatsappTemplatesShowing = whatsappTemplates ? whatsappTemplates.length : 0;
	const whatsappTemplatesMatched = whatsappTemplatesResult?.whatsappTemplatesMatched || 0;
	const totalPages = whatsappTemplatesResult?.totalPages || 0;

	const handleOnMutate = async () => await queryClient.cancelQueries({ queryKey });
	const handleOnSettled = async () => await queryClient.invalidateQueries({ queryKey });

	const { mutate: handleSyncMutation, isPending: isSyncingMutation } = useMutation({
		mutationFn: syncWhatsappTemplates,
		onMutate: handleOnMutate,
		onSuccess: (data) => {
			toast.success(data.message, {
				description: `${data.data.summary.totalCreated} templates criados, ${data.data.summary.totalUpdated} atualizados`,
			});
		},
		onError: (error) => {
			toast.error("Erro ao sincronizar templates", {
				description: getErrorMessage(error),
			});
		},
		onSettled: handleOnSettled,
	});

	return (
		<div className="w-full h-full flex flex-col gap-3">
			<div className="w-full flex items-center justify-end gap-2">
				<Button
					size="sm"
					variant="outline"
					className="flex items-center gap-2"
					onClick={() => handleSyncMutation({})}
					disabled={isSyncingMutation || isLoading}
				>
					<RefreshCw className={cn("w-4 h-4 min-w-4 min-h-4", isSyncingMutation && "animate-spin")} />
					{isSyncingMutation ? "SINCRONIZANDO..." : "SINCRONIZAR"}
				</Button>
				<Button size="sm" className="flex items-center gap-2" onClick={() => setNewWhatsappTemplateModalIsOpen(true)}>
					<Plus className="w-4 h-4 min-w-4 min-h-4" />
					NOVO TEMPLATE
				</Button>
			</div>
			<GeneralPaginationComponent
				activePage={params.page}
				queryLoading={isLoading}
				selectPage={(page) => updateParams({ page })}
				totalPages={totalPages || 0}
				itemsMatchedText={
					whatsappTemplatesMatched > 0 ? `${whatsappTemplatesMatched} templates encontrados.` : `${whatsappTemplatesMatched} template encontrado.`
				}
				itemsShowingText={
					whatsappTemplatesShowing > 0 ? `Mostrando ${whatsappTemplatesShowing} templates.` : `Mostrando ${whatsappTemplatesShowing} template.`
				}
			/>
			<div className="w-full flex flex-col gap-1.5">
				{isLoading ? <LoadingComponent /> : null}
				{isError ? <ErrorComponent msg={getErrorMessage(error)} /> : null}
				{isSuccess && whatsappTemplates ? (
					whatsappTemplates.length > 0 ? (
						whatsappTemplates.map((whatsappTemplate, index: number) => (
							<WhatsappTemplateCard key={whatsappTemplate.id} whatsappTemplate={whatsappTemplate} />
						))
					) : (
						<p className="w-full tracking-tight text-center">Nenhum template encontrado.</p>
					)
				) : null}
			</div>
			{newWhatsappTemplateModalIsOpen ? (
				<NewWhatsappTemplate
					user={user}
					closeMenu={() => setNewWhatsappTemplateModalIsOpen(false)}
					callbacks={{ onMutate: handleOnMutate, onSettled: handleOnSettled }}
				/>
			) : null}
		</div>
	);
}

type WhatsappTemplateCardProps = {
	whatsappTemplate: TGetWhatsappTemplatesOutputDefault["whatsappTemplates"][number];
};
function WhatsappTemplateCard({ whatsappTemplate }: WhatsappTemplateCardProps) {
	return (
		<div className={cn("bg-card border-primary/20 flex w-full flex-col gap-1 rounded-xl border px-3 py-4 shadow-2xs")}>
			<div className="w-full flex flex-col gap-2">
				<div className="w-full flex items-center justify-between gap-2">
					<div className="flex flex-wrap items-center gap-2">
						<span className={"text-sm leading-none font-bold tracking-tight font-mono"}>TEMPLATE</span>
						<p className="text-xs px-2 py-1 rounded-lg bg-primary/10">{whatsappTemplate.nome}</p>
					</div>
					<div className="flex items-center gap-2">
						{whatsappTemplate.telefonesTotal > 0 && (
							<div className="flex items-center gap-1 text-xs text-muted-foreground">
								<Phone className="w-3 h-3" />
								<span>
									{whatsappTemplate.telefonesAprovados}/{whatsappTemplate.telefonesTotal}
								</span>
							</div>
						)}
						<div
							className={cn("px-2 py-0.5 rounded-lg text-[0.65rem] font-bold", {
								"bg-blue-500 text-white": whatsappTemplate.statusGeral === "APROVADO",
								"bg-primary/20 text-primary": whatsappTemplate.statusGeral === "PENDENTE",
								"bg-red-500 text-white": whatsappTemplate.statusGeral === "REJEITADO",
								"bg-orange-500 text-white": whatsappTemplate.statusGeral === "PAUSADO",
								"bg-gray-500 text-white": whatsappTemplate.statusGeral === "DESABILITADO" || whatsappTemplate.statusGeral === "RASCUNHO",
							})}
						>
							{whatsappTemplate.statusGeral}
						</div>
					</div>
				</div>

				<div className="flex flex-wrap items-center gap-2">
					<div className="flex items-center gap-1">
						<Diamond className="w-4 h-4 min-w-4 min-h-4" />
						<p className="text-xs font-medium text-primary/80">{whatsappTemplate.categoria}</p>
					</div>
					<div className="flex items-center gap-1">
						<CircleGauge className="w-4 h-4 min-w-4 min-h-4" />
						<p className="text-xs font-medium text-primary/80">{whatsappTemplate.qualidadeGeral}</p>
					</div>
				</div>
			</div>
		</div>
	);
}
