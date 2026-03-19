import { apiHandler } from "@/lib/api";
import {
	BulkSaleCanonicalFieldSchema,
	BulkSalesMapInputSchema,
	BulkSalesMapOutputSchema,
	type TBulkSalesMapOutput,
} from "@/state-hooks/use-bulk-create-sales";
import { generateText, gateway, Output } from "ai";
import type { NextApiHandler } from "next";
import { z } from "zod";

type TMapSalesSheetOutput = {
	data: TBulkSalesMapOutput;
	message: string;
};

const FIELD_LABELS: Record<z.infer<typeof BulkSaleCanonicalFieldSchema>, string> = {
	clienteNome: "NOME DO CLIENTE",
	clienteTelefone: "TELEFONE DO CLIENTE",
	clienteCpfCnpj: "CPF/CNPJ DO CLIENTE",
	valorTotal: "VALOR TOTAL",
	vendedorNome: "NOME DO VENDEDOR",
	parceiroNomeOuIdentificador: "NOME/IDENTIFICADOR DO PARCEIRO",
	dataVenda: "DATA DA VENDA",
};

const FIELD_SYNONYMS: Record<z.infer<typeof BulkSaleCanonicalFieldSchema>, string[]> = {
	clienteNome: ["cliente", "nome", "consumidor", "razao", "fantasia"],
	clienteTelefone: ["telefone", "celular", "fone", "whatsapp", "tel"],
	clienteCpfCnpj: ["cpf", "cnpj", "documento", "doc"],
	valorTotal: ["valor", "total", "vlr", "venda", "liquido", "bruto"],
	vendedorNome: ["vendedor", "venda", "atendente", "operador", "consultor"],
	parceiroNomeOuIdentificador: ["parceiro", "afiliado", "indicador", "representante"],
	dataVenda: ["data", "emissao", "movimento", "venda", "dt"],
};

function normalizeHeader(value: string) {
	return value
		.trim()
		.toUpperCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "");
}

function runHeuristicMapping(headers: string[]): TBulkSalesMapOutput {
	const normalizedHeaders = headers.map((header) => ({ original: header, normalized: normalizeHeader(header) }));
	const mappingDefinitions = BulkSaleCanonicalFieldSchema.options.map((field) => {
		const matched = normalizedHeaders.find((header) => FIELD_SYNONYMS[field].some((synonym) => header.normalized.includes(normalizeHeader(synonym))));

		return {
			field,
			sourceColumn: matched?.original ?? null,
			confidence: matched ? 0.55 : null,
			reason: matched ? "Mapeamento por heurística de cabeçalho." : "Nenhuma coluna equivalente detectada automaticamente.",
		};
	});

	return {
		mappingDefinitions,
		warnings: [],
	};
}

function sanitizeMapOutput({ headers, output }: { headers: string[]; output: TBulkSalesMapOutput }): TBulkSalesMapOutput {
	const headerSet = new Set(headers);
	const outputByField = new Map(output.mappingDefinitions.map((mapping) => [mapping.field, mapping]));
	const warnings = [...output.warnings];

	const mappingDefinitions = BulkSaleCanonicalFieldSchema.options.map((field) => {
		const candidate = outputByField.get(field);
		if (!candidate) {
			return {
				field,
				sourceColumn: null,
				confidence: null,
				reason: "Campo não retornado pela IA.",
			};
		}

		if (candidate.sourceColumn && !headerSet.has(candidate.sourceColumn)) {
			warnings.push(`A coluna sugerida para '${FIELD_LABELS[field]}' não existe na planilha e foi ignorada.`);
			return {
				field,
				sourceColumn: null,
				confidence: null,
				reason: "Coluna sugerida não existe na planilha.",
			};
		}

		return candidate;
	});

	return { mappingDefinitions, warnings };
}

const mapSalesSheetRoute: NextApiHandler<TMapSalesSheetOutput> = async (req, res) => {
	const input = BulkSalesMapInputSchema.parse(req.body);
	const heuristicResult = runHeuristicMapping(input.headers);

	try {
		const fieldsPrompt = BulkSaleCanonicalFieldSchema.options.map((field) => `${field} (${FIELD_LABELS[field]})`).join(", ");

		const { output } = await generateText({
			model: gateway("anthropic/claude-haiku-4.5"),
			output: Output.object({
				schema: BulkSalesMapOutputSchema,
			}),
			system:
				"Você é um especialista em mapeamento de colunas de planilhas de vendas. Responda sempre em JSON válido no schema pedido. " +
				"Escolha apenas colunas existentes. Se não tiver certeza, retorne sourceColumn = null.",
			prompt: `Mapeie os cabeçalhos para os campos canônicos: ${fieldsPrompt}.

Cabeçalhos da planilha:
${JSON.stringify(input.headers)}

Linhas de amostra:
${JSON.stringify(input.sampleRows.slice(0, 20))}
`,
		});
		console.log("[INFO] [SALES_BULK_MAPPING] AI Output", output);
		const sanitized = sanitizeMapOutput({ headers: input.headers, output });
		const parsed = BulkSalesMapOutputSchema.parse(sanitized);
		return res.status(200).json({
			data: parsed,
			message: "Mapeamento sugerido com sucesso.",
		});
	} catch (error) {
		console.error("[SALES_BULK_MAP] Erro ao mapear com IA, usando heurística.", error);
		return res.status(200).json({
			data: heuristicResult,
			message: "Mapeamento sugerido com heurística.",
		});
	}
};

export default apiHandler({
	POST: mapSalesSheetRoute,
});
