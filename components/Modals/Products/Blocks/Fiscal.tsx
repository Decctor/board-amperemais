import CheckboxInput from "@/components/Inputs/CheckboxInput";
import SelectInput from "@/components/Inputs/SelectInput";
import TextInput from "@/components/Inputs/TextInput";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isValidNumber } from "@/lib/validation";
import type { TFiscalProductOriginEnum } from "@/schemas/enums";
import type { TUseProductState } from "@/state-hooks/use-product-state";
import { ProductFiscalProfileOriginOptions, UnitsOfMeasurementOptions } from "@/utils/select-options";
import { BookText, FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

function emptyProductFiscalProfile(): TUseProductState["state"]["productFiscalProfiles"][number] {
	return {
		origemMercadoria: "NACIONAL",
		ncm: "",
		cest: null,
		cfopPadrao: null,
		unidadeComercial: "UN",
		codigoBeneficioFiscal: null,
		ativo: true,
		dataInsercao: new Date(),
	};
}

type ProductFiscalBlockProps = {
	userHasFiscalViewPermission: boolean;
	userHasFiscalConfigurePermission: boolean;
	productFiscalProfiles: TUseProductState["state"]["productFiscalProfiles"];
	addProductFiscalProfile: TUseProductState["addProductFiscalProfile"];
	updateProductFiscalProfile: TUseProductState["updateProductFiscalProfile"];
	removeProductFiscalProfile: TUseProductState["removeProductFiscalProfile"];
};

export default function ProductFiscalBlock({
	userHasFiscalViewPermission,
	userHasFiscalConfigurePermission,
	productFiscalProfiles,
	addProductFiscalProfile,
	updateProductFiscalProfile,
	removeProductFiscalProfile,
}: ProductFiscalBlockProps) {
	if (!userHasFiscalViewPermission) return null;
	const [newFiscalProfileMenuIsOpen, setNewFiscalProfileMenuIsOpen] = useState(false);
	const [editFiscalProfileIndex, setEditFiscalProfileIndex] = useState<number | null>(null);
	const validFiscalProfiles = productFiscalProfiles
		.map((profile, index) => ({ ...profile, originalIndex: index }))
		.filter((profile) => !profile.deletar);
	const editingFiscalProfile = isValidNumber(editFiscalProfileIndex) ? productFiscalProfiles[editFiscalProfileIndex as number] : null;
	return (
		<ResponsiveMenuSection title="CONFIGURAÇÃO FISCAL" icon={<BookText className="h-4 min-h-4 w-4 min-w-4" />}>
			<div className="flex w-full items-center justify-end gap-2">
				{userHasFiscalConfigurePermission ? (
					<Button
						onClick={() => setNewFiscalProfileMenuIsOpen((prev) => !prev)}
						size="fit"
						variant="ghost"
						className="flex items-center gap-1 px-2 py-1 text-xs"
					>
						<Plus className="w-4 h-4 min-w-4 min-h-4" />
						ADICIONAR PERFIL FISCAL
					</Button>
				) : null}
			</div>
			{validFiscalProfiles.length > 0 ? (
				validFiscalProfiles.map((profile) => (
					<ProductFiscalProfileCard
						key={profile.id || `temp-profile-${profile.originalIndex}`}
						profile={profile}
						userHasFiscalConfigurePermission={userHasFiscalConfigurePermission}
						handleEditClick={() => setEditFiscalProfileIndex(profile.originalIndex)}
						handleDeleteClick={() => removeProductFiscalProfile(profile.originalIndex)}
					/>
				))
			) : (
				<div className="w-full text-center text-sm font-medium tracking-tight text-muted-foreground">Nenhum perfil fiscal adicionado.</div>
			)}
			{newFiscalProfileMenuIsOpen ? (
				<NewProductFiscalProfileMenu
					closeMenu={() => setNewFiscalProfileMenuIsOpen(false)}
					addProductFiscalProfile={(p) => {
						addProductFiscalProfile(p);
						setNewFiscalProfileMenuIsOpen(false);
					}}
				/>
			) : null}
			{editingFiscalProfile ? (
				<EditProductFiscalProfileMenu
					initialProfile={editingFiscalProfile}
					closeMenu={() => setEditFiscalProfileIndex(null)}
					updateProductFiscalProfile={(p) => {
						updateProductFiscalProfile(editFiscalProfileIndex as number, p);
						setEditFiscalProfileIndex(null);
					}}
				/>
			) : null}
		</ResponsiveMenuSection>
	);
}

type NewProductFiscalProfileMenuProps = {
	closeMenu: () => void;
	addProductFiscalProfile: TUseProductState["addProductFiscalProfile"];
};

function NewProductFiscalProfileMenu({ closeMenu, addProductFiscalProfile }: NewProductFiscalProfileMenuProps) {
	const [profileHolder, setProfileHolder] = useState<TUseProductState["state"]["productFiscalProfiles"][number]>(emptyProductFiscalProfile());

	function updateProfileHolder(updates: Partial<TUseProductState["state"]["productFiscalProfiles"][number]>) {
		setProfileHolder((prev) => ({
			...prev,
			...updates,
		}));
	}

	function validateAndAddProfile(info: TUseProductState["state"]["productFiscalProfiles"][number]) {
		if (!info.ncm?.trim()) return toast.error("NCM não informado.");
		return addProductFiscalProfile(info);
	}

	return (
		<ResponsiveMenu
			menuTitle="NOVO PERFIL FISCAL"
			menuDescription="Preencha os campos abaixo para adicionar um perfil fiscal ao produto"
			menuActionButtonText="ADICIONAR PERFIL"
			menuCancelButtonText="CANCELAR"
			closeMenu={closeMenu}
			actionFunction={() => validateAndAddProfile(profileHolder)}
			actionIsLoading={false}
			stateIsLoading={false}
			stateError={null}
		>
			<SelectInput
				label="ORIGEM DA MERCADORIA"
				value={profileHolder.origemMercadoria}
				options={ProductFiscalProfileOriginOptions}
				resetOptionLabel="SELECIONE A ORIGEM"
				handleChange={(value) => updateProfileHolder({ origemMercadoria: value as TFiscalProductOriginEnum })}
				onReset={() => updateProfileHolder({ origemMercadoria: "NACIONAL" })}
				width="100%"
			/>
			<TextInput label="NCM" placeholder="Ex.: 12345678" value={profileHolder.ncm} handleChange={(value) => updateProfileHolder({ ncm: value })} />
			<TextInput
				label="CEST"
				placeholder="Opcional"
				value={profileHolder.cest ?? ""}
				handleChange={(value) => updateProfileHolder({ cest: value.trim() === "" ? null : value })}
			/>
			<TextInput
				label="CFOP PADRÃO"
				placeholder="Opcional — ex.: 5102"
				value={profileHolder.cfopPadrao ?? ""}
				handleChange={(value) => updateProfileHolder({ cfopPadrao: value.trim() === "" ? null : value })}
			/>
			<SelectInput
				label="UNIDADE COMERCIAL"
				value={profileHolder.unidadeComercial}
				options={UnitsOfMeasurementOptions}
				resetOptionLabel="SELECIONE A UNIDADE"
				handleChange={(value) => updateProfileHolder({ unidadeComercial: value as string })}
				onReset={() => updateProfileHolder({ unidadeComercial: "UN" })}
				width="100%"
			/>
			<TextInput
				label="CÓDIGO DE BENEFÍCIO FISCAL"
				placeholder="Opcional"
				value={profileHolder.codigoBeneficioFiscal ?? ""}
				handleChange={(value) => updateProfileHolder({ codigoBeneficioFiscal: value.trim() === "" ? null : value })}
			/>
			<div className="flex w-full items-center justify-center">
				<CheckboxInput
					checked={profileHolder.ativo}
					labelTrue="PERFIL ATIVO"
					labelFalse="PERFIL INATIVO"
					handleChange={(value) => updateProfileHolder({ ativo: value })}
					justify="justify-center"
				/>
			</div>
		</ResponsiveMenu>
	);
}

type EditProductFiscalProfileMenuProps = {
	initialProfile: TUseProductState["state"]["productFiscalProfiles"][number];
	closeMenu: () => void;
	updateProductFiscalProfile: (info: Partial<Omit<TUseProductState["state"]["productFiscalProfiles"][number], "id">>) => void;
};

function EditProductFiscalProfileMenu({ initialProfile, closeMenu, updateProductFiscalProfile }: EditProductFiscalProfileMenuProps) {
	const [profileHolder, setProfileHolder] = useState<TUseProductState["state"]["productFiscalProfiles"][number]>(initialProfile);

	function updateProfileHolder(updates: Partial<TUseProductState["state"]["productFiscalProfiles"][number]>) {
		setProfileHolder((prev) => ({
			...prev,
			...updates,
		}));
	}

	function validateAndUpdateProfile(info: TUseProductState["state"]["productFiscalProfiles"][number]) {
		if (!info.ncm?.trim()) return toast.error("NCM não informado.");
		const { id: _id, ...rest } = info;
		return updateProductFiscalProfile(rest);
	}

	return (
		<ResponsiveMenu
			menuTitle="EDITAR PERFIL FISCAL"
			menuDescription="Preencha os campos abaixo para editar o perfil fiscal"
			menuActionButtonText="ATUALIZAR PERFIL"
			menuCancelButtonText="CANCELAR"
			closeMenu={closeMenu}
			actionFunction={() => validateAndUpdateProfile(profileHolder)}
			actionIsLoading={false}
			stateIsLoading={false}
			stateError={null}
		>
			<SelectInput
				label="ORIGEM DA MERCADORIA"
				value={profileHolder.origemMercadoria}
				options={ProductFiscalProfileOriginOptions}
				resetOptionLabel="SELECIONE A ORIGEM"
				handleChange={(value) => updateProfileHolder({ origemMercadoria: value as TFiscalProductOriginEnum })}
				onReset={() => updateProfileHolder({ origemMercadoria: "NACIONAL" })}
				width="100%"
			/>
			<TextInput label="NCM" placeholder="Ex.: 12345678" value={profileHolder.ncm} handleChange={(value) => updateProfileHolder({ ncm: value })} />
			<TextInput
				label="CEST"
				placeholder="Opcional"
				value={profileHolder.cest ?? ""}
				handleChange={(value) => updateProfileHolder({ cest: value.trim() === "" ? null : value })}
			/>
			<TextInput
				label="CFOP PADRÃO"
				placeholder="Opcional — ex.: 5102"
				value={profileHolder.cfopPadrao ?? ""}
				handleChange={(value) => updateProfileHolder({ cfopPadrao: value.trim() === "" ? null : value })}
			/>
			<SelectInput
				label="UNIDADE COMERCIAL"
				value={profileHolder.unidadeComercial}
				options={UnitsOfMeasurementOptions}
				resetOptionLabel="SELECIONE A UNIDADE"
				handleChange={(value) => updateProfileHolder({ unidadeComercial: value as string })}
				onReset={() => updateProfileHolder({ unidadeComercial: "UN" })}
				width="100%"
			/>
			<TextInput
				label="CÓDIGO DE BENEFÍCIO FISCAL"
				placeholder="Opcional"
				value={profileHolder.codigoBeneficioFiscal ?? ""}
				handleChange={(value) => updateProfileHolder({ codigoBeneficioFiscal: value.trim() === "" ? null : value })}
			/>
			<div className="flex w-full items-center justify-center">
				<CheckboxInput
					checked={profileHolder.ativo}
					labelTrue="PERFIL ATIVO"
					labelFalse="PERFIL INATIVO"
					handleChange={(value) => updateProfileHolder({ ativo: value })}
					justify="justify-center"
				/>
			</div>
		</ResponsiveMenu>
	);
}

type ProductFiscalProfileCardProps = {
	profile: TUseProductState["state"]["productFiscalProfiles"][number];
	userHasFiscalConfigurePermission: boolean;
	handleEditClick: () => void;
	handleDeleteClick: () => void;
};

function ProductFiscalProfileCard({ profile, userHasFiscalConfigurePermission, handleEditClick, handleDeleteClick }: ProductFiscalProfileCardProps) {
	const origemLabel = ProductFiscalProfileOriginOptions.find((o) => o.value === profile.origemMercadoria)?.label ?? profile.origemMercadoria;
	return (
		<div className={cn("bg-card border-primary/20 flex w-full flex-col sm:flex-row gap-2 rounded-xl border px-1.5 py-2 shadow-2xs")}>
			<div className="flex items-center justify-center">
				<div className="bg-primary/15 text-primary flex h-10 min-h-10 w-10 min-w-10 items-center justify-center overflow-hidden rounded-lg">
					<FileText className="h-5 w-5" />
				</div>
			</div>
			<div className="flex grow flex-col gap-1">
				<div className="flex w-full flex-col items-start justify-between gap-2 md:flex-row md:items-center">
					<div className="flex flex-wrap items-center gap-2">
						<h1 className="text-xs font-bold tracking-tight lg:text-sm">NCM {profile.ncm}</h1>
						<span className="text-[0.65rem] font-medium italic text-primary/80">{origemLabel}</span>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						{profile.cfopPadrao ? <span className="text-[0.65rem] font-medium text-muted-foreground">CFOP {profile.cfopPadrao}</span> : null}
						<span className="text-[0.65rem] font-medium text-muted-foreground">UN. {profile.unidadeComercial}</span>
						<span className={cn("text-[0.65rem] font-semibold", profile.ativo ? "text-emerald-600" : "text-muted-foreground")}>
							{profile.ativo ? "ATIVO" : "INATIVO"}
						</span>
					</div>
				</div>
				{userHasFiscalConfigurePermission ? (
					<div className="flex w-full items-center justify-end">
						<Button onClick={handleEditClick} size="fit" variant="ghost" className="flex items-center gap-1 px-2 py-1 text-xs">
							<Pencil className="w-4 h-4 min-w-4 min-h-4" />
							EDITAR
						</Button>
						<Button
							onClick={handleDeleteClick}
							size="fit"
							variant="ghost"
							className="flex items-center gap-1 px-2 py-1 text-xs hover:bg-destructive/10 hover:text-destructive duration-300 ease-in-out"
						>
							<Trash2 className="w-4 h-4 min-w-4 min-h-4" />
							REMOVER
						</Button>
					</div>
				) : null}
			</div>
		</div>
	);
}
