"use client";

import TextInput from "@/components/Inputs/TextInput";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { getErrorMessage } from "@/lib/errors";
import { syncFiscalCompanyCertificate } from "@/lib/mutations/fiscal";
import type { TUseInternalFiscalSettingsState } from "@/state-hooks/use-internal-fiscal-settings-state";
import { useMutation } from "@tanstack/react-query";
import { Check, FileIcon, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type FiscalCertificateMenuProps = {
	fiscalConfigCertificate: TUseInternalFiscalSettingsState["state"]["fiscalConfiguracao"]["spedy"]["certificado"];
	callbacks: {
		onMutate: () => void;
		onSettled: () => void;
	};
	closeMenu: () => void;
};

export function FiscalCertificateMenu({ fiscalConfigCertificate, callbacks, closeMenu }: FiscalCertificateMenuProps) {
	const [certificateInformation, setCertificateInformation] = useState<{
		file: File | null;
		password: string | null;
	}>({
		file: null,
		password: null,
	});

	async function handleSubmitCertificate(info: { file: File | null; password: string | null }) {
		if (!info.file) throw new Error("Arquivo não selecionado.");
		if (!info.password) throw new Error("Senha não informada.");

		return await syncFiscalCompanyCertificate({
			file: info.file,
			password: info.password,
		});
	}
	const { mutate, isPending } = useMutation({
		mutationKey: ["sync-fiscal-company-certificate"],
		mutationFn: handleSubmitCertificate,
		onMutate: () => {
			callbacks.onMutate();
		},
		onSettled: () => {
			callbacks.onSettled();
		},
		onSuccess: () => {
			closeMenu();
		},
		onError: (error) => {
			toast.error(getErrorMessage(error));
		},
	});
	return (
		<ResponsiveMenu
			menuTitle="CERTIFICADO FISCAL"
			menuDescription="Preencha os campos abaixo para carregar o certificado fiscal"
			menuActionButtonText="CARREGAR CERTIFICADO"
			menuCancelButtonText="CANCELAR"
			closeMenu={closeMenu}
			actionFunction={() => mutate(certificateInformation)}
			actionIsLoading={isPending}
			stateIsLoading={false}
			stateError={null}
		>
			<div className="flex min-h-[250px] w-full min-w-[250px] items-center justify-center">
				<label
					className="relative flex min-h-[250px] w-full max-w-[250px] cursor-pointer overflow-hidden rounded-lg border border-border bg-muted/40"
					htmlFor="fiscal-cert-dropzone"
				>
					{/* Input abaixo; a camada visual fica por cima com pointer-events-none para não ser coberta pelo controle nativo do arquivo (opacity-0 nem sempre “vê” o que está atrás). */}
					<input
						accept=".p12,.pfx"
						className="absolute inset-0 z-10 h-full min-h-[250px] w-full cursor-pointer opacity-0"
						id="fiscal-cert-dropzone"
						multiple={false}
						onChange={(e) => {
							const file = e.target.files?.[0] ?? null;
							setCertificateInformation((prev) => ({ ...prev, file }));
						}}
						tabIndex={-1}
						type="file"
					/>
					<div className="pointer-events-none absolute inset-0 z-20 flex min-h-[250px] flex-col items-center justify-center gap-1 px-2 text-foreground">
						{certificateInformation.file ? (
							<>
								<Check className="h-6 w-6 shrink-0" />
								<p className="text-center text-xs font-medium">ARQUIVO SELECIONADO</p>
								<p className="line-clamp-4 break-all text-center text-xs font-medium text-muted-foreground">{certificateInformation.file.name}</p>
							</>
						) : fiscalConfigCertificate.providerManaged || fiscalConfigCertificate.storagePath ? (
							<>
								<FileIcon className="h-6 w-6 shrink-0" />
								<p className="text-center text-xs font-medium">CERTIFICADO DEFINIDO</p>
							</>
						) : (
							<>
								<Plus className="h-6 w-6 shrink-0" />
								<p className="text-center text-xs font-medium">CARREGAR ARQUIVO</p>
							</>
						)}
					</div>
				</label>
			</div>
			<TextInput
				label="SENHA"
				value={certificateInformation.password ?? ""}
				placeholder="Senha"
				handleChange={(value) => setCertificateInformation((prev) => ({ ...prev, password: value }))}
			/>
		</ResponsiveMenu>
	);
}
