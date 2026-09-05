"use client";

import { createContext, useContext, type ReactNode } from "react";

export type TFiscalUiPermissions = { visualizar: boolean; configurar: boolean; emitir: boolean; cancelar: boolean };

const NO_PERMISSIONS: TFiscalUiPermissions = { visualizar: false, configurar: false, emitir: false, cancelar: false };

const FiscalPermissionsContext = createContext<TFiscalUiPermissions>(NO_PERMISSIONS);

/**
 * Permissoes fiscais do membro para superficies profundas (card do quadro de atendimento, chips)
 * que nao recebem props da pagina. Sem provider, tudo e somente leitura.
 */
export function FiscalPermissionsProvider({ value, children }: { value: TFiscalUiPermissions; children: ReactNode }) {
	return <FiscalPermissionsContext.Provider value={value}>{children}</FiscalPermissionsContext.Provider>;
}

export function useFiscalPermissions() {
	return useContext(FiscalPermissionsContext);
}
