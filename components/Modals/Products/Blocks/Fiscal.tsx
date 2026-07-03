import CheckboxInput from "@/components/Inputs/CheckboxInput";
import SelectInput from "@/components/Inputs/SelectInput";
import TextInput from "@/components/Inputs/TextInput";
import {
	ProductFiscalProfileCard,
	type ProductFiscalProfileCardProps,
	type TProductFiscalProfileCardData,
} from "@/components/Products/Shared/ProductFiscalProfileCard";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { Button } from "@/components/ui/button";
import { isValidNumber } from "@/lib/validation";
import type { TFiscalProductOriginEnum } from "@/schemas/enums";
import type { TUseProductState } from "@/state-hooks/use-product-state";
import { ProductFiscalProfileOriginOptions, UnitsOfMeasurementOptions } from "@/utils/select-options";
import { BookText, Plus } from "lucide-react";
import type { ComponentType } from "react";
import { useState } from "react";
import { toast } from "sonner";

function emptyProductFiscalProfile(): TUseProductState["state"]["productFiscalProfiles"][number] {
	return {
		origemMercadoria: "NACIONAL",
		ncm: "",
		exTipi: null,
		cest: null,
		cfopPadrao: null,
		unidadeComercial: "UN",
		codigoBeneficioFiscal: null,
		ativo: true,
		dataInsercao: new Date(),
	};
}

type ProductFiscalProfileCardComponentProps = ProductFiscalProfileCardProps;

function mapStateFiscalProfileToCardData(profile: TUseProductState["state"]["productFiscalProfiles"][number]): TProductFiscalProfileCardData {
	return {
		origemMercadoria: profile.origemMercadoria,
		ncm: profile.ncm,
		exTipi: profile.exTipi != null ? profile.exTipi : null,
		cest: profile.cest != null ? profile.cest : null,
		cfopPadrao: profile.cfopPadrao != null ? profile.cfopPadrao : null,
		unidadeComercial: profile.unidadeComercial,
		codigoBeneficioFiscal: profile.codigoBeneficioFiscal != null ? profile.codigoBeneficioFiscal : null,
		ativo: profile.ativo,
	};
}

type ProductStateFiscalBlockProps = {
	userHasFiscalViewPermission: boolean;
	userHasFiscalConfigurePermission: boolean;
	productFiscalProfiles: TUseProductState["state"]["productFiscalProfiles"];
	addProductFiscalProfile: TUseProductState["addProductFiscalProfile"];
	updateProductFiscalProfile: TUseProductState["updateProductFiscalProfile"];
	removeProductFiscalProfile: TUseProductState["removeProductFiscalProfile"];
	embedded?: boolean;
	FiscalProfileCard?: ComponentType<ProductFiscalProfileCardComponentProps>;
};

export default function ProductStateFiscalBlock({
	userHasFiscalViewPermission,
	userHasFiscalConfigurePermission,
	productFiscalProfiles,
	addProductFiscalProfile,
	updateProductFiscalProfile,
	removeProductFiscalProfile,
	embedded = false,
	FiscalProfileCard = ProductFiscalProfileCard,
}: ProductStateFiscalBlockProps) {
	if (!userHasFiscalViewPermission) return null;
	const [newFiscalProfileMenuIsOpen, setNewFiscalProfileMenuIsOpen] = useState(false);
	const [editFiscalProfileIndex, setEditFiscalProfileIndex] = useState<number | null>(null);
	const validFiscalProfiles = productFiscalProfiles
		.map((profile, index) => ({ ...profile, originalIndex: index }))
		.filter((profile) => !profile.deletar);
	const editingFiscalProfile = isValidNumber(editFiscalProfileIndex) ? productFiscalProfiles[editFiscalProfileIndex as number] : null;
	const content = (
		<>
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
					<FiscalProfileCard
						key={profile.id || `temp-profile-${profile.originalIndex}`}
						fiscalProfile={mapStateFiscalProfileToCardData(profile)}
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
		</>
	);

	if (embedded) return content;

	return (
		<ResponsiveMenuSection title="CONFIGURAÇÃO FISCAL" icon={<BookText className="h-4 min-h-4 w-4 min-w-4" />}>
			{content}
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
			<div className="flex w-full items-center justify-center">
				<CheckboxInput
					checked={profileHolder.ativo}
					labelTrue="PERFIL ATIVO"
					labelFalse="PERFIL INATIVO"
					handleChange={(value) => updateProfileHolder({ ativo: value })}
					justify="justify-center"
				/>
			</div>
			<SelectInput
				label="ORIGEM DA MERCADORIA"
				value={profileHolder.origemMercadoria}
				options={ProductFiscalProfileOriginOptions}
				resetOptionLabel="SELECIONE A ORIGEM"
				handleChange={(value) => updateProfileHolder({ origemMercadoria: value as TFiscalProductOriginEnum })}
				onReset={() => updateProfileHolder({ origemMercadoria: "NACIONAL" })}
			/>
			<TextInput label="NCM" placeholder="Ex.: 12345678" value={profileHolder.ncm} handleChange={(value) => updateProfileHolder({ ncm: value })} />
			<TextInput
				label="EX TIPI"
				placeholder="Opcional - ex.: 01"
				value={profileHolder.exTipi ?? ""}
				handleChange={(value) => updateProfileHolder({ exTipi: value.trim() === "" ? null : value })}
			/>
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
			/>
			<TextInput
				label="CÓDIGO DE BENEFÍCIO FISCAL"
				placeholder="Opcional"
				value={profileHolder.codigoBeneficioFiscal ?? ""}
				handleChange={(value) => updateProfileHolder({ codigoBeneficioFiscal: value.trim() === "" ? null : value })}
			/>
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
			<div className="flex w-full items-center justify-center">
				<CheckboxInput
					checked={profileHolder.ativo}
					labelTrue="PERFIL ATIVO"
					labelFalse="PERFIL INATIVO"
					handleChange={(value) => updateProfileHolder({ ativo: value })}
					justify="justify-center"
				/>
			</div>
			<SelectInput
				label="ORIGEM DA MERCADORIA"
				value={profileHolder.origemMercadoria}
				options={ProductFiscalProfileOriginOptions}
				resetOptionLabel="SELECIONE A ORIGEM"
				handleChange={(value) => updateProfileHolder({ origemMercadoria: value as TFiscalProductOriginEnum })}
				onReset={() => updateProfileHolder({ origemMercadoria: "NACIONAL" })}
			/>
			<TextInput label="NCM" placeholder="Ex.: 12345678" value={profileHolder.ncm} handleChange={(value) => updateProfileHolder({ ncm: value })} />
			<TextInput
				label="EX TIPI"
				placeholder="Opcional - ex.: 01"
				value={profileHolder.exTipi ?? ""}
				handleChange={(value) => updateProfileHolder({ exTipi: value.trim() === "" ? null : value })}
			/>
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
			/>
			<TextInput
				label="CÓDIGO DE BENEFÍCIO FISCAL"
				placeholder="Opcional"
				value={profileHolder.codigoBeneficioFiscal ?? ""}
				handleChange={(value) => updateProfileHolder({ codigoBeneficioFiscal: value.trim() === "" ? null : value })}
			/>
		</ResponsiveMenu>
	);
}
