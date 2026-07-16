import { IFOOD_MERCHANT_BASE_URL } from "@/lib/data-connectors/ifood/types";
import type { AxiosInstance } from "axios";
import { mapIfoodError } from "./errors";
import {
	IfoodInterruptionResponseSchema,
	IfoodInterruptionsListResponseSchema,
	IfoodMerchantDetailsResponseSchema,
	IfoodMerchantStatusListResponseSchema,
	IfoodMerchantsListResponseSchema,
	IfoodOpeningHoursResponseSchema,
	mapIfoodInterruption,
	mapIfoodMerchantDetails,
	mapIfoodMerchantStatus,
	mapIfoodMerchantSummary,
	mapIfoodOpeningHours,
	type TIfoodInterruptionDTO,
	type TIfoodMerchantDetailsDTO,
	type TIfoodMerchantStatusDTO,
	type TIfoodMerchantSummaryDTO,
	type TIfoodOpeningShiftDTO,
	type TIfoodOpeningShiftInput,
} from "./merchant-types";

/**
 * Funções de GESTÃO da Merchant API v1.0. Todas recebem o axios client autenticado
 * (de `createIfoodClient`) e retornam DTOs mapeados — nunca o payload cru do iFood.
 */

export async function getIfoodMerchantsList(client: AxiosInstance): Promise<TIfoodMerchantSummaryDTO[]> {
	try {
		const response = await client.get<unknown>(`${IFOOD_MERCHANT_BASE_URL}/merchants`);
		const parsed = IfoodMerchantsListResponseSchema.parse(response.data);
		const merchants = Array.isArray(parsed) ? parsed : parsed.merchants;
		return merchants.map(mapIfoodMerchantSummary);
	} catch (error) {
		mapIfoodError("getIfoodMerchantsList", error);
	}
}

export async function getIfoodMerchantDetails(client: AxiosInstance, merchantId: string): Promise<TIfoodMerchantDetailsDTO> {
	try {
		const response = await client.get<unknown>(`${IFOOD_MERCHANT_BASE_URL}/merchants/${merchantId}`);
		return mapIfoodMerchantDetails(IfoodMerchantDetailsResponseSchema.parse(response.data));
	} catch (error) {
		mapIfoodError("getIfoodMerchantDetails", error);
	}
}

export async function getIfoodMerchantStatus(client: AxiosInstance, merchantId: string): Promise<TIfoodMerchantStatusDTO[]> {
	try {
		const response = await client.get<unknown>(`${IFOOD_MERCHANT_BASE_URL}/merchants/${merchantId}/status`);
		return IfoodMerchantStatusListResponseSchema.parse(response.data).map(mapIfoodMerchantStatus);
	} catch (error) {
		mapIfoodError("getIfoodMerchantStatus", error);
	}
}

export async function listIfoodInterruptions(client: AxiosInstance, merchantId: string): Promise<TIfoodInterruptionDTO[]> {
	try {
		const response = await client.get<unknown>(`${IFOOD_MERCHANT_BASE_URL}/merchants/${merchantId}/interruptions`);
		return IfoodInterruptionsListResponseSchema.parse(response.data).map(mapIfoodInterruption);
	} catch (error) {
		mapIfoodError("listIfoodInterruptions", error);
	}
}

export async function createIfoodInterruption(
	client: AxiosInstance,
	merchantId: string,
	{ descricao, inicio, fim }: { descricao: string; inicio: string; fim: string },
): Promise<TIfoodInterruptionDTO> {
	try {
		const response = await client.post<unknown>(`${IFOOD_MERCHANT_BASE_URL}/merchants/${merchantId}/interruptions`, {
			description: descricao,
			start: inicio,
			end: fim,
		});
		return mapIfoodInterruption(IfoodInterruptionResponseSchema.parse(response.data));
	} catch (error) {
		mapIfoodError("createIfoodInterruption", error);
	}
}

export async function deleteIfoodInterruption(client: AxiosInstance, merchantId: string, interruptionId: string): Promise<void> {
	try {
		await client.delete(`${IFOOD_MERCHANT_BASE_URL}/merchants/${merchantId}/interruptions/${interruptionId}`);
	} catch (error) {
		mapIfoodError("deleteIfoodInterruption", error);
	}
}

export async function getIfoodOpeningHours(client: AxiosInstance, merchantId: string): Promise<TIfoodOpeningShiftDTO[]> {
	try {
		const response = await client.get<unknown>(`${IFOOD_MERCHANT_BASE_URL}/merchants/${merchantId}/opening-hours`);
		return mapIfoodOpeningHours(IfoodOpeningHoursResponseSchema.parse(response.data));
	} catch (error) {
		mapIfoodError("getIfoodOpeningHours", error);
	}
}

export async function putIfoodOpeningHours(
	client: AxiosInstance,
	merchantId: string,
	turnos: TIfoodOpeningShiftInput[],
): Promise<TIfoodOpeningShiftDTO[]> {
	try {
		const response = await client.put<unknown>(`${IFOOD_MERCHANT_BASE_URL}/merchants/${merchantId}/opening-hours`, {
			storeId: merchantId,
			shifts: turnos.map((turno) => ({
				dayOfWeek: turno.diaSemana,
				start: turno.inicio,
				duration: turno.duracaoMinutos,
			})),
		});
		return mapIfoodOpeningHours(IfoodOpeningHoursResponseSchema.parse(response.data));
	} catch (error) {
		mapIfoodError("putIfoodOpeningHours", error);
	}
}
