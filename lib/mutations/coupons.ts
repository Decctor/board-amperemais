import type { TCreateCouponGrantsInput, TCreateCouponGrantsOutput, TDeleteCouponGrantOutput } from "@/app/api/coupons/grants/route";
import type { TCreateCouponInput, TCreateCouponOutput, TDeleteCouponOutput, TUpdateCouponInput, TUpdateCouponOutput } from "@/app/api/coupons/route";
import axios from "axios";

export async function createCoupon(input: TCreateCouponInput) {
	const { data } = await axios.post<TCreateCouponOutput>("/api/coupons", input);
	return data;
}

export async function updateCoupon(input: TUpdateCouponInput) {
	const { data } = await axios.put<TUpdateCouponOutput>("/api/coupons", input);
	return data;
}

export async function deleteCoupon(input: { id: string }) {
	const { data } = await axios.delete<TDeleteCouponOutput>(`/api/coupons?id=${input.id}`);
	return data;
}

export async function createCouponGrants(input: TCreateCouponGrantsInput) {
	const { data } = await axios.post<TCreateCouponGrantsOutput>("/api/coupons/grants", input);
	return data;
}

export async function deleteCouponGrant(input: { id: string }) {
	const { data } = await axios.delete<TDeleteCouponGrantOutput>(`/api/coupons/grants?id=${input.id}`);
	return data;
}
