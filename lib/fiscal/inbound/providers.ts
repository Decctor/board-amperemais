import { createNuvemFiscalClient } from "../providers/nuvem-fiscal/client";
import type { TFiscalOrganization } from "../types";
import { MANIFEST_EVENT_CODES, type IFiscalInboundProvider, type TInboundDistribuicaoResult, type TInboundManifestInput, type TInboundManifestResult } from "./types";

// Provider manual / fallback: nao consulta distribuicao.
class ManualInboundProvider implements IFiscalInboundProvider {
	async consultarDistribuicao(input: { ultNSU: string }): Promise<TInboundDistribuicaoResult> {
		return { ultNSU: input.ultNSU, maxNSU: input.ultNSU, documentos: [] };
	}
	async manifestarDocumento(): Promise<TInboundManifestResult> {
		return { registrado: true, protocolo: null, mensagens: ["Manifestacao registrada (manual)."] };
	}
}

// Nota: os endpoints/campos de Distribuicao DF-e da Nuvem Fiscal precisam de confirmacao em sandbox
// (a doc bloqueia leitura automatizada). A estrutura abaixo isola o mapeamento num unico lugar.
type TNuvemDistribuicaoResponse = {
	ult_nsu?: string;
	max_nsu?: string;
	documentos?: Array<{
		nsu?: string;
		chave?: string;
		tipo?: string; // "resumo" | "completo"
		emitente?: { cpf_cnpj?: string; nome?: string };
		valor?: number;
		data_emissao?: string;
		situacao?: string;
		xml?: string; // base64 quando completo
	}>;
};

function base64ToArrayBuffer(base64: string): ArrayBuffer {
	const binary = Buffer.from(base64, "base64");
	return binary.buffer.slice(binary.byteOffset, binary.byteOffset + binary.byteLength);
}

class NuvemFiscalInboundProvider implements IFiscalInboundProvider {
	async consultarDistribuicao(input: { ultNSU: string }, organizacao: TFiscalOrganization): Promise<TInboundDistribuicaoResult> {
		const fiscalConfig = organizacao.fiscalConfiguracao;
		const cnpj = (fiscalConfig?.cpfCnpj ?? "").replace(/\D/g, "");
		const client = createNuvemFiscalClient({ apiToken: fiscalConfig?.nuvemFiscal.api.apiToken, ambiente: fiscalConfig?.ambiente });
		const { data } = await client.get<TNuvemDistribuicaoResponse>(`/distribuicao/nfe?cpf_cnpj=${cnpj}&ult_nsu=${input.ultNSU}`);

		const documentos = (data.documentos ?? []).map((doc) => {
			const completo = doc.tipo === "completo" && !!doc.xml;
			return {
				nsu: doc.nsu ?? "0",
				chaveAcesso: doc.chave ?? "",
				completo,
				emitenteCnpj: doc.emitente?.cpf_cnpj ?? null,
				emitenteNome: doc.emitente?.nome ?? null,
				valorTotal: doc.valor ?? null,
				dataEmissao: doc.data_emissao ? new Date(doc.data_emissao) : null,
				situacao: doc.situacao ?? null,
				xml: completo && doc.xml ? base64ToArrayBuffer(doc.xml) : null,
				resumoPayload: completo ? null : (doc as Record<string, unknown>),
			};
		});

		return { ultNSU: data.ult_nsu ?? input.ultNSU, maxNSU: data.max_nsu ?? data.ult_nsu ?? input.ultNSU, documentos };
	}

	async manifestarDocumento(input: TInboundManifestInput, organizacao: TFiscalOrganization): Promise<TInboundManifestResult> {
		const fiscalConfig = organizacao.fiscalConfiguracao;
		const cnpj = (fiscalConfig?.cpfCnpj ?? "").replace(/\D/g, "");
		const client = createNuvemFiscalClient({ apiToken: fiscalConfig?.nuvemFiscal.api.apiToken, ambiente: fiscalConfig?.ambiente });
		const { data } = await client.post<{ numero_protocolo?: string; motivo_status?: string }>("/distribuicao/nfe/manifestacoes", {
			cpf_cnpj: cnpj,
			chave: input.chaveAcesso,
			tipo_evento: MANIFEST_EVENT_CODES[input.evento],
			justificativa: input.justificativa ?? undefined,
		});
		return { registrado: true, protocolo: data.numero_protocolo ?? null, mensagens: data.motivo_status ? [data.motivo_status] : [] };
	}
}

export function resolveInboundProvider(fiscalProvedor: "MANUAL" | "NUVEM_FISCAL" | null | undefined): IFiscalInboundProvider {
	return fiscalProvedor === "NUVEM_FISCAL" ? new NuvemFiscalInboundProvider() : new ManualInboundProvider();
}
