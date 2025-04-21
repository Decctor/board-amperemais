export type TRFMConfig = {
	identificador: "CONFIG_RFM";
	frequencia: {
		5: {
			min: number;
			max: number;
		};
		4: {
			min: number;
			max: number;
		};
		3: {
			min: number;
			max: number;
		};
		2: {
			min: number;
			max: number;
		};
		1: {
			min: number;
			max: number;
		};
	};
	recencia: {
		5: {
			min: number;
			max: number;
		};
		4: {
			min: number;
			max: number;
		};
		3: {
			min: number;
			max: number;
		};
		2: {
			min: number;
			max: number;
		};
		1: {
			min: number;
			max: number;
		};
	};
	monetario: {
		5: {
			min: number;
			max: number;
		};
		4: {
			min: number;
			max: number;
		};
		3: {
			min: number;
			max: number;
		};
		2: {
			min: number;
			max: number;
		};
		1: {
			min: number;
			max: number;
		};
	};
};

export const RFMLabels = [
	{
		text: "CAMPEÕES",
		backgroundCollor: "bg-orange-400",
		combinations: [
			[5, 5, 5],
			[5, 5, 4],
			[5, 4, 5], // Alto valor, alta frequência
			[5, 4, 4],
			[4, 5, 5], // Combinações premium
		],
	},
	{
		text: "CLIENTES LEAIS",
		backgroundCollor: "bg-green-400",
		combinations: [
			[4, 4, 4],
			[4, 4, 3],
			[4, 3, 4], // Bom desempenho geral
			[5, 3, 3],
			[4, 5, 3], // Alto valor ou frequência
		],
	},
	{
		text: "POTENCIAIS CLIENTES LEAIS",
		backgroundCollor: "bg-[#5C4033]",
		combinations: [
			[3, 4, 4],
			[3, 3, 5], // Crescimento em frequência
			[4, 3, 3],
			[3, 4, 3], // Potencial identificado
		],
	},
	{
		text: "CLIENTES RECENTES",
		backgroundCollor: "bg-teal-400",
		combinations: [
			[3, 1, 5],
			[3, 2, 5], // Novos com alto valor
			[2, 1, 4],
			[2, 2, 4], // Começando bem
		],
	},
	{
		text: "PROMISSORES",
		backgroundCollor: "bg-pink-400",
		combinations: [
			[4, 2, 3],
			[3, 2, 4], // Valor crescente
			[3, 3, 3],
			[4, 2, 2], // Desenvolvimento constante
		],
	},
	{
		text: "PRECISAM DE ATENÇÃO",
		backgroundCollor: "bg-indigo-400",
		combinations: [
			[3, 3, 2],
			[3, 2, 3], // Performance mediana
			[2, 3, 3],
			[4, 2, 1], // Valor caindo
		],
	},
	{
		text: "PRESTES A DORMIR",
		backgroundCollor: "bg-yellow-600",
		combinations: [
			[2, 2, 2],
			[3, 1, 2], // Engajamento baixo
			[2, 2, 1],
			[2, 1, 2], // Risco de perda
		],
	},
	{
		text: "EM RISCO",
		backgroundCollor: "bg-yellow-400",
		combinations: [
			[4, 1, 1],
			[3, 1, 1], // Alto valor histórico, sem engajamento
			[5, 1, 1],
			[4, 2, 1], // Urgente recuperação
		],
	},
	{
		text: "NÃO PODE PERDÊ-LOS",
		backgroundCollor: "bg-blue-400",
		combinations: [
			[5, 2, 2],
			[5, 2, 1], // Alto valor, baixo engajamento
			[5, 1, 2],
			[4, 1, 2], // Prioridade de recuperação
		],
	},
	{
		text: "HIBERNANDO",
		backgroundCollor: "bg-purple-400",
		combinations: [
			[2, 1, 1],
			[1, 2, 2], // Baixo desempenho geral
			[2, 2, 1],
			[1, 2, 1], // Quase perdidos
		],
	},
	{
		text: "PERDIDOS",
		backgroundCollor: "bg-red-500",
		combinations: [
			[1, 1, 1],
			[1, 1, 2], // Sem engajamento
			[1, 2, 1],
			[2, 1, 1], // Última tentativa
		],
	},
];
export const getRFMLabel = ({ monetary, frequency, recency }: { monetary: number; frequency: number; recency: number }) => {
	const label = RFMLabels.find((l) => l.combinations.some((c) => c[0] === monetary && c[1] === frequency && c[2] === recency));

	return label?.text || "PERDIDOS";
};
