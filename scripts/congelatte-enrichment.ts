/**
 * Camada de enriquecimento do manual Congelatte.
 *
 * A extracao (scripts/parse-congelatte-recipes.ts) e fiel ao PDF: nomes em caixa baixa,
 * acentos faltando, erros de digitacao do manual e passos em texto cru. Este modulo transforma
 * esse material em conteudo apresentavel — nomes canonicos de insumo e modo de preparo em Markdown.
 *
 * A ideia e que TODA decisao de nomenclatura viva nos dicionarios abaixo, para que a revisao
 * seja feita editando dados e nao logica. Tudo que nao esta nos dicionarios cai no title case
 * automatico e e reportado em `diagnosticos.insumosSemDicionario` do JSON de saida.
 */

// ============================================================================
// Title case pt-BR
// ============================================================================

/** Conectivos que permanecem em caixa baixa quando nao sao a primeira palavra. */
const PALAVRAS_MINUSCULAS = new Set([
	"de",
	"da",
	"do",
	"das",
	"dos",
	"com",
	"sem",
	"em",
	"e",
	"ao",
	"aos",
	"a",
	"as",
	"à",
	"no",
	"na",
	"nos",
	"nas",
	"para",
	"por",
]);

/** Termos que tem grafia propria e sobrepoem o title case (marcas, estrangeirismos, unidades). */
const TERMOS_ESPECIAIS: Record<string, string> = {
	kg: "kg",
	g: "g",
	kitkat: "KitKat",
	oreo: "Oreo",
	nutella: "Nutella",
	ovomaltine: "Ovomaltine",
	kinder: "Kinder",
	bueno: "Bueno",
	ferrero: "Ferrero",
	rocher: "Rocher",
	rafaello: "Rafaello",
	pavlova: "Pavlova",
	banoffe: "Banoffe",
	cheesecake: "Cheesecake",
	stracciatella: "Stracciatella",
	gianduia: "Gianduia",
	brunella: "Brunella",
	bombonela: "Bombonela",
	buonochoc: "Buonochoc",
	oroneso: "Oroneso",
	leitissimo: "Leitíssimo",
	leitíssimo: "Leitíssimo",
	crok: "Crok",
	pamatis: "Pamatis",
	panacota: "Panacota",
	limone: "Limone",
	senza: "Senza",
	whey: "Whey",
	yog30: "Yog30",
	maltitol: "Maltitol",
	eritritol: "Eritritol",
	zero: "Zero",
	all: "All",
};

/** Chave de comparacao: sem acento, minusculo, sem pontuacao. */
export function normalizarNome(valor: string): string {
	return valor
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9%\s]/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

/** Distancia de edicao, usada para sinalizar nomes parecidos (duplicidades e matching). */
export function distanciaLevenshtein(a: string, b: string): number {
	if (a === b) return 0;
	const linhaAnterior = Array.from({ length: b.length + 1 }, (_, i) => i);
	for (let i = 1; i <= a.length; i++) {
		let anterior = linhaAnterior[0];
		linhaAnterior[0] = i;
		for (let j = 1; j <= b.length; j++) {
			const temp = linhaAnterior[j];
			linhaAnterior[j] = Math.min(linhaAnterior[j] + 1, linhaAnterior[j - 1] + 1, anterior + (a[i - 1] === b[j - 1] ? 0 : 1));
			anterior = temp;
		}
	}
	return linhaAnterior[b.length];
}

function capitalizar(palavra: string): string {
	if (!palavra) return palavra;
	return palavra[0].toLocaleUpperCase("pt-BR") + palavra.slice(1);
}

/**
 * Title case pt-BR: primeira palavra sempre maiuscula, conectivos em minusculo,
 * termos especiais com a grafia da marca.
 */
