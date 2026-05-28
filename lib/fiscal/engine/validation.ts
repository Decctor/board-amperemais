import type { TFiscalValidationError, TItemTaxResult } from "./types";

// Agrega os erros/avisos de todos os itens de um documento.
export function aggregateItemErrors(results: TItemTaxResult[]): TFiscalValidationError[] {
	return results.flatMap((result) => result.erros);
}

// Ha erro impeditivo (severidade ERRO) que deve bloquear o envio ao provedor.
export function hasBlockingErrors(errors: TFiscalValidationError[]): boolean {
	return errors.some((error) => error.severidade === "ERRO");
}

// Mensagens legiveis para persistir no documento fiscal / exibir ao operador.
export function formatValidationMessages(errors: TFiscalValidationError[]): string[] {
	return errors.map((error) => {
		const escopo = error.produtoId ? ` (produto ${error.produtoId})` : "";
		return `[${error.severidade}] ${error.codigo}: ${error.mensagem}${escopo}`;
	});
}
