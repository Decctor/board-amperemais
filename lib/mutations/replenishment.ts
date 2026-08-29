import type { TExportReplenishmentInput } from "@/app/api/replenishment/export/route";
import type { TUpdateReplenishmentSettingsInput, TUpdateReplenishmentSettingsOutput } from "@/app/api/replenishment/settings/route";
import type { TCreateStockPositionImportOutput } from "@/app/api/replenishment/stock-imports/route";
import type { TStockPositionField } from "@/lib/replenishment/stock-position-parser";
import type { TStockPositionImport } from "@/schemas/replenishment";
import axios from "axios";

export async function updateReplenishmentSettings(input: TUpdateReplenishmentSettingsInput) {
	const { data } = await axios.put<TUpdateReplenishmentSettingsOutput>("/api/replenishment/settings", input);
	return data;
}

export async function createStockPositionImport(input: TStockPositionImport) {
	const { data } = await axios.post<TCreateStockPositionImportOutput>("/api/replenishment/stock-imports", input);
	return data;
}

export async function deleteStockPositionImport(importacaoId: string) {
	const { data } = await axios.delete<{ data: { importacaoId: string }; message: string }>(`/api/replenishment/stock-imports?id=${importacaoId}`);
	return data;
}

export type TParseStockPositionFileOutput = {
	data: {
		arquivoNome: string;
		origem: "PLANILHA" | "PDF";
		colunas: string[];
		mapeamentoSugerido: Partial<Record<TStockPositionField, string>>;
		avisos: string[];
		totalLinhas: number;
		linhas: Record<string, string | null>[];
		linhasCompletas: Record<string, string | null>[];
	};
	message: string;
};

export async function parseStockPositionFile(file: File) {
	const formData = new FormData();
	formData.append("file", file);
	const { data } = await axios.post<TParseStockPositionFileOutput>("/api/replenishment/stock-imports/parse", formData, {
		// A leitura de um PDF de várias páginas é feita no servidor e pode passar do timeout padrão.
		timeout: 120_000,
	});
	return data;
}

// Com responseType "blob" o corpo de erro também chega como Blob, e o interceptador de erros da
// aplicação mostraria "[object Blob]" no toast. Traduzimos de volta para a mensagem do servidor.
async function readBlobErrorMessage(error: unknown): Promise<string | null> {
	if (!axios.isAxiosError(error)) return null;
	const data = error.response?.data;
	if (!(data instanceof Blob)) return null;
	try {
		const parsed = JSON.parse(await data.text());
		return parsed?.error?.message ?? null;
	} catch {
		return null;
	}
}

// A exportação devolve o binário do .xlsx: o download é disparado aqui e não há JSON de resposta.
export async function exportReplenishmentQuotation({ searchParams, input }: { searchParams: URLSearchParams; input: TExportReplenishmentInput }) {
	const response = await axios
		.post<Blob>(`/api/replenishment/export?${searchParams.toString()}`, input, { responseType: "blob", timeout: 120_000 })
		.catch(async (error) => {
			const message = await readBlobErrorMessage(error);
			throw message ? new Error(message) : error;
		});
	const { data, headers } = response;

	const disposition = String(headers["content-disposition"] ?? "");
	const fileName = disposition.match(/filename="?([^"]+)"?/)?.[1] ?? `cotacao-reposicao-${new Date().toISOString().slice(0, 10)}.xlsx`;

	const url = URL.createObjectURL(data);
	const link = document.createElement("a");
	link.href = url;
	link.download = fileName;
	link.click();
	URL.revokeObjectURL(url);

	return { fileName };
}
