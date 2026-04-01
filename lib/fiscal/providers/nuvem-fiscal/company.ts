import type { TFiscalOrganization, TProviderCompanySyncResult } from "@/lib/fiscal/types";
import { createNuvemFiscalClient } from "./client";

function mapOrganizationToNuvemFiscalCompany(organizacao: TFiscalOrganization) {
	const fiscal = organizacao.fiscalConfiguracao;
	if (!fiscal) throw new Error("Configuracao fiscal nao encontrada.");

	return {
		cpf_cnpj: fiscal.cpfCnpj,
		nome_razao_social: fiscal.nomeRazaoSocial,
		nome_fantasia: fiscal.nomeFantasia ?? undefined,
		email: fiscal.emailFiscal ?? organizacao.email ?? undefined,
		fone: fiscal.telefoneFiscal ?? organizacao.telefone ?? undefined,
		inscricao_estadual: fiscal.inscricaoEstadual ?? undefined,
		inscricao_municipal: fiscal.inscricaoMunicipal ?? undefined,
		endereco: {
			logradouro: fiscal.endereco.logradouro,
			numero: fiscal.endereco.numero,
			complemento: fiscal.endereco.complemento ?? undefined,
			bairro: fiscal.endereco.bairro,
			codigo_municipio: fiscal.endereco.codigoMunicipio,
			cidade: fiscal.endereco.cidade,
			uf: fiscal.endereco.uf,
			cep: fiscal.endereco.cep,
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

	await client.post("/empresas", companyPayload).catch(async () => {
		await client.put(`/empresas/${cpfCnpj}`, companyPayload);
	});

	await client.put(`/empresas/${cpfCnpj}/nfce`, mapOrganizationNfceConfig(organizacao));
	await client.put(`/empresas/${cpfCnpj}/nfe`, mapOrganizationNfeConfig(organizacao));

	return {
		cpfCnpj,
		sincronizado: true,
	};
}

