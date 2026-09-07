"use client";

import SelectInput from "@/components/Inputs/SelectInput";
import TextInput from "@/components/Inputs/TextInput";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Section } from "@/components/ui/section";
import { formatToCEP, formatToPhone } from "@/lib/formatting";
import { cn, getCEPInfo } from "@/lib/utils";
import type { TUseInternalFiscalSettingsState } from "@/state-hooks/use-internal-fiscal-settings-state";
import { BrazilianCitiesOptionsFromUF, BrazilianStatesOptions } from "@/utils/states-cities";
import { CheckCheck, Plus, Receipt } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { FiscalCertificateMenu } from "./fiscal-certificate-menu";

type CompanyBasicInformationProps = {
	fiscalConfig: TUseInternalFiscalSettingsState["state"]["fiscalConfiguracao"];
	updateFiscalConfig: TUseInternalFiscalSettingsState["updateFiscalConfig"];
	callbacks: {
		onMutate: () => void;
		onSettled: () => void;
	};
};

export function CompanyBasicInformation({ fiscalConfig, updateFiscalConfig, callbacks }: CompanyBasicInformationProps) {
	const [certificateMenuOpen, setCertificateMenuOpen] = useState(false);
	async function setAddressDataByCEP(cep: string) {
		const addressInfo = await getCEPInfo(cep);
		const toastID = toast.loading("Buscando informações sobre o CEP...", {
			duration: 2000,
		});
		setTimeout(() => {
			if (addressInfo) {
				toast.dismiss(toastID);
				toast.success("Dados do CEP buscados com sucesso.", {
					duration: 1000,
				});
				updateFiscalConfig({
					endereco: {
						...fiscalConfig.endereco,
						logradouro: addressInfo.logradouro,
						bairro: addressInfo.bairro,
						uf: addressInfo.uf,
						cidade: addressInfo.localidade.toUpperCase(),
						cep: cep,
						codigoMunicipio: addressInfo.ibge ?? "",
					},
				});
			}
		}, 1000);
	}
	return (
		<Section.Root className="scroll-mt-4">
			<Section.Header>
				<Section.Icon>
					<Receipt className="h-4 w-4" />
				</Section.Icon>
				<Section.Title>EMPRESA FISCAL</Section.Title>
			</Section.Header>
			<Section.Body>
				<span id="fiscal-section-company" />
				<TextInput
					label="RAZÃO SOCIAL"
					value={fiscalConfig.nomeRazaoSocial}
					placeholder="Razão social"
					handleChange={(value) => updateFiscalConfig({ nomeRazaoSocial: value })}
				/>
				<div className="w-full flex items-center gap-3 flex-col lg:flex-row">
					<div className="w-full lg:w-1/2">
						<TextInput
							label="NOME FANTASIA"
							value={fiscalConfig.nomeFantasia ?? ""}
							placeholder="Nome fantasia"
							handleChange={(value) => updateFiscalConfig({ nomeFantasia: value })}
						/>
					</div>
					<div className="w-full lg:w-1/2">
						<TextInput
							label="CPF/CNPJ"
							value={fiscalConfig.cpfCnpj}
							placeholder="Somente números"
							handleChange={(value) => updateFiscalConfig({ cpfCnpj: value })}
						/>
					</div>
				</div>

				<div className="w-full flex items-center gap-3 flex-col lg:flex-row">
					<div className="w-full lg:w-1/3">
						<SelectInput
							label="REGIME TRIBUTÁRIO"
							value={fiscalConfig.regimeTributario?.toString()}
							options={[
								{ id: 1, label: "1", value: "1" },
								{ id: 2, label: "2", value: "2" },
								{ id: 3, label: "3", value: "3" },
								{ id: 4, label: "4", value: "4" },
							]}
							resetOptionLabel="Selecione um regime tributário"
							handleChange={(value) => updateFiscalConfig({ regimeTributario: Number(value) })}
							onReset={() => updateFiscalConfig({ regimeTributario: undefined })}
						/>
					</div>
					<div className="w-full lg:w-1/3">
						<TextInput
							label="INSCRIÇÃO ESTADUAL"
							value={fiscalConfig.inscricaoEstadual ?? ""}
							placeholder="Inscrição estadual"
							handleChange={(value) => updateFiscalConfig({ inscricaoEstadual: value })}
						/>
					</div>
					<div className="w-full lg:w-1/3">
						<TextInput
							label="INSCRIÇÃO MUNICIPAL"
							value={fiscalConfig.inscricaoMunicipal ?? ""}
							placeholder="Inscrição municipal"
							handleChange={(value) => updateFiscalConfig({ inscricaoMunicipal: value })}
						/>
					</div>
				</div>
				<div className="w-full flex items-center gap-3 flex-col lg:flex-row">
					<div className="w-full lg:w-1/2">
						<TextInput
							label="EMAIL FISCAL"
							value={fiscalConfig.emailFiscal ?? ""}
							placeholder="financeiro@empresa.com"
							handleChange={(value) => updateFiscalConfig({ emailFiscal: value })}
						/>
					</div>
					<div className="w-full lg:w-1/2">
						<TextInput
							label="TELEFONE FISCAL"
							value={fiscalConfig.telefoneFiscal ?? ""}
							placeholder="Telefone fiscal"
							handleChange={(value) => updateFiscalConfig({ telefoneFiscal: formatToPhone(value) })}
						/>
					</div>
				</div>
				<div className="w-full flex items-center gap-3 flex-col lg:flex-row">
					<div className="w-full lg:w-1/3">
						<TextInput
							label="CEP"
							value={fiscalConfig.endereco.cep}
							placeholder="CEP"
							handleChange={(value) => {
								if (value.length === 9) {
									setAddressDataByCEP(value);
								}
								updateFiscalConfig({
									endereco: { ...fiscalConfig.endereco, cep: formatToCEP(value) },
								});
							}}
						/>
					</div>
					<div className="w-full lg:w-1/3">
						<SelectInput
							label="UF"
							value={fiscalConfig.endereco.uf}
							options={BrazilianStatesOptions}
							resetOptionLabel="Selecione uma UF"
							handleChange={(value) =>
								updateFiscalConfig({
									endereco: {
										...fiscalConfig.endereco,
										uf: value,
										cidade: BrazilianCitiesOptionsFromUF(value ?? null)[0]?.value,
									},
								})
							}
							onReset={() =>
								updateFiscalConfig({
									endereco: { ...fiscalConfig.endereco, uf: "", cidade: "" },
								})
							}
						/>
					</div>
					<div className="w-full lg:w-1/3">
						<SelectInput
							label="CIDADE"
							value={fiscalConfig.endereco.cidade}
							options={BrazilianCitiesOptionsFromUF(fiscalConfig.endereco.uf ?? null)}
							resetOptionLabel="Selecione uma cidade"
							handleChange={(value) =>
								updateFiscalConfig({
									endereco: { ...fiscalConfig.endereco, cidade: value },
								})
							}
							onReset={() =>
								updateFiscalConfig({
									endereco: { ...fiscalConfig.endereco, cidade: "" },
								})
							}
						/>
					</div>
				</div>
				<div className="w-full flex items-center gap-3 flex-col lg:flex-row">
					<div className="w-full lg:w-1/2">
						<TextInput
							label="CÓDIGO MUNICÍPIO"
							value={fiscalConfig.endereco.codigoMunicipio}
							placeholder="Código IBGE"
							handleChange={(value) =>
								updateFiscalConfig({
									endereco: { ...fiscalConfig.endereco, codigoMunicipio: value },
								})
							}
						/>
					</div>
					<div className="w-full lg:w-1/2">
						<TextInput
							label="BAIRRO"
							value={fiscalConfig.endereco.bairro}
							placeholder="Bairro"
							handleChange={(value) =>
								updateFiscalConfig({
									endereco: { ...fiscalConfig.endereco, bairro: value },
								})
							}
						/>
					</div>
				</div>
				<div className="w-full flex items-center gap-3 flex-col lg:flex-row">
					<div className="w-full lg:w-1/2">
						<TextInput
							label="LOGRADOURO"
							value={fiscalConfig.endereco.logradouro}
							placeholder="Rua / avenida"
							handleChange={(value) =>
								updateFiscalConfig({
									endereco: { ...fiscalConfig.endereco, logradouro: value },
								})
							}
						/>
					</div>
					<div className="w-full lg:w-1/2">
						<TextInput
							label="NÚMERO"
							value={fiscalConfig.endereco.numero}
							placeholder="Número"
							handleChange={(value) =>
								updateFiscalConfig({
									endereco: { ...fiscalConfig.endereco, numero: value },
								})
							}
						/>
					</div>
				</div>
				<div className="w-full flex items-center gap-3 flex-col lg:flex-row">
					<div className="w-full lg:w-1/3">
						<TextInput label="CNAE" value={fiscalConfig.cnae ?? ""} placeholder="CNAE" handleChange={(value) => updateFiscalConfig({ cnae: value })} />
					</div>
					<div className="w-full lg:w-1/3">
						<TextInput
							label="ID DO TOKEN CSC"
							value={fiscalConfig.spedy?.nfce.tokenId ?? ""}
							placeholder="Identificador fornecido pela SEFAZ"
							handleChange={(value) =>
								updateFiscalConfig({
									spedy: {
										...fiscalConfig.spedy,
										nfce: { ...fiscalConfig.spedy.nfce, tokenId: value },
									},
								})
							}
						/>
					</div>
					<div className="w-full lg:w-1/3">
						<TextInput
							label="CSC (CÓDIGO DE SEGURANÇA)"
							value={fiscalConfig.spedy?.nfce?.csc ?? ""}
							placeholder="Código fornecido pela SEFAZ"
							inputType="password"
							autoComplete="off"
							handleChange={(value) =>
								updateFiscalConfig({
									spedy: {
										...fiscalConfig.spedy,
										nfce: { ...fiscalConfig.spedy.nfce, csc: value },
									},
								})
							}
						/>
					</div>
				</div>
				<div className="w-full flex items-center gap-3 flex-col lg:flex-row">
					<div className="w-full lg:w-1/2">
						<TextInput
							label="ID EMPRESA SPEDY"
							value={fiscalConfig.spedy?.companyId ?? ""}
							placeholder="Sincronize a empresa"
							editable={false}
							handleChange={() => undefined}
						/>
					</div>
					<div className="w-full lg:w-1/2">
						<TextInput
							label="CREDENCIAL DE EMISSÃO"
							value={fiscalConfig.spedy?.companyApiKey ? "ATIVA" : "PENDENTE"}
							placeholder="Sincronize a empresa"
							editable={false}
							handleChange={() => undefined}
						/>
					</div>
				</div>
				<div className={"flex w-full flex-col gap-1"}>
					<span id="fiscal-section-certificate" />
					<Label htmlFor={"fiscal-certificate"} className={cn("text-sm font-medium tracking-tight")}>
						CERTIFICADO FISCAL
					</Label>

					{fiscalConfig.spedy?.certificado?.providerManaged || fiscalConfig.spedy?.certificado?.storagePath ? (
						<Button variant="success-light" onClick={() => setCertificateMenuOpen(true)} className="w-fit flex items-center gap-1.5">
							<CheckCheck className="w-4 h-4 min-w-4 min-h-4" />
							CERTIFICADO ATIVO
						</Button>
					) : (
						<Button variant="outline" onClick={() => setCertificateMenuOpen(true)} className="w-fit flex items-center gap-1.5">
							<Plus className="w-4 h-4 min-w-4 min-h-4" />
							CARREGAR CERTIFICADO
						</Button>
					)}
				</div>
				{certificateMenuOpen ? (
					<FiscalCertificateMenu
						fiscalConfigCertificate={fiscalConfig.spedy?.certificado}
						callbacks={callbacks}
						closeMenu={() => setCertificateMenuOpen(false)}
					/>
				) : null}
			</Section.Body>
		</Section.Root>
	);
}