export function titularTexto(valor: string): string {
	const palavras = valor.trim().split(/\s+/);

	return palavras
		.map((palavra, indice) => {
			const minuscula = palavra.toLocaleLowerCase("pt-BR");
			const especial = TERMOS_ESPECIAIS[minuscula];
			if (especial) return especial;
			if (indice > 0 && PALAVRAS_MINUSCULAS.has(minuscula)) return minuscula;
			// Mantem sufixos numericos/percentuais intactos (ex.: "70%", "5").
			if (/^\d/.test(minuscula)) return minuscula;
			return capitalizar(minuscula);
		})
		.join(" ");
}

// ============================================================================
// Dicionario de insumos
// ============================================================================

/**
 * Nome canonico por nome normalizado (sem acento, minusculo) vindo da extracao.
 *
 * Duas entradas apontando para o mesmo valor UNIFICAM o insumo — e assim que
 * "ovo"/"ovos"/"ovos (8 unidades)" viram um unico produto no catalogo. Toda unificacao
 * aparece em `diagnosticos.insumosUnificados` para conferencia.
 */
export const CANONICO_INSUMOS: Record<string, string> = {
	// --- variacoes de grafia / acentuacao do proprio manual ---
	"leite em po": "Leite em Pó",
	"cacau em po": "Cacau em Pó",
	"cacau em po 100%": "Cacau em Pó 100%",
	"fermento em po": "Fermento em Pó",
	fermento: "Fermento em Pó",
	"glucose em po": "Glucose em Pó",
	"bicarbonato de sodio": "Bicarbonato de Sódio",
	"suco de limao": "Suco de Limão",
	"polpa de maracuja": "Polpa de Maracujá",
	"geleia de abacaxi": "Geleia de Abacaxi",
	"creme coco malasia": "Creme Coco Malásia",
	acai: "Açaí",
	acucar: "Açúcar",
	"acucar refinado": "Açúcar Refinado",
	"acucar mascavo": "Açúcar Mascavo",
	agua: "Água",
	"pacoca zero": "Paçoca Zero",

	// --- erros de digitacao do manual ---
	"corbertura leitissimo": "Cobertura Leitíssimo",
	"cobertura leitissimo": "Cobertura Leitíssimo",
	straciatella: "Stracciatella",
	stracciatella: "Stracciatella",
	"straciatella zero": "Stracciatella Zero",
	"leite condesado": "Leite Condensado",
	"mescla leitissimo zero": "Mescla Leitíssimo Zero",
	"brunela pistache": "Brunella Pistache",

	// --- grafias concorrentes de gianduia ---
	gianduela: "Gianduia",
	"cobertura gianduiella": "Cobertura Gianduia",
	"gianduiela zero": "Cobertura Gianduia Zero",
	"gianduiella zero cobertura": "Cobertura Gianduia Zero",

	// --- ovos: a contagem entre parenteses e nota de quantidade, nao outro produto ---
	ovo: "Ovo",
	ovos: "Ovo",
	"ovos 8 unidades": "Ovo",
	"ovos 2 unidades": "Ovo",
	clara: "Clara de Ovo",
	"gema de ovo": "Gema de Ovo",

	// --- mesmo insumo escrito de duas formas ---
	"mesclado de morango": "Mesclado Morango",
	"mesclado morango": "Mesclado Morango",
	"pasta avela": "Pasta de Avelã",
	"pasta de avela": "Pasta de Avelã",
	"pasta pistache": "Pasta Pistache",
	"pasta pistachio": "Pasta Pistache",
	"creme cheese cake": "Creme Cheesecake",
	"mesclado cheese cake": "Mesclado Cheesecake",

	// --- estado de preparo nao muda o produto comprado ---
	"chocolate branco derretido": "Chocolate Branco",
	"manteiga derretida": "Manteiga",
	"chocolate 40 % derretido": "Chocolate 40%",

	// --- ajustes de plural/forma para catalogo ---
	bananas: "Banana",
	"nozes torrada": "Nozes Torradas",

	// --- tabela abreviada; o nome completo esta no modo de preparo da propria receita ---
	// 1.28: tabela diz "mescla", a prosa diz "colocando mescla Amarena na cobertura".
	mescla: "Mesclado Amarena",
	// 1.11: tabela diz "cobertura oroneso", a prosa diz "cobertura Oronero".
	"cobertura oroneso": "Mesclado Oronero",
	// 1.38: tabela diz "base zero fruta zero", a prosa diz "1 kg de base fruta zero".
	"base zero fruta zero": "Base Fruta Zero",
	"base fruta zero": "Base Fruta Zero",
	// 1.32: tabela diz "liga neutro fruta"; confirmado pela imagem do manual como o mesmo
	// produto de 1.21/1.22 (a prosa, que diz "liga neutra", e que esta imprecisa).
	"liga neutro fruta": "Neutro 5 Estrela Fruta",
	"neutro 5 estrela fruta": "Neutro 5 Estrela Fruta",
	"liga neutra": "Liga Neutra",
	// 1.24: tabela diz "pasta grão", a prosa diz "processar 480 gramas de pistache".
	"pasta grao": "Pistache",
};

