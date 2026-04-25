import { OnlineSoftwareSaleImportationSchema } from "@/schemas/online-importation.schema";
import axios from "axios";
import dayjs from "dayjs";
import { z } from "zod";
import type { TCanonicalImportWindow } from "../types";
import { toCanonicalOnlineSoftwareImportBatch } from "./mappers";
import { ONLINE_SOFTWARE_SALES_API_URL, type TOnlineSoftwareConfig, type TOnlineSoftwareSalesApiResponse } from "./types";

function formatOnlineSoftwareDate(date: Date) {
	return dayjs(date).format("DDMMYYYY");
}

export async function fetchOnlineSoftwareSales(config: TOnlineSoftwareConfig, window: TCanonicalImportWindow) {
	const { data } = await axios.post<TOnlineSoftwareSalesApiResponse>(ONLINE_SOFTWARE_SALES_API_URL, {
		token: config.token,
		rotina: "listarVendas001",
		dtinicio: formatOnlineSoftwareDate(window.startDate),
		dtfim: formatOnlineSoftwareDate(window.endDate),
	});

	return z
		.array(OnlineSoftwareSaleImportationSchema, {
			required_error: "Payload da Online não é uma lista.",
			invalid_type_error: "Tipo não permitido para o payload.",
		})
		.parse(data.resultado);
}

export async function fetchOnlineSoftwareImportBatch({
	organizationId,
	config,
	window,
}: {
	organizationId: string;
	config: TOnlineSoftwareConfig;
	window: TCanonicalImportWindow;
}) {
	const sales = await fetchOnlineSoftwareSales(config, window);
	return toCanonicalOnlineSoftwareImportBatch({ organizationId, window, sales });
}

export * from "./mappers";
export * from "./types";
