import type { IFiscalInboundProvider, TInboundDistribuicaoResult, TInboundManifestResult } from "./types";

class ManualInboundProvider implements IFiscalInboundProvider {
	async consultarDistribuicao(input: { ultNSU: string }): Promise<TInboundDistribuicaoResult> {
		return { ultNSU: input.ultNSU, maxNSU: input.ultNSU, documentos: [] };
	}

	async manifestarDocumento(): Promise<TInboundManifestResult> {
		return { registrado: true, protocolo: null, mensagens: ["Manifestacao registrada (manual)."] };
	}
}

// A OpenAPI Spedy disponivel cobre emissao/cadastro, mas nao distribuicao DF-e recebida.
// Mantemos o inbound como manual ate mapear essa parte com a Spedy.
export function resolveInboundProvider(): IFiscalInboundProvider {
	return new ManualInboundProvider();
}
