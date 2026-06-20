import NumberInput from "@/components/Inputs/NumberInput";
import SelectInput from "@/components/Inputs/SelectInput";
import TextInput from "@/components/Inputs/TextInput";
import TextareaInput from "@/components/Inputs/TextareaInput";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { Switch } from "@/components/ui/switch";
import { formatAsSlug } from "@/lib/formatting";
import type { TCommunityContentStatusEnum, TCommunityMaterialTypeEnum } from "@/schemas/enums";
import type { TUseInternalCommunityMaterialState } from "@/state-hooks/use-internal-community-material-state";
import { FileText, Globe2 } from "lucide-react";

const MaterialTypeOptions: { id: number; value: TCommunityMaterialTypeEnum; label: string }[] = [
	{ id: 1, value: "EBOOK", label: "EBOOK" },
	{ id: 2, value: "PLAYBOOK", label: "PLAYBOOK" },
	{ id: 3, value: "PLANILHA", label: "PLANILHA" },
	{ id: 4, value: "TEMPLATE", label: "TEMPLATE" },
	{ id: 5, value: "GUIA", label: "GUIA" },
	{ id: 6, value: "CHECKLIST", label: "CHECKLIST" },
	{ id: 7, value: "INFOGRAFICO", label: "INFOGRAFICO" },
	{ id: 8, value: "DOCUMENTO", label: "DOCUMENTO" },
];

const MaterialStatusOptions: { id: number; value: TCommunityContentStatusEnum; label: string }[] = [
	{ id: 1, value: "RASCUNHO", label: "RASCUNHO" },
	{ id: 2, value: "PUBLICADO", label: "PUBLICADO" },
	{ id: 3, value: "ARQUIVADO", label: "ARQUIVADO" },
];

type MaterialGeneralBlockProps = {
	communityMaterial: TUseInternalCommunityMaterialState["state"]["communityMaterial"];
	updateCommunityMaterial: TUseInternalCommunityMaterialState["updateCommunityMaterial"];
};

function slugifyMaterialTitle(value: string) {
	return value
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function splitLines(value?: string[]) {
	return value?.join("\n") ?? "";
}

function parseLines(value: string) {
	return value
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.length > 0);
}

export default function MaterialGeneralBlock({ communityMaterial, updateCommunityMaterial }: MaterialGeneralBlockProps) {
	const publicMetadata = communityMaterial.publicMetadata ?? {};
	const emailWall = publicMetadata.emailWall ?? { ativo: false };
	const landing = publicMetadata.landing ?? {};
	const seo = publicMetadata.seo ?? {};

	function updatePublicMetadata(changes: NonNullable<typeof communityMaterial.publicMetadata>) {
		updateCommunityMaterial({
			publicMetadata: {
				...publicMetadata,
				...changes,
			},
		});
	}

	return (
		<>
			<ResponsiveMenuSection title="INFORMACOES GERAIS" icon={<FileText className="h-4 min-h-4 w-4 min-w-4" />}>
				<TextInput
					label="TITULO"
					placeholder="Preencha aqui o titulo do material..."
					value={communityMaterial.titulo}
					handleChange={(value) =>
						updateCommunityMaterial({
							titulo: value,
							slug: communityMaterial.slug ? communityMaterial.slug : formatAsSlug(value),
						})
					}
				/>
				<TextareaInput
					label="DESCRICAO (OPCIONAL)"
					placeholder="Preencha aqui uma breve descricao do material..."
					value={communityMaterial.descricao ?? ""}
					handleChange={(value) => updateCommunityMaterial({ descricao: value })}
				/>
				<TextareaInput
					label="RESUMO (OPCIONAL)"
					placeholder="Preencha aqui um resumo do material..."
					value={communityMaterial.resumo ?? ""}
					handleChange={(value) => updateCommunityMaterial({ resumo: value })}
				/>
				<div className="grid grid-cols-1 gap-2 md:grid-cols-2">
					<SelectInput
						label="TIPO DO MATERIAL"
						value={communityMaterial.tipo}
						resetOptionLabel="SELECIONE O TIPO"
						handleChange={(value) => updateCommunityMaterial({ tipo: value as TCommunityMaterialTypeEnum })}
						width="100%"
						options={MaterialTypeOptions}
						onReset={() => updateCommunityMaterial({ tipo: "EBOOK" })}
					/>
					<SelectInput
						label="STATUS"
						value={communityMaterial.status}
						resetOptionLabel="SELECIONE O STATUS"
						handleChange={(value) => updateCommunityMaterial({ status: value as TCommunityContentStatusEnum })}
						width="100%"
						options={MaterialStatusOptions}
						onReset={() => updateCommunityMaterial({ status: "RASCUNHO" })}
					/>
				</div>
				<NumberInput label="ORDEM" placeholder="0" value={communityMaterial.ordem} handleChange={(value) => updateCommunityMaterial({ ordem: value })} />
			</ResponsiveMenuSection>

			<ResponsiveMenuSection title="PAGINA PUBLICA" icon={<Globe2 className="h-4 min-h-4 w-4 min-w-4" />}>
				<TextInput
					label="SLUG"
					placeholder="ex: checklist-campanhas-varejo"
					value={communityMaterial.slug ?? ""}
					handleChange={(value) => updateCommunityMaterial({ slug: slugifyMaterialTitle(value) })}
				/>
				<div className="flex items-center justify-between gap-3 rounded-md border border-border bg-primary/5 p-3">
					<div className="flex flex-col gap-1">
						<p className="text-sm font-medium tracking-tight">Email-wall ativa</p>
						<p className="text-xs text-muted-foreground">Exige email antes de liberar o link do arquivo.</p>
					</div>
					<Switch
						checked={!!emailWall.ativo}
						onCheckedChange={(ativo) =>
							updatePublicMetadata({
								emailWall: {
									...emailWall,
									ativo,
								},
							})
						}
					/>
				</div>
				<TextInput
					label="HEADLINE (OPCIONAL)"
					placeholder="Use um titulo comercial para a pagina..."
					value={landing.headline ?? ""}
					handleChange={(headline) => updatePublicMetadata({ landing: { ...landing, headline } })}
				/>
				<TextareaInput
					label="SUBHEADLINE (OPCIONAL)"
					placeholder="Explique o ganho pratico do material..."
					value={landing.subheadline ?? ""}
					handleChange={(subheadline) => updatePublicMetadata({ landing: { ...landing, subheadline } })}
				/>
				<TextareaInput
					label="BENEFICIOS (UM POR LINHA)"
					placeholder={"Identificar oportunidades de recompra\nCriar campanhas mais consistentes\nEvitar ofertas genericas"}
					value={splitLines(landing.beneficios)}
					handleChange={(value) => updatePublicMetadata({ landing: { ...landing, beneficios: parseLines(value) } })}
				/>
				<div className="grid grid-cols-1 gap-2 md:grid-cols-2">
					<TextInput
						label="SEO TITLE (OPCIONAL)"
						placeholder="Titulo para buscadores..."
						value={seo.title ?? ""}
						handleChange={(title) => updatePublicMetadata({ seo: { ...seo, title } })}
					/>
					<TextInput
						label="SEO DESCRIPTION (OPCIONAL)"
						placeholder="Descricao para buscadores..."
						value={seo.description ?? ""}
						handleChange={(description) => updatePublicMetadata({ seo: { ...seo, description } })}
					/>
				</div>
			</ResponsiveMenuSection>
		</>
	);
}
