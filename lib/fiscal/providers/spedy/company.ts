import type {
	TFiscalOrganization,
	TProviderCompanyCertificateSyncInput,
	TProviderCompanyCertificateSyncResult,
	TProviderCompanySyncResult,
} from "@/lib/fiscal/types";
import createHttpError from "http-errors";
import { getSpedyOwnerClient } from "./client";
import { describeSpedyError, extractSpedyErrorMessages, toSpedyHttpError } from "./errors";
import { mapFiscalEnvironmentToSpedy } from "./status";
import type { TSpedyCertificateResponse, TSpedyCompanyResponse } from "./types";
import { mapTaxRegistration, nonEmptyString, onlyDigits } from "./mappers/utils";

function mapTaxRegime(regime: number) {
	switch (regime) {
		case 2:
			return "simplesNacionalExcessoSublimite";
		case 3:
			return "regimeNormal";
		case 4:
			return "simplesNacionalMEI";
		case 1:
		default:
			return "simplesNacional";
	}
}

function mapOrganizationToSpedyCompany(organizacao: TFiscalOrganization) {
	const fiscal = organizacao.fiscalConfiguracao;
	if (!fiscal) throw new createHttpError.BadRequest("Configuracao fiscal nao encontrada.");
	return {
		name: fiscal.nomeFantasia ?? fiscal.nomeRazaoSocial,
		legalName: fiscal.nomeRazaoSocial,
		federalTaxNumber: onlyDigits(fiscal.cpfCnpj),
		stateTaxNumber: mapTaxRegistration(fiscal.inscricaoEstadual),
		cityTaxNumber: nonEmptyString(fiscal.inscricaoMunicipal),
		email: fiscal.emailFiscal ?? organizacao.email ?? undefined,
		phone: onlyDigits(fiscal.telefoneFiscal ?? organizacao.telefone),
		address: {
			street: fiscal.endereco.logradouro,
			district: fiscal.endereco.bairro,
			postalCode: onlyDigits(fiscal.endereco.cep),
			number: fiscal.endereco.numero,
			additionalInformation: fiscal.endereco.complemento ?? undefined,
			city: {
				name: fiscal.endereco.cidade,
				state: fiscal.endereco.uf.toLowerCase(),
				code: Number(fiscal.endereco.codigoMunicipio) || undefined,
			},
			country: { name: "Brasil", code: Number(fiscal.endereco.codigoPais) || 1058 },
		},
		taxRegime: mapTaxRegime(fiscal.regimeTributario),
		economicActivities: fiscal.cnae ? [{ code: onlyDigits(fiscal.cnae), type: "main" }] : undefined,
	};
}

function mapOrganizationToSpedySettings(organizacao: TFiscalOrganization) {
	const fiscal = organizacao.fiscalConfiguracao;
	if (!fiscal) throw new createHttpError.BadRequest("Configuracao fiscal nao encontrada.");
	const environmentType = mapFiscalEnvironmentToSpedy(fiscal.ambiente);
	return {
		general: {
			allowDuplicateFederalTaxNumbers: false,
			allowMultipleInvoiceModelsPerOrder: false,
			decimalPrecision: 2,
			taxReformFieldsEnabled: false,
		},
		productInvoice: {
			environmentType,
			// Sempre enviar o bloco inbound junto: a doc garante independencia entre blocos, mas nao
			// merge dentro de productInvoice — omitir aqui poderia desligar a importacao a cada sync.
			inbound: {
				enabled: fiscal.dfe.habilitado,
				startDate: fiscal.dfe.dataInicio ?? null,
			},
		},
		consumerInvoice: {
			environmentType,
			tokenId: fiscal.spedy.nfce.tokenId ?? undefined,
			csc: fiscal.spedy.nfce.csc ?? undefined,
		},
	};
}

function extractCompanyApiKey(company: TSpedyCompanyResponse) {
	const apiKey = company.apiCredentials?.apiKey ?? null;
	if (!apiKey || apiKey.includes("*")) return null;
	return apiKey;
}

