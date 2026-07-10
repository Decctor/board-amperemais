import { gateway, generateText, Output } from "ai";
import { z } from "zod";

export const IMPORT_COMPOSITION_ALLOWED_MIME_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp"] as const;
export type TImportCompositionMimeType = (typeof IMPORT_COMPOSITION_ALLOWED_MIME_TYPES)[number];

export const ExtractedCompositionItemSchema = z.object({
	descricao: z.string({ invalid_type_error: "Tipo não válido para a descrição do item extraído." }),
	codigoFornecedor: z.string({ invalid_type_error: "Tipo não válido para o código do item no fornecedor." }).nullable(),
	ean: z.string({ invalid_type_error: "Tipo não válido para o EAN do item extraído." }).nullable(),
	unidade: z.string({ invalid_type_error: "Tipo não válido para a unidade do item extraído." }).nullable(),
	quantidade: z.number({ invalid_type_error: "Tipo não válido para a quantidade do item extraído." }),
	valorUnitario: z.number({ invalid_type_error: "Tipo não válido para o valor unitário do item extraído." }),
	valorTotal: z.number({ invalid_type_error: "Tipo não válido para o valor total do item extraído." }),
	desconto: z.number({ invalid_type_error: "Tipo não válido para o desconto do item extraído." }).nullable(),
});
export type TExtractedCompositionItem = z.infer<typeof ExtractedCompositionItemSchema>;

export const ExtractedCompositionSchema = z.object({
	fornecedor: z
		.object({
			nome: z.string({ invalid_type_error: "Tipo não válido para o nome do fornecedor extraído." }).nullable(),
			cnpj: z.string({ invalid_type_error: "Tipo não válido para o CNPJ do fornecedor extraído." }).nullable(),
		})
		.nullable(),
	itens: z.array(ExtractedCompositionItemSchema),
});
export type TExtractedComposition = z.infer<typeof ExtractedCompositionSchema>;

const EXTRACTION_SYSTEM_PROMPT = `Você é um especialista em leitura de documentos fiscais brasileiros: NF-e (DANFE), NFC-e, cupons fiscais e recibos de compra.
Sua tarefa é extrair o EMITENTE (fornecedor) e a lista COMPLETA de itens do documento anexado, no schema JSON pedido.

Regras:
- Extraia TODOS os itens do documento, na ordem em que aparecem. Não resuma nem agrupe.
- "descricao" é a descrição do produto exatamente como impressa no documento.
- "codigoFornecedor" é o código do produto usado pelo emitente (coluna CÓDIGO/COD/REF do DANFE). Se não houver, null.
- "ean" é o código de barras GTIN/EAN quando visível (13 ou 8 dígitos, às vezes na coluna própria). Se não houver, null.
- "unidade" é a unidade comercial (UN, KG, CX, PC, LT...). Se não houver, null.
- "quantidade" e "valorUnitario" são os valores comerciais da linha. "valorTotal" é o total da linha.
- Valores monetários em número decimal (ponto como separador). Ex: "1.234,56" vira 1234.56.
- "desconto" é o desconto da linha quando destacado; senão null.
- "fornecedor" é o EMITENTE do documento (quem vendeu), nunca o destinatário. CNPJ apenas com dígitos. Se ilegível, use null nos campos.
- Se o documento não for uma nota/cupom de compra ou estiver ilegível, retorne itens: [].`;

// Sonnet for document vision quality; the cheaper mapping step (match-products) uses Haiku.
const EXTRACTION_MODEL = "anthropic/claude-sonnet-4.5";

export async function extractCompositionFromFile({ dataBase64, mimeType }: { dataBase64: string; mimeType: TImportCompositionMimeType }) {
	const buffer = Buffer.from(dataBase64, "base64");

	const filePart =
		mimeType === "application/pdf"
			? ({ type: "file", data: buffer, mediaType: "application/pdf" } as const)
			: ({ type: "image", image: buffer, mediaType: mimeType } as const);

	const { output } = await generateText({
		model: gateway(EXTRACTION_MODEL),
		output: Output.object({ schema: ExtractedCompositionSchema }),
		system: EXTRACTION_SYSTEM_PROMPT,
		messages: [
			{
				role: "user",
				content: [{ type: "text", text: "Extraia o fornecedor e a composição de itens deste documento fiscal." }, filePart],
			},
		],
	});

	return ExtractedCompositionSchema.parse(output);
}
