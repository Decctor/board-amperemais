import CheckboxInput from "@/components/Inputs/CheckboxInput";
import SelectInput from "@/components/Inputs/SelectInput";
import TextInput from "@/components/Inputs/TextInput";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { useProductFiscalProfileById } from "@/lib/queries/products";
import type { TFiscalProductOriginEnum } from "@/schemas/enums";
import { TUseProductFiscalProfileState, useProductFiscalProfileState } from "@/state-hooks/use-product-state";
import { ProductFiscalProfileOriginOptions, UnitsOfMeasurementOptions } from "@/utils/select-options";
import { useEffect } from "react";
import { toast } from "sonner";

type FiscalProfileMenuProps = {
	fiscalProfileId?: string;
	closeMenu: () => void;
	submitFiscalProfile: (state: TUseProductFiscalProfileState["state"]) => void;
	submitFiscalProfileIsLoading: boolean;
};

export default function FiscalProfileMenu({ fiscalProfileId, closeMenu, submitFiscalProfile, submitFiscalProfileIsLoading }: FiscalProfileMenuProps) {
	if (fiscalProfileId) {
		return (
			<FiscalProfileMenuPersisted
				fiscalProfileId={fiscalProfileId}
				closeMenu={closeMenu}
				submitFiscalProfile={submitFiscalProfile}
				submitFiscalProfileIsLoading={submitFiscalProfileIsLoading}
			/>
		);
	}

	return (
		<FiscalProfileMenuNonPersisted
			closeMenu={closeMenu}
			submitFiscalProfile={submitFiscalProfile}
			submitFiscalProfileIsLoading={submitFiscalProfileIsLoading}
		/>
	);
}

type FiscalProfileMenuPersistedProps = {
	fiscalProfileId: string;
	closeMenu: () => void;
	submitFiscalProfile: (state: TUseProductFiscalProfileState["state"]) => void;
	submitFiscalProfileIsLoading: boolean;
};

function FiscalProfileMenuPersisted({
	fiscalProfileId,
	closeMenu,
	submitFiscalProfile,
	submitFiscalProfileIsLoading,
}: FiscalProfileMenuPersistedProps) {
	const { data: fiscalProfile, isLoading, error } = useProductFiscalProfileById({ productFiscalProfileId: fiscalProfileId });
	const { state, updateFiscalProfile, redefineState } = useProductFiscalProfileState({});

	useEffect(() => {
		if (fiscalProfile) {
			redefineState({
				id: fiscalProfile.id,
				origemMercadoria: fiscalProfile.origemMercadoria,
				ncm: fiscalProfile.ncm,
				cest: fiscalProfile.cest ?? null,
				cfopPadrao: fiscalProfile.cfopPadrao ?? null,
				unidadeComercial: fiscalProfile.unidadeComercial,
				codigoBeneficioFiscal: fiscalProfile.codigoBeneficioFiscal ?? null,
				ativo: fiscalProfile.ativo,
				dataInsercao: new Date(fiscalProfile.dataInsercao),
			});
		}
	}, [fiscalProfile, redefineState]);

	return (
		<FiscalProfileMenuContent
			closeMenu={closeMenu}
			state={state}
			stateIsLoading={isLoading}
			stateError={error ? error.message : null}
			updateFiscalProfile={updateFiscalProfile}
			submitionIsLoading={submitFiscalProfileIsLoading}
			submitFiscalProfile={() => submitFiscalProfile(state)}
			menuTitle="EDITAR PERFIL FISCAL"
			menuDescription="Preencha os campos abaixo para editar o perfil fiscal"
			menuActionButtonText="ATUALIZAR PERFIL"
			menuCancelButtonText="CANCELAR"
		/>
	);
}

type FiscalProfileMenuNonPersistedProps = {
	closeMenu: () => void;
	submitFiscalProfile: (state: TUseProductFiscalProfileState["state"]) => void;
	submitFiscalProfileIsLoading: boolean;
};

