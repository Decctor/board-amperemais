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
		text: "NÃO PODE PERDÊ-LOS",
		backgroundCollor: "bg-blue-400",
		combinations: [
			[5, 1],
			[5, 2],
		],
	},
	{
		text: "CLIENTES LEAIS",
		backgroundCollor: "bg-green-400",
		combinations: [
			[5, 3],
			[5, 4],
			[4, 3],
			[4, 4],
			[4, 5],
		],
	},
	{
		text: "CAMPEÕES",
		backgroundCollor: "bg-orange-400",
		combinations: [[5, 5]],
	},
	{
		text: "EM RISCO",
		backgroundCollor: "bg-yellow-400",
		combinations: [
			[4, 1],
			[4, 2],
			[3, 1],
			[3, 2],
		],
	},
	{
		text: "PRECISAM DE ATENÇÃO",
		backgroundCollor: "bg-indigo-400",
		combinations: [[3, 3]],
	},
	{
		text: "POTENCIAIS CLIENTES LEAIS",
		backgroundCollor: "bg-[#5C4033]",
		combinations: [
			[3, 4],
			[3, 5],
			[2, 4],
			[2, 5],
		],
	},
	{
		text: "HIBERNANDO",
		backgroundCollor: "bg-purple-400",
		combinations: [[2, 2]],
	},
	{
		text: "PRESTES A DORMIR",
		backgroundCollor: "bg-yellow-600",
		combinations: [
			[2, 3],
			[1, 3],
		],
	},
	{
		text: "PERDIDOS",
		backgroundCollor: "bg-red-500",
		combinations: [
			[2, 1],
			[1, 1],
			[1, 2],
		],
	},
	{
		text: "PROMISSORES",
		backgroundCollor: "bg-pink-400",
		combinations: [[1, 4]],
	},
	{ text: "CLIENTES RECENTES", backgroundCollor: "bg-teal-400", combinations: [[1, 5]] },
];
export const getRFMLabel = (frequency: number, recency: number) => {
	const label = RFMLabels.find((l) => l.combinations.some((c) => c[0] == frequency && c[1] == recency));

	return label?.text || "PERDIDOS";
};
