import { formatDateAsLocale } from "@/lib/formatting";
import { z } from "zod";

import { escapeHtml } from "./cupom-venda";

// Página de teste (finalidade TESTE) — valida o pipeline fim-a-fim: dashboard → fila →
// nudge → agent → papel. Sempre enfileirada com impressoraId fixado (bypassa o roteamento).
export const TesteImpressaoDadosSchema = z.object({
	organizacao: z.object({
		nome: z.string({
			required_error: "Nome da organização não informado para o teste.",
			invalid_type_error: "Tipo não válido para o nome da organização.",
		}),
	}),
	impressora: z.object({
		nome: z.string({
			required_error: "Nome da impressora não informado para o teste.",
			invalid_type_error: "Tipo não válido para o nome da impressora.",
		}),
	}),
	solicitadoPor: z.string({ invalid_type_error: "Tipo não válido para o solicitante." }).optional().nullable(),
	dataSolicitacao: z.coerce.date({ invalid_type_error: "Tipo não válido para a data da solicitação." }),
});
export type TTesteImpressaoDados = z.infer<typeof TesteImpressaoDadosSchema>;

export function renderTesteImpressaoHtml(dados: TTesteImpressaoDados) {
	return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8" /><style>
@page { margin: 0; }
@media print { body { margin: 0; } }
body { margin: 0; padding: 4mm; width: 72mm; box-sizing: border-box; font-family: 'Courier New', monospace; font-size: 9pt; color: #000; background: #fff; }
.centro { text-align: center; }
h1 { margin: 0; font-size: 11pt; text-transform: uppercase; }
p { margin: 0; line-height: 1.4; }
.sep { border-top: 1px dashed #000; margin: 2.5mm 0; }
.ok { font-size: 12pt; font-weight: 700; margin: 2mm 0; }
</style></head><body>
<div class="centro">
	<h1>${escapeHtml(dados.organizacao.nome)}</h1>
	<p>TESTE DE IMPRESSÃO</p>
</div>
<div class="sep"></div>
<p class="centro ok">✓ IMPRESSORA FUNCIONANDO</p>
<div class="sep"></div>
<p>Impressora: ${escapeHtml(dados.impressora.nome)}</p>
${dados.solicitadoPor ? `<p>Solicitado por: ${escapeHtml(dados.solicitadoPor)}</p>` : ""}
<p>Data: ${formatDateAsLocale(dados.dataSolicitacao, true)}</p>
<div class="sep"></div>
<p class="centro">Se você está lendo isto, o fluxo dashboard → agente → impressora está operacional.</p>
</body></html>`;
}

export function renderTesteImpressaoZpl(dados: TTesteImpressaoDados) {
	const sanitize = (value: string) => value.replace(/[\^~\\]/g, " ").trim();
	return [
		"^XA",
		"^CI28",
		`^FO30,30^A0N,36,36^FD${sanitize(dados.organizacao.nome)}^FS`,
		"^FO30,80^A0N,30,30^FDTESTE DE IMPRESSAO^FS",
		`^FO30,125^A0N,26,26^FDImpressora: ${sanitize(dados.impressora.nome)}^FS`,
		`^FO30,160^A0N,26,26^FDData: ${formatDateAsLocale(dados.dataSolicitacao, true)}^FS`,
		"^FO30,200^A0N,26,26^FDPipeline operacional.^FS",
		"^XZ",
	].join("\n");
}