function FiscalProfileMenuNonPersisted({ closeMenu, submitFiscalProfile, submitFiscalProfileIsLoading }: FiscalProfileMenuNonPersistedProps) {
	const { state, updateFiscalProfile } = useProductFiscalProfileState({});

	return (
		<FiscalProfileMenuContent
			closeMenu={closeMenu}
			state={state}
			stateIsLoading={false}
			stateError={null}
			updateFiscalProfile={updateFiscalProfile}
			submitionIsLoading={submitFiscalProfileIsLoading}
			submitFiscalProfile={() => submitFiscalProfile(state)}
			menuTitle="CRIAR PERFIL FISCAL"
			menuDescription="Preencha os campos abaixo para criar o perfil fiscal"
			menuActionButtonText="CRIAR PERFIL"
			menuCancelButtonText="CANCELAR"
		/>
	);
}

type FiscalProfileMenuContentProps = {
	closeMenu: () => void;
	state: TUseProductFiscalProfileState["state"];
	stateIsLoading: boolean;
	stateError: string | null;
	updateFiscalProfile: TUseProductFiscalProfileState["updateFiscalProfile"];
	submitionIsLoading: boolean;
	submitFiscalProfile: (state: TUseProductFiscalProfileState["state"]) => void;
	menuTitle: string;
	menuDescription: string;
	menuActionButtonText: string;
	menuCancelButtonText: string;
};

function FiscalProfileMenuContent({
	closeMenu,
	state,
	stateIsLoading,
	stateError,
	updateFiscalProfile,
	submitionIsLoading,
	submitFiscalProfile,
	menuTitle,
	menuDescription,
	menuActionButtonText,
	menuCancelButtonText,
}: FiscalProfileMenuContentProps) {
	function validateAndSubmit() {
		if (!state.ncm?.trim()) return toast.error("NCM não informado.");
		submitFiscalProfile(state);
	}

	return (
		<ResponsiveMenu
			menuTitle={menuTitle}
			menuDescription={menuDescription}
			menuActionButtonText={menuActionButtonText}
			menuCancelButtonText={menuCancelButtonText}
			closeMenu={closeMenu}
			actionFunction={validateAndSubmit}
			actionIsLoading={submitionIsLoading}
			stateIsLoading={stateIsLoading}
			stateError={stateError}
		>
			<div className="flex w-full items-center justify-center">
				<CheckboxInput
					checked={state.ativo}
					labelTrue="PERFIL ATIVO"
					labelFalse="PERFIL INATIVO"
					handleChange={(value) => updateFiscalProfile({ ativo: value })}
					justify="justify-center"
				/>
			</div>
			<SelectInput
				label="ORIGEM DA MERCADORIA"
				value={state.origemMercadoria}
				options={ProductFiscalProfileOriginOptions}
				resetOptionLabel="SELECIONE A ORIGEM"
				handleChange={(value) => updateFiscalProfile({ origemMercadoria: value as TFiscalProductOriginEnum })}
				onReset={() => updateFiscalProfile({ origemMercadoria: "NACIONAL" })}
				width="100%"
			/>
			<TextInput label="NCM" placeholder="Ex.: 12345678" value={state.ncm} handleChange={(value) => updateFiscalProfile({ ncm: value })} />
			<TextInput
				label="CEST"
				placeholder="Opcional"
				value={state.cest ?? ""}
				handleChange={(value) => updateFiscalProfile({ cest: value.trim() === "" ? null : value })}
			/>
			<TextInput
				label="CFOP PADRÃO"
				placeholder="Opcional - ex.: 5102"
				value={state.cfopPadrao ?? ""}
				handleChange={(value) => updateFiscalProfile({ cfopPadrao: value.trim() === "" ? null : value })}
			/>
			<SelectInput
				label="UNIDADE COMERCIAL"
				value={state.unidadeComercial}
				options={UnitsOfMeasurementOptions}
				resetOptionLabel="SELECIONE A UNIDADE"
				handleChange={(value) => updateFiscalProfile({ unidadeComercial: value as string })}
				onReset={() => updateFiscalProfile({ unidadeComercial: "UN" })}
				width="100%"
			/>
			<TextInput
				label="CÓDIGO DE BENEFÍCIO FISCAL"
				placeholder="Opcional"
				value={state.codigoBeneficioFiscal ?? ""}
				handleChange={(value) => updateFiscalProfile({ codigoBeneficioFiscal: value.trim() === "" ? null : value })}
			/>
		</ResponsiveMenu>
	);
}