export type TOrigemCanonizacao = "DICIONARIO" | "TITULO_AUTOMATICO";

export function canonizarNomeInsumo(nomeNormalizado: string, nomeOriginal: string): { nome: string; origem: TOrigemCanonizacao } {
	const doDicionario = CANONICO_INSUMOS[nomeNormalizado];
	if (doDicionario) return { nome: doDicionario, origem: "DICIONARIO" };
	return { nome: titularTexto(nomeOriginal), origem: "TITULO_AUTOMATICO" };
}

// ============================================================================
// Correcoes ortograficas da prosa (modo de preparo)
// ============================================================================

/**
 * Trocas de expressao inteira, aplicadas antes das trocas palavra a palavra.
 * Servem para palavras que a diagramacao do PDF partiu no meio ("A dicionar").
 */
const CORRECOES_DE_EXPRESSAO: [RegExp, string][] = [
	[/\bA dicionar\b/g, "Adicionar"],
	[/\bC olocar\b/g, "Colocar"],
	[/\bB ater\b/g, "Bater"],
];

/** Trocas palavra a palavra, aplicadas com preservacao de caixa. */
const CORRECOES_ORTOGRAFICAS: Record<string, string> = {
	homogenio: "homogêneo",
	homogênio: "homogêneo",
	homogeneo: "homogêneo",
	maquina: "máquina",
	ate: "até",
	apos: "após",
	extraido: "extraído",
	espatula: "espátula",
	microondas: "micro-ondas",
	corbertura: "cobertura",
	corbetura: "cobertura",
	latissimo: "Leitíssimo",
	latíssimo: "Leitíssimo",
	leitissimo: "Leitíssimo",
	straciatella: "Stracciatella",
	gianduiela: "Gianduia",
	gianduela: "Gianduia",
	avela: "avelã",
	acucar: "açúcar",
	limao: "limão",
	geléia: "geleia",
	centalizadas: "centralizadas",
};

function aplicarCaixaDoOriginal(original: string, correcao: string): string {
	if (original === original.toLocaleUpperCase("pt-BR")) return correcao.toLocaleUpperCase("pt-BR");
	if (original[0] === original[0]?.toLocaleUpperCase("pt-BR")) return capitalizar(correcao);
	return correcao;
}

/**
 * Normaliza um passo do modo de preparo: corrige erros conhecidos, arruma
 * numeros/unidades quebrados pela diagramacao e padroniza aspas e espacos.
 */
