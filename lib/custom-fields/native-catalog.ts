import type { TCustomFieldOption } from "@/schemas/custom-fields";
import type { TCustomFieldTypeEnum } from "@/schemas/enums";

/**
 * Colunas reais de `clients` que um campo nativo pode alimentar. Quando um campo tem
 * `writeThrough`, o valor é gravado NA COLUNA e nenhuma linha de `client_custom_field_values` é
 * criada — a fonte da verdade continua única, e o resto da plataforma (aniversariantes, disparos
 * por e-mail) enxerga o dado sem saber que ele entrou por um campo personalizado.
 */
export type TNativeCustomFieldWriteThrough = "dataNascimento" | "email";

export type TNativeCustomField = {
	/** Chave kebab-case, estável, gravada em `custom_fields.chave_nativa`. */
	chave: string;
	tipo: TCustomFieldTypeEnum;
	titulo: string;
	descricao?: string;
	opcoes?: TCustomFieldOption[];
	writeThrough?: TNativeCustomFieldWriteThrough;
};

/**
 * Catálogo de campos que a plataforma conhece de fábrica, indexado pela `chaveNativa`.
 *
 * Um campo nativo só passa a existir para uma organização quando ela o ativa (uma linha em
 * `custom_fields` apontando para a chave); este registro é apenas a semente de `titulo`, `tipo` e
 * `opcoes`, e o contrato semântico que permite segmentação e write-through prontos.
 */
export const NATIVE_CUSTOM_FIELDS = {
	gender: {
		chave: "gender",
		tipo: "ESCOLHA_UNICA",
		titulo: "Gênero",
		descricao: "Como o cliente se identifica.",
		// `icone` usa as chaves do mapa curado do assistente de cadastro
		// (`_shared/registration/registration-icons.ts`); `legenda` é a linha de apoio do cartão.
		opcoes: [
			{ valor: "HOMEM", titulo: "Homem", legenda: "Perfil masculino", icone: "UserRound" },
			{ valor: "MULHER", titulo: "Mulher", legenda: "Perfil feminino", icone: "Heart" },
			{ valor: "PREFIRO_NAO_DIZER", titulo: "Prefiro não dizer", legenda: "Não informado", icone: "ShieldCheck" },
		],
	},
	"has-children": {
		chave: "has-children",
		tipo: "ESCOLHA_UNICA",
		titulo: "Tem filhos?",
		opcoes: [
			{ valor: "SIM", titulo: "Sim", legenda: "Família com filhos", icone: "Baby" },
			{ valor: "NAO", titulo: "Não", legenda: "Sem filhos", icone: "CircleUserRound" },
		],
	},
	"household-size": {
		chave: "household-size",
		tipo: "ESCOLHA_UNICA",
		titulo: "Pessoas na casa",
		descricao: "Quantas pessoas moram com o cliente, incluindo ele.",
		// O renderizador curado (stepper) vem depois; as opções são a representação canônica.
		opcoes: [
			{ valor: "1", titulo: "1", legenda: null, icone: null },
			{ valor: "2", titulo: "2", legenda: null, icone: null },
			{ valor: "3", titulo: "3", legenda: null, icone: null },
			{ valor: "4", titulo: "4", legenda: null, icone: null },
			{ valor: "5+", titulo: "5 ou mais", legenda: null, icone: null },
		],
	},
	"birth-date": {
		chave: "birth-date",
		tipo: "DATA",
		titulo: "Data de nascimento",
		writeThrough: "dataNascimento",
	},
	email: {
		chave: "email",
		tipo: "TEXTO",
		titulo: "E-mail",
		writeThrough: "email",
	},
} as const satisfies Record<string, TNativeCustomField>;

export type TNativeCustomFieldKey = keyof typeof NATIVE_CUSTOM_FIELDS;

/** Lista do catálogo, para popular seletores e para iterar na ativação em lote. */
export const NATIVE_CUSTOM_FIELD_LIST: TNativeCustomField[] = Object.values(NATIVE_CUSTOM_FIELDS);

/**
 * Resolve uma `chaveNativa` vinda do banco ou de um payload. Retorna `null` para chaves
 * desconhecidas — um campo com chave fora do catálogo é sempre um erro de entrada.
 */
export function resolveNativeCustomField(chave: string | null | undefined): TNativeCustomField | null {
	if (!chave) return null;
	const nativeField = NATIVE_CUSTOM_FIELDS[chave as TNativeCustomFieldKey] as TNativeCustomField | undefined;
	return nativeField ?? null;
}
