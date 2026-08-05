import type { TCustomFieldValue, TCustomFieldValueInput } from "@/schemas/custom-fields";
import type { DBTransaction } from "@/services/drizzle";
import { clientCustomFieldValues, clients, customFields } from "@/services/drizzle/schema";
import { and, eq, inArray } from "drizzle-orm";
import createHttpError from "http-errors";
import { type TNativeCustomFieldWriteThrough, resolveNativeCustomField } from "./native-catalog";

type TCustomFieldDefinition = typeof customFields.$inferSelect;

/**
 * Normaliza e valida um valor contra a definição do campo. Devolve o valor no formato canônico
 * que será gravado (jsonb ou coluna real): DATA vira ISO string, NUMERO vira number, escolhas
 * ficam restritas às opções declaradas.
 */
function parseValueForField({ field, valor }: { field: TCustomFieldDefinition; valor: TCustomFieldValue }): TCustomFieldValue {
	const optionValues = (field.opcoes ?? []).map((option) => option.valor);

	switch (field.tipo) {
		case "ESCOLHA_UNICA": {
			if (typeof valor !== "string") throw new createHttpError.BadRequest(`O campo "${field.titulo}" espera uma única opção.`);
			if (!optionValues.includes(valor)) throw new createHttpError.BadRequest(`Opção inválida para o campo "${field.titulo}".`);
			return valor;
		}
		case "ESCOLHA_MULTIPLA": {
			if (!Array.isArray(valor)) throw new createHttpError.BadRequest(`O campo "${field.titulo}" espera uma lista de opções.`);
			for (const item of valor) {
				if (typeof item !== "string" || !optionValues.includes(item)) {
					throw new createHttpError.BadRequest(`Opção inválida para o campo "${field.titulo}".`);
				}
			}
			// Duplicatas viram ruído em contagens de segmentação; a ordem declarada é a canônica.
			return optionValues.filter((option) => valor.includes(option));
		}
		case "TEXTO": {
			if (typeof valor !== "string") throw new createHttpError.BadRequest(`O campo "${field.titulo}" espera um texto.`);
			const trimmedValue = valor.trim();
			if (!trimmedValue) throw new createHttpError.BadRequest(`O campo "${field.titulo}" não pode ficar vazio.`);
			return trimmedValue;
		}
		case "NUMERO": {
			const numericValue = typeof valor === "number" ? valor : typeof valor === "string" ? Number(valor) : Number.NaN;
			if (!Number.isFinite(numericValue)) throw new createHttpError.BadRequest(`O campo "${field.titulo}" espera um número.`);
			return numericValue;
		}
		case "DATA": {
			if (typeof valor !== "string") throw new createHttpError.BadRequest(`O campo "${field.titulo}" espera uma data.`);
			const parsedDate = new Date(valor);
			if (Number.isNaN(parsedDate.getTime())) throw new createHttpError.BadRequest(`Data inválida para o campo "${field.titulo}".`);
			return parsedDate.toISOString();
		}
		default:
			throw new createHttpError.BadRequest(`Tipo não suportado para o campo "${field.titulo}".`);
	}
}

type SaveClientCustomFieldValuesParams = {
	trx: DBTransaction;
	organizacaoId: string;
	clienteId: string;
	valores: TCustomFieldValueInput[];
};

/**
 * Ponto de escrita único dos campos personalizados de um cliente. Toda superfície (assistente de
 * cadastro do ponto de interação, edição no CRM, importações) passa por aqui, para que a
 * validação e o write-through existam em um lugar só.
 *
 * Rejeita: campo inexistente, campo de outra organização, campo inativo, campo de outra entidade,
 * `campoId` repetido no mesmo payload e valor incompatível com o tipo/opções da definição.
 *
 * Campos nativos com `writeThrough` são gravados na coluna real de `clients` EM VEZ DE gerar
 * linha em `client_custom_field_values` — duas cópias do mesmo dado divergiriam.
 */
export async function saveClientCustomFieldValues({ trx, organizacaoId, clienteId, valores }: SaveClientCustomFieldValuesParams) {
	if (valores.length === 0) return { valoresGravados: 0, colunasAtualizadas: [] as TNativeCustomFieldWriteThrough[] };

	const fieldIds = valores.map((entry) => entry.campoId);
	const duplicatedFieldId = fieldIds.find((fieldId, index) => fieldIds.indexOf(fieldId) !== index);
	if (duplicatedFieldId) throw new createHttpError.BadRequest("O mesmo campo personalizado foi informado mais de uma vez.");

	const fieldDefinitions = await trx
		.select()
		.from(customFields)
		.where(and(eq(customFields.organizacaoId, organizacaoId), inArray(customFields.id, fieldIds)));
	const fieldDefinitionsById = new Map(fieldDefinitions.map((field) => [field.id, field]));

	const rowsToUpsert: (typeof clientCustomFieldValues.$inferInsert)[] = [];
	// Tipado por coluna (e não como Record<chave, unknown>) para que o UPDATE continue checado.
	const clientPatch: { dataNascimento?: Date; email?: string } = {};

	for (const entry of valores) {
		const field = fieldDefinitionsById.get(entry.campoId);
		if (!field) throw new createHttpError.NotFound("Campo personalizado não encontrado para essa organização.");
		if (!field.ativo) throw new createHttpError.BadRequest(`O campo "${field.titulo}" está inativo e não aceita novos valores.`);
		if (field.entidade !== "CLIENTE") throw new createHttpError.BadRequest(`O campo "${field.titulo}" não pertence à entidade cliente.`);

		const parsedValue = parseValueForField({ field, valor: entry.valor });
		const nativeField = resolveNativeCustomField(field.chaveNativa);

		if (nativeField?.writeThrough === "dataNascimento") {
			clientPatch.dataNascimento = new Date(parsedValue as string);
			continue;
		}
		if (nativeField?.writeThrough === "email") {
			clientPatch.email = parsedValue as string;
			continue;
		}

		rowsToUpsert.push({ organizacaoId, clienteId, campoId: field.id, valor: parsedValue });
	}

	// Um upsert por linha: cada campo tem um `valor` próprio, então um único INSERT ... VALUES
	// exigiria `excluded.valor` no SET. Os payloads são de poucos campos — a clareza vence.
	for (const row of rowsToUpsert) {
		await trx
			.insert(clientCustomFieldValues)
			.values(row)
			.onConflictDoUpdate({
				target: [clientCustomFieldValues.clienteId, clientCustomFieldValues.campoId],
				set: { valor: row.valor, dataAtualizacao: new Date() },
			});
	}

	const updatedColumns = Object.keys(clientPatch) as TNativeCustomFieldWriteThrough[];
	if (updatedColumns.length > 0) {
		// `clients` não tem coluna de atualização — só as colunas alvo do write-through mudam.
		await trx
			.update(clients)
			.set(clientPatch)
			.where(and(eq(clients.id, clienteId), eq(clients.organizacaoId, organizacaoId)));
	}

	return { valoresGravados: rowsToUpsert.length, colunasAtualizadas: updatedColumns };
}
