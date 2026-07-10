import type { TGetActionApprovalsOutput } from "@/app/api/action-approvals/route";
import type { TGetSaleDiscountContextOutput } from "@/app/api/pos/sales/discount-context/route";
import type { TActionApprovalStatusEnum } from "@/schemas/enums";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

async function fetchActionApprovals(status: TActionApprovalStatusEnum) {
	const searchParams = new URLSearchParams();
	searchParams.set("status", status);
	const { data } = await axios.get<TGetActionApprovalsOutput>(`/api/action-approvals?${searchParams.toString()}`);
	return data.data.default ?? [];
}

export function useActionApprovals({ status = "PENDENTE" }: { status?: TActionApprovalStatusEnum } = {}) {
	const queryKey = ["action-approvals", status];
	return {
		...useQuery({ queryKey, queryFn: () => fetchActionApprovals(status) }),
		queryKey,
	};
}

async function fetchActionApprovalById(requestId: string) {
	const { data } = await axios.get<TGetActionApprovalsOutput>(`/api/action-approvals?id=${requestId}`);
	const result = data.data.byId;
	if (!result) throw new Error("Solicitação de aprovação não encontrada.");
	return result;
}

export function useActionApprovalById({
	requestId,
	enabled = true,
	refetchInterval,
}: {
	requestId: string | null;
	enabled?: boolean;
	refetchInterval?: number;
}) {
	const queryKey = ["action-approval-by-id", requestId];
	return {
		...useQuery({
			queryKey,
			queryFn: () => fetchActionApprovalById(requestId as string),
			enabled: enabled && !!requestId,
			refetchInterval,
		}),
		queryKey,
	};
}

async function fetchSaleDiscountContext(vendedorId: string | null) {
	const searchParams = new URLSearchParams();
	if (vendedorId) searchParams.set("vendedorId", vendedorId);
	const { data } = await axios.get<TGetSaleDiscountContextOutput>(`/api/pos/sales/discount-context?${searchParams.toString()}`);
	return data.data;
}

/** Autoridade de desconto da identidade avaliada (vendedor selecionado no PDV) para feedback imediato. */
export function useSaleDiscountContext({ vendedorId }: { vendedorId: string | null }) {
	const queryKey = ["sale-discount-context", vendedorId];
	return {
		...useQuery({ queryKey, queryFn: () => fetchSaleDiscountContext(vendedorId) }),
		queryKey,
	};
}