function normalizeDateTime(value: string | null | undefined) {
	if (!value) return null;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function mapSpedyCertificateSyncResult({
	cpfCnpj,
	certificate,
}: {
	cpfCnpj: string;
	certificate: TSpedyCertificateResponse;
}): TProviderCompanyCertificateSyncResult {
	return {
		cpfCnpj,
		sincronizado: true,
		certificado: {
			providerManaged: true,
			serialNumber: certificate.id ?? null,
			issuerName: certificate.issuer ?? null,
			subjectName: certificate.subject ?? null,
			validFrom: null,
			validTo: normalizeDateTime(certificate.expirationAt),
			uploadedAt: new Date().toISOString(),
		},
	};
}

function isDuplicateCertificateError(error: unknown) {
	return extractSpedyErrorMessages(error).some((message) => {
		const normalized = message
			.normalize("NFD")
			.replace(/[\u0300-\u036f]/g, "")
			.toLowerCase();
		return normalized.includes("certificado") && normalized.includes("ja") && normalized.includes("cadastrado");
	});
}

function pickCurrentCertificate(certificates: TSpedyCertificateResponse[]) {
	const active = certificates.find((certificate) => certificate.isActive);
	if (active) return active;
	return certificates
		.filter((certificate) => certificate.id)
		.sort((a, b) => {
			const aDate = new Date(a.expirationAt ?? 0).getTime();
			const bDate = new Date(b.expirationAt ?? 0).getTime();
			return bDate - aDate;
		})[0];
}

export async function syncSpedyCompany(organizacao: TFiscalOrganization): Promise<TProviderCompanySyncResult> {
	const fiscal = organizacao.fiscalConfiguracao;
	if (!fiscal?.cpfCnpj) throw new createHttpError.BadRequest("CPF/CNPJ fiscal nao configurado.");

	const client = getSpedyOwnerClient();
	const payload = mapOrganizationToSpedyCompany(organizacao);
	let company: TSpedyCompanyResponse;

	try {
		if (fiscal.spedy.companyId) {
			console.log("[DEBUG] [SPEDY] Sincronizando empresa existente.", fiscal.spedy.companyId);
			const { data } = await client.put<TSpedyCompanyResponse>(`/v1/companies/${fiscal.spedy.companyId}`, { ...payload, id: fiscal.spedy.companyId });
			company = data;
		} else {
			console.log("[DEBUG] [SPEDY] Criando nova empresa.");
			const { data } = await client.post<TSpedyCompanyResponse>("/v1/companies", payload);
			company = data;
		}
	} catch (error) {
		console.error("[SPEDY] Erro ao sincronizar empresa.", describeSpedyError(error));
		throw toSpedyHttpError(error, "Nao foi possivel sincronizar a empresa na Spedy.");
	}

	if (!company.id) throw new createHttpError.InternalServerError("Spedy nao retornou o ID da empresa.");

	await client.put(`/v1/companies/${company.id}/settings`, mapOrganizationToSpedySettings(organizacao));
	const { data: refreshedCompany } = await client.get<TSpedyCompanyResponse>(`/v1/companies/${company.id}`);

	return {
		cpfCnpj: fiscal.cpfCnpj,
		sincronizado: true,
		companyId: company.id,
		companyApiKey: extractCompanyApiKey(company) ?? extractCompanyApiKey(refreshedCompany),
		provedorRetorno: refreshedCompany as unknown as Record<string, unknown>,
	};
}

const CERTIFICATE_MIME_TYPE = "application/x-pkcs12";

export async function syncSpedyCompanyCertificate(
	organizacao: TFiscalOrganization,
	input: TProviderCompanyCertificateSyncInput,
): Promise<TProviderCompanyCertificateSyncResult> {
	const fiscal = organizacao.fiscalConfiguracao;
	const companyId = fiscal?.spedy.companyId;
	if (!fiscal?.cpfCnpj) throw new createHttpError.BadRequest("CPF/CNPJ fiscal nao configurado.");
	if (!companyId) throw new createHttpError.BadRequest("Sincronize a empresa na Spedy antes de enviar o certificado.");

	const formData = new FormData();
	formData.append("certificateFile", new Blob([input.certificate], { type: CERTIFICATE_MIME_TYPE }), input.fileName);
	formData.append("password", input.password);

	const client = getSpedyOwnerClient();
	try {
		// O client tem `application/json` como padrao, e nesse caso o axios serializaria o FormData como JSON
		// (`{"certificateFile":{}}`). O header abaixo devolve o controle ao adapter, que monta o multipart com boundary.
		const { data } = await client.post<TSpedyCertificateResponse>(`/v1/companies/${companyId}/certificates`, formData, {
			headers: { "Content-Type": "multipart/form-data" },
		});

		return mapSpedyCertificateSyncResult({ cpfCnpj: fiscal.cpfCnpj, certificate: data });
	} catch (error) {
		console.error("[SPEDY] Erro ao sincronizar certificado.", describeSpedyError(error));
		if (isDuplicateCertificateError(error)) {
			const { data: certificates } = await client.get<TSpedyCertificateResponse[]>(`/v1/companies/${companyId}/certificates`);
			const certificate = pickCurrentCertificate(certificates);
			if (certificate) {
				return mapSpedyCertificateSyncResult({ cpfCnpj: fiscal.cpfCnpj, certificate });
			}
			throw new createHttpError.Conflict("Certificado ja cadastrado na Spedy, mas nao foi possivel recuperar os metadados do certificado existente.");
		}
		throw toSpedyHttpError(error, "Nao foi possivel sincronizar o certificado na Spedy.");
	}
}
