import type { TGetCouponGrantsInput, TGetCouponGrantsOutput } from "@/app/api/coupons/grants/route";
import type { TGetCouponsInput, TGetCouponsOutput } from "@/app/api/coupons/route";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useState } from "react";
import { useDebounceMemo } from "../hooks/use-debounce";

async function fetchCoupons(input: TGetCouponsInput) {
	const searchParams = new URLSearchParams();
	if (input.search) searchParams.set("search", input.search);
	if (input.activeOnly) searchParams.set("activeOnly", "true");
	if (input.page) searchParams.set("page", input.page.toString());
	const { data } = await axios.get<TGetCouponsOutput>(`/api/coupons?${searchParams.toString()}`);
	const result = data.data.default;
	if (!result) throw new Error("Cupons não encontrados.");
	return result;
}

type UseCouponsParams = {
	initialParams?: Partial<TGetCouponsInput>;
};
export function useCoupons({ initialParams }: UseCouponsParams = {}) {
	const [queryParams, setQueryParams] = useState<TGetCouponsInput>({
		id: null,
		page: initialParams?.page || 1,
		search: initialParams?.search || "",
		activeOnly: initialParams?.activeOnly || false,
	});

	function updateQueryParams(newParams: Partial<TGetCouponsInput>) {
		setQueryParams((prevParams) => ({ ...prevParams, ...newParams }));
	}
	const debouncedQueryParams = useDebounceMemo(queryParams, 500);
	return {
		...useQuery({
			queryKey: ["coupons", debouncedQueryParams],
			queryFn: () => fetchCoupons(debouncedQueryParams),
		}),
		queryKey: ["coupons", debouncedQueryParams],
		queryParams,
		updateQueryParams,
	};
}

async function fetchCouponById(id: string) {
	const { data } = await axios.get<TGetCouponsOutput>(`/api/coupons?id=${id}`);
	const result = data.data.byId;
	if (!result) throw new Error("Cupom não encontrado.");
	return result;
}

export function useCouponById({ couponId }: { couponId: string }) {
	return {
		...useQuery({
			queryKey: ["coupon-by-id", couponId],
			queryFn: () => fetchCouponById(couponId),
		}),
		queryKey: ["coupon-by-id", couponId],
	};
}

async function fetchCouponGrants(input: TGetCouponGrantsInput) {
	const searchParams = new URLSearchParams();
	searchParams.set("couponId", input.couponId);
	if (input.page) searchParams.set("page", input.page.toString());
	const { data } = await axios.get<TGetCouponGrantsOutput>(`/api/coupons/grants?${searchParams.toString()}`);
	return data.data;
}

export function useCouponGrants({ couponId }: { couponId: string }) {
	const [queryParams, setQueryParams] = useState<TGetCouponGrantsInput>({ couponId, page: 1 });

	function updateQueryParams(newParams: Partial<TGetCouponGrantsInput>) {
		setQueryParams((prevParams) => ({ ...prevParams, ...newParams }));
	}
	return {
		...useQuery({
			queryKey: ["coupon-grants", queryParams],
			queryFn: () => fetchCouponGrants(queryParams),
		}),
		queryKey: ["coupon-grants", queryParams],
		queryParams,
		updateQueryParams,
	};
}
