import { downloadStoredFiscalAsset } from "@/lib/fiscal/storage";
import type {
	TFiscalOrganization,
	TProviderCompanyCertificateSyncInput,
	TProviderCompanyCertificateSyncResult,
	TProviderCompanySyncResult,
} from "@/lib/fiscal/types";
import { createNuvemFiscalClient } from "./client";
import { formatStringAsOnlyDigits } from "@/lib/formatting";
import { mapTaxRegistration, nonEmptyString, onlyDigits } from "./mappers/utils";

function mapOrganizationToNuvemFiscalCompany(organizacao: TFiscalOrganization) {
	const fiscal = organizacao.fiscalConfiguracao;
	if (!fiscal) throw new Error("Configuracao fiscal nao encontrada.");

	return {
		cpf_cnpj: formatStringAsOnlyDigits(fiscal.cpfCnpj),
		nome_razao_social: fiscal.nomeRazaoSocial,
		nome_fantasia: fiscal.nomeFantasia ?? undefined,
		email: fiscal.emailFiscal ?? organizacao.email ?? undefined,
		fone: onlyDigits(fiscal.telefoneFiscal ?? organizacao.telefone),
		inscricao_estadual: mapTaxRegistration(fiscal.inscricaoEstadual),
		inscricao_municipal: nonEmptyString(fiscal.inscricaoMunicipal),
		endereco: {
			logradouro: fiscal.endereco.logradouro,
			numero: fiscal.endereco.numero,
			complemento: fiscal.endereco.complemento ?? undefined,
			bairro: fiscal.endereco.bairro,
			codigo_municipio: fiscal.endereco.codigoMunicipio,
			cidade: fiscal.endereco.cidade,
			uf: fiscal.endereco.uf,
			cep: formatStringAsOnlyDigits(fiscal.endereco.cep),
			codigo_pais: fiscal.endereco.codigoPais,
			pais: fiscal.endereco.pais,
		},
	};
}

function mapOrganizationNfceConfig(organizacao: TFiscalOrganization) {
	const fiscal = organizacao.fiscalConfiguracao;
	if (!fiscal) throw new Error("Configuracao fiscal nao encontrada.");

	return {
		CRT: fiscal.regimeTributario,
		ambiente: fiscal.ambiente === "PRODUCAO" ? "producao" : "homologacao",
		sefaz: {
			id_csc: fiscal.nuvemFiscal.nfce.idCsc,
			csc: fiscal.nuvemFiscal.nfce.csc,
		},
	};
}

function mapOrganizationNfeConfig(organizacao: TFiscalOrganization) {
	const fiscal = organizacao.fiscalConfiguracao;
	if (!fiscal) throw new Error("Configuracao fiscal nao encontrada.");

	return {
		CRT: fiscal.regimeTributario,
		ambiente: fiscal.ambiente === "PRODUCAO" ? "producao" : "homologacao",
	};
}

export async function syncNuvemFiscalCompany(organizacao: TFiscalOrganization): Promise<TProviderCompanySyncResult> {
	const client = createNuvemFiscalClient({
		baseUrl: organizacao.fiscalConfiguracao?.nuvemFiscal.api.baseUrl,
		apiToken: organizacao.fiscalConfiguracao?.nuvemFiscal.api.apiToken,
	});
	const companyPayload = mapOrganizationToNuvemFiscalCompany(organizacao);
	const cpfCnpj = organizacao.fiscalConfiguracao?.cpfCnpj;
	if (!cpfCnpj) throw new Error("CPF/CNPJ fiscal nao configurado.");

	const cpfCnpjAsNumber = formatStringAsOnlyDigits(cpfCnpj);
	await client.post("/empresas", companyPayload).catch(async () => {
		await client.put(`/empresas/${cpfCnpjAsNumber}`, companyPayload);
	});

	await client.put(`/empresas/${cpfCnpjAsNumber}/nfce`, mapOrganizationNfceConfig(organizacao));
	await client.put(`/empresas/${cpfCnpjAsNumber}/nfe`, mapOrganizationNfeConfig(organizacao));

	return {
		cpfCnpj,
		sincronizado: true,
	};
}

function getNuvemFiscalCompanyIdentifier(organizacao: TFiscalOrganization) {
	const cpfCnpj = organizacao.fiscalConfiguracao?.cpfCnpj;
	if (!cpfCnpj) throw new Error("CPF/CNPJ fiscal nao configurado.");
	return {
		cpfCnpj,
		cpfCnpjAsNumber: formatStringAsOnlyDigits(cpfCnpj),
	};
}

function mapCertificateMetadata(storagePath: string, responseData: unknown): TProviderCompanyCertificateSyncResult["certificado"] {
	const data = responseData && typeof responseData === "object" ? (responseData as Record<string, unknown>) : {};

	const getString = (...keys: string[]) => {
		for (const key of keys) {
			const value = data[key];
			if (typeof value === "string" && value.length > 0) return value;
		}
		return null;
	};

	return {
		storagePath,
		serialNumber: getString("serial_number", "serialNumber", "numero_serie", "numeroSerie"),
		issuerName: getString("issuer_name", "issuerName", "emissor", "nome_emissor"),
		subjectName: getString("subject_name", "subjectName", "sujeito", "nome_titular"),
		thumbprint: getString("thumbprint", "impressao_digital"),
		validFrom: getString("valid_from", "validFrom", "data_validade_inicial", "data_inicio_validade"),
		validTo: getString("valid_to", "validTo", "data_validade_final", "data_fim_validade", "vencimento"),
		uploadedAt: new Date().toISOString(),
	};
}

export async function syncNuvemFiscalCompanyCertificate(
	organizacao: TFiscalOrganization,
	input: TProviderCompanyCertificateSyncInput,
): Promise<TProviderCompanyCertificateSyncResult> {
	const client = createNuvemFiscalClient({
		baseUrl: organizacao.fiscalConfiguracao?.nuvemFiscal.api.baseUrl,
		apiToken: organizacao.fiscalConfiguracao?.nuvemFiscal.api.apiToken,
	});
	const { cpfCnpj, cpfCnpjAsNumber } = getNuvemFiscalCompanyIdentifier(organizacao);
	const certificateBuffer = await downloadStoredFiscalAsset(input.storagePath);
	const certificado = Buffer.from(certificateBuffer).toString("base64");

	try {
		const { data } = await client.put(`/empresas/${cpfCnpjAsNumber}/certificado`, {
			certificado,
			password: input.password,
		});
		console.log("[DEBUG] [SYNC_NUVEM_FISCAL_COMPANY_CERTIFICATE] Successfully synchronized certificate.", JSON.stringify(data, null, 2));
		return {
			cpfCnpj,
			sincronizado: true,
			certificado: mapCertificateMetadata(input.storagePath, data),
		};
	} catch (error) {
		console.error("[DEBUG] [SYNC_NUVEM_FISCAL_COMPANY_CERTIFICATE] Error synchronizing certificate.", JSON.stringify(error.response?.data, null, 2));
		throw error;
	}
}
