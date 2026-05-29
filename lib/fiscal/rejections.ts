// Catalogo de rejeicoes SEFAZ (cStat) — constante na codebase, sem tabela.
// Para adicionar/editar entradas, basta alterar este mapa.
// Fonte dos codigos: Manual de Orientacao do Contribuinte (MOC) / Notas Tecnicas NF-e.

export type TFiscalRejectionCategory = "CADASTRO" | "TRIBUTARIO" | "CERTIFICADO" | "NUMERACAO" | "SCHEMA" | "DUPLICIDADE" | "INFRAESTRUTURA" | "OUTRO";

export type TFiscalRejectionInfo = {
	descricao: string;
	causaProvavel: string;
	acaoSugerida: string;
	categoria: TFiscalRejectionCategory;
	// Indica se, apos corrigir a causa, o documento pode ser reenviado com a mesma numeracao.
	reenviavel: boolean;
};

export const FISCAL_REJECTION_CATALOG: Record<string, TFiscalRejectionInfo> = {
	"204": {
		descricao: "Duplicidade de NF-e",
		causaProvavel: "Ja existe uma NF-e autorizada com a mesma chave de acesso (mesma numeracao/serie).",
		acaoSugerida: "Verifique se a nota ja foi autorizada. Se necessario, avance a numeracao da serie.",
		categoria: "DUPLICIDADE",
		reenviavel: false,
	},
	"215": {
		descricao: "Falha no schema XML",
		causaProvavel: "Estrutura do XML invalida ou campo fora do padrao do leiaute.",
		acaoSugerida: "Revise o payload do documento (campos obrigatorios/formatos). Erro de integracao.",
		categoria: "SCHEMA",
		reenviavel: true,
	},
	"225": {
		descricao: "Falha no schema XML do lote",
		causaProvavel: "Estrutura do XML invalida.",
		acaoSugerida: "Revise o payload do documento. Erro de integracao.",
		categoria: "SCHEMA",
		reenviavel: true,
	},
	"233": {
		descricao: "Inscricao Estadual do destinatario nao informada/invalida",
		causaProvavel: "Destinatario contribuinte sem IE valida.",
		acaoSugerida: "Cadastre a IE do cliente ou ajuste o indicador de IE do destinatario.",
		categoria: "CADASTRO",
		reenviavel: true,
	},
	"280": {
		descricao: "Certificado digital invalido",
		causaProvavel: "Certificado vencido, revogado ou nao habilitado.",
		acaoSugerida: "Atualize o certificado digital nas configuracoes fiscais.",
		categoria: "CERTIFICADO",
		reenviavel: true,
	},
	"281": {
		descricao: "Certificado digital - data de validade",
		causaProvavel: "Certificado fora do periodo de validade.",
		acaoSugerida: "Renove e reenvie o certificado digital.",
		categoria: "CERTIFICADO",
		reenviavel: true,
	},
	"301": {
		descricao: "Irregularidade fiscal do emitente",
		causaProvavel: "Emitente com pendencia/irregularidade cadastral na SEFAZ.",
		acaoSugerida: "Regularize a situacao fiscal do emitente junto a SEFAZ.",
		categoria: "CADASTRO",
		reenviavel: true,
	},
	"302": {
		descricao: "Irregularidade fiscal do destinatario",
		causaProvavel: "Destinatario com irregularidade cadastral.",
		acaoSugerida: "Verifique a situacao cadastral do cliente.",
		categoria: "CADASTRO",
		reenviavel: true,
	},
	"539": {
		descricao: "Duplicidade de NF-e com chave diferente",
		causaProvavel: "Chave de acesso ja utilizada com dados divergentes.",
		acaoSugerida: "Avance a numeracao e reemita.",
		categoria: "DUPLICIDADE",
		reenviavel: false,
	},
	"610": {
		descricao: "Total do ICMS difere do somatorio dos itens",
		causaProvavel: "Inconsistencia entre os valores de ICMS dos itens e o total.",
		acaoSugerida: "Revise o calculo de ICMS do grupo tributario dos produtos.",
		categoria: "TRIBUTARIO",
		reenviavel: true,
	},
	"685": {
		descricao: "Total do Valor Aproximado dos Tributos difere do somatorio dos itens",
		causaProvavel: "vTotTrib do total nao bate com a soma dos itens (Lei 12.741 / IBPT).",
		acaoSugerida: "Verifique a tabela IBPT e o calculo do vTotTrib por item.",
		categoria: "TRIBUTARIO",
		reenviavel: true,
	},
	"778": {
		descricao: "NCM inexistente",
		causaProvavel: "NCM informado nao consta na tabela vigente.",
		acaoSugerida: "Corrija o NCM no perfil fiscal do produto.",
		categoria: "CADASTRO",
		reenviavel: true,
	},
};

const FALLBACK_REJECTION: TFiscalRejectionInfo = {
	descricao: "Rejeicao nao catalogada",
	causaProvavel: "Codigo de rejeicao nao mapeado no catalogo interno.",
	acaoSugerida: "Consulte a mensagem retornada pela SEFAZ para o motivo detalhado.",
	categoria: "OUTRO",
	reenviavel: true,
};

// Retorna a informacao do catalogo para um codigo (cStat), ou um fallback generico.
export function getFiscalRejectionInfo(codigo: string | null | undefined): TFiscalRejectionInfo | null {
	if (!codigo) return null;
	return FISCAL_REJECTION_CATALOG[codigo.trim()] ?? FALLBACK_REJECTION;
}
