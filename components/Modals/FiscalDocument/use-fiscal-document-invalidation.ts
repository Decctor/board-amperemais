"use client";

import { FISCAL_PENDING_QUERY_KEY } from "@/lib/queries/fiscal";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

/**
 * Toda operacao sobre um documento fiscal muda a lista, o proprio documento, as pendencias e a
 * venda vinculada. Um unico lugar para invalidar as quatro.
 */
export function useFiscalDocumentInvalidation(documentId: string) {
	const queryClient = useQueryClient();
	return useCallback(async () => {
		await Promise.all([
			queryClient.invalidateQueries({ queryKey: ["fiscal-documents"] }),
			queryClient.invalidateQueries({ queryKey: ["fiscal-document-by-id", documentId] }),
			queryClient.invalidateQueries({ queryKey: FISCAL_PENDING_QUERY_KEY }),
			queryClient.invalidateQueries({ queryKey: ["sales"] }),
		]);
	}, [documentId, queryClient]);
}
