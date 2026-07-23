import { formatDateAsLocale } from "@/lib/formatting";
import { z } from "zod";

import { escapeHtml } from "./cupom-venda";

// Etiqueta de produção/lote (finalidade ETIQUETA_LOTE) — layout v1 para etiqueta ~60x80mm.
// Dois renderers: HTML (impressora via driver do SO) e ZPL (térmica de rede, TCP 9100).
// O formato do job decide qual usar; o claim só roteia para impressora de driver compatível.
export const EtiquetaLoteDadosSchema = z.object({
	organizacao: z.object({
		nome: z.string({
			required_error: "Nome da organização não informado para a etiqueta.",
			invalid_type_error: "Tipo não válido para o nome da organização.",
		}),
	}),
	etiqueta: z.object({
		produtoNome: z.string({
			required_error: "Nome do produto não informado para a etiqueta.",
			invalid_type_error: "Tipo não válido para o nome do produto.",
		}),
		loteCodigo: z.string({
			required_error: "Código do lote não informado para a etiqueta.",
			invalid_type_error: "Tipo não válido para o código do lote.",
		}),
		dataFabricacao: z.coerce.date({ invalid_type_error: "Tipo não válido para a data de fabricação." }).optional().nullable(),
		dataValidade: z.coerce.date({ invalid_type_error: "Tipo não válido para a data de validade." }).optional().nullable(),
		quantidade: z.number({ invalid_type_error: "Tipo não válido para a quantidade." }).optional().nullable(),
		unidade: z.string({ invalid_type_error: "Tipo não válido para a unidade." }).optional().nullable(),
	}),
});
export type TEtiquetaLoteDados = z.infer<typeof EtiquetaLoteDadosSchema>;

export function renderEtiquetaLoteHtml(dados: TEtiquetaLoteDados) {
	const { organizacao, etiqueta } = dados;
	const quantidadeLinha = etiqueta.quantidade != null ? `${etiqueta.quantidade}${etiqueta.unidade ? ` ${escapeHtml(etiqueta.unidade)}` : ""}` : null;

	return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8" /><style>
@page { margin: 0; }
@media print { body { margin: 0; } }
body { margin: 0; padding: 3mm; font-family: Arial, sans-serif; color: #000; background: #fff; }
.etiqueta { width: 60mm; min-height: 40mm; box-sizing: border-box; display: flex; flex-direction: column; gap: 1.5mm; page-break-inside: avoid; }
h1 { margin: 0; font-size: 12pt; line-height: 1.1; text-transform: uppercase; }
p { margin: 0; font-size: 9pt; line-height: 1.3; }
.lote { font-size: 11pt; font-weight: 700; }
.org { margin-top: auto; font-size: 7pt; text-transform: uppercase; }
</style></head><body><section class="etiqueta">
<h1>${escapeHtml(etiqueta.produtoNome)}</h1>
<p class="lote">Lote: ${escapeHtml(etiqueta.loteCodigo)}</p>
${etiqueta.dataFabricacao ? `<p>Fabricação: ${formatDateAsLocale(etiqueta.dataFabricacao)}</p>` : ""}
${etiqueta.dataValidade ? `<p>Validade: ${formatDateAsLocale(etiqueta.dataValidade)}</p>` : ""}
${quantidadeLinha ? `<p>Quantidade: ${quantidadeLinha}</p>` : ""}
<p class="org">${escapeHtml(organizacao.nome)}</p>
</section></body></html>`;
}

// ZPL usa ^FD literal — remover os caracteres de controle da linguagem para não quebrar o comando.
function sanitizeZplField(value: string) {
	return value.replace(/[\^~\\]/g, " ").trim();
}

export function renderEtiquetaLoteZpl(dados: TEtiquetaLoteDados) {
	const { organizacao, etiqueta } = dados;
	const linhas: string[] = ["^XA", "^CI28"];
	let posicaoY = 30;
	const adicionarLinha = (conteudo: string, altura: number, avanco: number) => {
		linhas.push(`^FO30,${posicaoY}^A0N,${altura},${altura}^FD${sanitizeZplField(conteudo)}^FS`);
		posicaoY += avanco;
	};

	adicionarLinha(etiqueta.produtoNome, 38, 48);
	adicionarLinha(`Lote: ${etiqueta.loteCodigo}`, 32, 42);
	if (etiqueta.dataFabricacao) adicionarLinha(`Fab: ${formatDateAsLocale(etiqueta.dataFabricacao)}`, 26, 34);
	if (etiqueta.dataValidade) adicionarLinha(`Val: ${formatDateAsLocale(etiqueta.dataValidade)}`, 26, 34);
	if (etiqueta.quantidade != null) adicionarLinha(`Qtd: ${etiqueta.quantidade}${etiqueta.unidade ? ` ${etiqueta.unidade}` : ""}`, 26, 34);
	adicionarLinha(organizacao.nome, 22, 30);
	linhas.push("^XZ");
	return linhas.join("\n");
}