export function embelezarPasso(texto: string): { texto: string; correcoes: string[] } {
	const correcoes: string[] = [];

	let resultado = texto
		// Escapes explicitos: o manual mistura aspas retas e tipograficas na mesma frase.
		.replace(/[“”„]/g, '"')
		.replace(/[‘’]/g, "'")
		// "3 ,000 Kg" -> "3,000 Kg" (espaco solto antes da virgem decimal)
		.replace(/(\d)\s+,\s*(\d)/g, "$1,$2")
		// "3,6kg" -> "3,6 kg"
		.replace(/(\d)\s*(kg|g|ml|l)\b/gi, "$1 $2")
		// "40 %" -> "40%"
		.replace(/(\d)\s+%/g, "$1%")
		.replace(/\s+([,.;:!?])/g, "$1")
		.replace(/\s+/g, " ")
		.trim();

	for (const [padrao, substituicao] of CORRECOES_DE_EXPRESSAO) {
		if (!padrao.test(resultado)) continue;
		correcoes.push(`${resultado.match(padrao)?.[0]} -> ${substituicao}`);
		resultado = resultado.replace(padrao, substituicao);
	}

	resultado = resultado.replace(/[\p{L}\p{M}]+/gu, (palavra) => {
		const chave = palavra.toLocaleLowerCase("pt-BR");
		const correcao = CORRECOES_ORTOGRAFICAS[chave];
		if (!correcao || correcao === chave) return palavra;
		const substituida = aplicarCaixaDoOriginal(palavra, correcao);
		if (substituida !== palavra) correcoes.push(`${palavra} -> ${substituida}`);
		return substituida;
	});

	// Unidades ficam em caixa baixa ("3,000 Kg" -> "3,000 kg").
	resultado = resultado.replace(/(\d\s)(KG|Kg|G)\b/g, (_todo, numero: string, unidade: string) => `${numero}${unidade.toLowerCase()}`);

	return { texto: capitalizar(resultado), correcoes };
}

// ============================================================================
// Markdown
// ============================================================================

/** Exibe abaixo de 1 kg em gramas, que e como o manual fala na prosa. */
export function formatarQuantidade(quantidade: number): string {
	if (quantidade < 1) {
		const gramas = Math.round(quantidade * 1000);
		return `${gramas} g`;
	}
	return `${quantidade.toFixed(3).replace(".", ",")} kg`;
}

// ============================================================================
// Unidade de medida dos insumos
// ============================================================================

export type TUnidadeInsumo = "KG" | "G" | "L" | "ML";

/**
 * Insumos medidos por VOLUME (nome canonico normalizado). Nao da para inferir da quantidade —
 * e propriedade da substancia. Polpa/fruta congelada (acai, manga, morango) fica FORA daqui de
 * proposito: e comprada e pesada em kg, nao medida em litros.
 */
const INSUMOS_LIQUIDOS = new Set(["calda", "agua", "leite", "creme de leite", "leite condensado", "suco de limao"]);

function mediana(valores: number[]): number {
	if (valores.length === 0) return 0;
	const ordenados = [...valores].sort((a, b) => a - b);
	const meio = Math.floor(ordenados.length / 2);
	return ordenados.length % 2 === 1 ? ordenados[meio] : (ordenados[meio - 1] + ordenados[meio]) / 2;
}

/**
 * Escolhe a unidade "mais utilizavel" de um insumo.
 *
 * - A grandeza (massa x volume) vem de INSUMOS_LIQUIDOS: liquido usa L/ml, o resto usa kg/g.
 * - A escala (base x fracao) vem da quantidade tipica (mediana) nas receitas: >= 1 usa a
 *   unidade maior (KG/L), abaixo disso a menor (G/ML).
 *
 * Ex.: calda (liquido, mediana 3,6) -> L; suco de limao (liquido, mediana 0,02) -> ml;
 * sal (solido, mediana 0,008) -> G; acai (solido, polpa pesada, mediana 2) -> KG.
 */
export function inferirUnidadeInsumo(quantidadesKg: number[], nomeCanonico: string): TUnidadeInsumo {
	const grande = mediana(quantidadesKg) >= 1;
	const liquido = INSUMOS_LIQUIDOS.has(normalizarNome(nomeCanonico));
	if (liquido) return grande ? "L" : "ML";
	return grande ? "KG" : "G";
}

/**
 * Converte um valor em kg para a unidade do insumo. Retorna null se a unidade for desconhecida.
 *
 * Para as unidades de volume (L/ml) assume densidade ~ 1 (1 kg = 1 L = 1000 ml). E exato para
 * agua e uma aproximacao aceitavel para os demais liquidos deste manual.
 */
export function converterDeKg(quantidadeKg: number, unidade: string): number | null {
	const normalizada = unidade.trim().toUpperCase();
	if (normalizada === "KG" || normalizada === "L") return Number(quantidadeKg.toFixed(3));
	if (normalizada === "G" || normalizada === "ML") return Number((quantidadeKg * 1000).toFixed(3));
	return null;
}

