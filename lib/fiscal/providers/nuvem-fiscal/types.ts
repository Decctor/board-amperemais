export type TNuvemFiscalDfeResponse = {
	id: string;
	status: "pendente" | "autorizado" | "rejeitado" | "denegado" | "encerrado" | "cancelado" | "erro";
	ambiente: "homologacao" | "producao";
	chave?: string;
	numero?: number;
	serie?: number;
	data_emissao?: string;
	autorizacao?: {
		protocolo?: string;
		data_recebimento?: string;
	};
	mensagens?: unknown[];
};

export type TNuvemFiscalCancelResponse = {
	status: "pendente" | "registrado" | "rejeitado" | "erro";
	numero_protocolo?: string;
	data_recebimento?: string;
	motivo_status?: string;
};