export type TTipoBloco = "PASSO" | "SUBTITULO" | "ITEM_LISTA";
export type TBlocoPreparo = { tipo: TTipoBloco; texto: string };

const REGEX_SUBTITULO = /^ingredientes\b/i;
/**
 * Linha de sub-receita: "Creme de leite 200 g", "Sal: 1 g (uma pitada)".
 *
 * A quantidade precisa ENCERRAR a linha (no maximo seguida de um parentese curto) e o nome
 * nao pode ter pontuacao de frase. Sem isso, passos como "Em uma panela..., adicionar 200 g
 * de creme de leite + ..." seriam confundidos com insumos.
 */
const REGEX_ITEM_LISTA = /^([^,;.]{2,45}?):?\s+(\d+(?:[.,]\d+)?\s*(?:g|kg|ml|l))\s*(\([^)]{0,25}\))?$/i;

/**
 * Algumas sobremesas trazem uma sub-receita embutida no modo de preparo
 * ("Ingredientes da Ganache Forneável de Kinder Bueno" + linhas de insumo).
 * Sem isso, esses insumos virariam passos numerados sem sentido.
 */
export function classificarBlocosDePreparo(passos: string[]): TBlocoPreparo[] {
	const blocos: TBlocoPreparo[] = [];
	let dentroDeSubReceita = false;

	for (const passo of passos) {
		if (REGEX_SUBTITULO.test(passo)) {
			dentroDeSubReceita = true;
			blocos.push({ tipo: "SUBTITULO", texto: passo });
			continue;
		}

		if (dentroDeSubReceita && REGEX_ITEM_LISTA.test(passo)) {
			blocos.push({ tipo: "ITEM_LISTA", texto: passo });
			continue;
		}

		dentroDeSubReceita = false;
		blocos.push({ tipo: "PASSO", texto: passo });
	}

	return blocos;
}

/**
 * Markdown do modo de preparo — e o conteudo do campo `modoPreparo` da receita.
 * Passos viram lista ordenada; sub-receitas viram titulo em negrito + lista de itens.
 */
export function gerarMarkdownModoPreparo(passos: string[]): string {
	const linhas: string[] = [];
	let numeroDoPasso = 0;

	for (const bloco of classificarBlocosDePreparo(passos)) {
		if (bloco.tipo === "SUBTITULO") {
			linhas.push("", `**${bloco.texto}**`, "");
			continue;
		}
		if (bloco.tipo === "ITEM_LISTA") {
			const partes = bloco.texto.match(REGEX_ITEM_LISTA);
			if (!partes) {
				linhas.push(`- ${bloco.texto}`);
				continue;
			}
			const observacao = partes[3] ? ` ${partes[3].trim()}` : "";
			linhas.push(`- ${partes[1].trim()} — ${partes[2].trim()}${observacao}`);
			continue;
		}
		numeroDoPasso += 1;
		linhas.push(`${numeroDoPasso}. ${bloco.texto}`);
	}

	return linhas
		.join("\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

type TIngredienteMarkdown = { nome: string; quantidade: number };

/** Documento completo da receita — util para revisao e para preview na tela. */
export function gerarMarkdownReceita(dados: { titulo: string; ingredientes: TIngredienteMarkdown[]; passos: string[] }): string {
	const blocos: string[] = [`# ${dados.titulo}`];

	if (dados.ingredientes.length > 0) {
		const linhas = [
			"| Insumo | Quantidade |",
			"| --- | ---: |",
			...dados.ingredientes.map((item) => `| ${item.nome} | ${formatarQuantidade(item.quantidade)} |`),
		];
		blocos.push(`## Ingredientes\n\n${linhas.join("\n")}`);
	}

	if (dados.passos.length > 0) blocos.push(`## Modo de preparo\n\n${gerarMarkdownModoPreparo(dados.passos)}`);

	return blocos.join("\n\n");
}
