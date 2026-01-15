import NumberInput from "@/components/Inputs/NumberInput";
import type { TRFMConfig } from "@/utils/rfm";

type RFMConfigMatrixFormProps = {
	infoHolder: TRFMConfig;
	setInfoHolder: React.Dispatch<React.SetStateAction<TRFMConfig>>;
};

export default function RFMConfigMatrixForm({ infoHolder, setInfoHolder }: RFMConfigMatrixFormProps) {
	const scores = [1, 2, 3, 4, 5] as const;

	const handleValueChange = (
		category: keyof Pick<TRFMConfig, "frequencia" | "recencia" | "monetario">,
		score: (typeof scores)[number],
		field: "min" | "max",
		value: number,
	) => {
		setInfoHolder((prev) => ({
			...prev,
			[category]: {
				...prev[category],
				[score]: {
					...prev[category][score],
					[field]: value,
				},
			},
		}));
	};

	return (
		<div className="w-full flex flex-col gap-4">
			<div className="w-full flex items-center gap-2 font-bold text-muted-foreground border-b pb-2">
				<h1 className="w-1/12 text-center">NOTA</h1>
				<h1 className="w-[30%] text-center">FREQUÊNCIA</h1>
				<h1 className="w-[30%] text-center">RECÊNCIA</h1>
				<h1 className="w-[30%] text-center">MONETÁRIO</h1>
			</div>

			{scores.map((score) => (
				<div key={score} className="w-full flex items-center gap-2 py-2 border-b last:border-0">
					<h1 className="w-1/12 text-center font-bold text-lg">{score}</h1>

					{/* Frequência */}
					<div className="w-[30%] flex items-center gap-1 flex-col lg:flex-row">
						<div className="w-full lg:w-1/2">
							<NumberInput
								label="MÍN"
								placeholder="Mín"
								value={infoHolder.frequencia[score].min}
								handleChange={(value) => handleValueChange("frequencia", score, "min", value)}
								width="100%"
							/>
						</div>
						<div className="w-full lg:w-1/2">
							<NumberInput
								label="MÁX"
								placeholder="Máx"
								value={infoHolder.frequencia[score].max}
								handleChange={(value) => handleValueChange("frequencia", score, "max", value)}
								width="100%"
							/>
						</div>
					</div>

					{/* Recência */}
					<div className="w-[30%] flex items-center gap-1 flex-col lg:flex-row">
						<div className="w-full lg:w-1/2">
							<NumberInput
								label="MÍN"
								placeholder="Mín"
								value={infoHolder.recencia[score].min}
								handleChange={(value) => handleValueChange("recencia", score, "min", value)}
								width="100%"
							/>
						</div>
						<div className="w-full lg:w-1/2">
							<NumberInput
								label="MÁX"
								placeholder="Máx"
								value={infoHolder.recencia[score].max}
								handleChange={(value) => handleValueChange("recencia", score, "max", value)}
								width="100%"
							/>
						</div>
					</div>

					{/* Monetário */}
					<div className="w-[30%] flex items-center gap-1 flex-col lg:flex-row">
						<div className="w-full lg:w-1/2">
							<NumberInput
								label="MÍN"
								placeholder="Mín"
								value={infoHolder.monetario[score].min}
								handleChange={(value) => handleValueChange("monetario", score, "min", value)}
								width="100%"
							/>
						</div>
						<div className="w-full lg:w-1/2">
							<NumberInput
								label="MÁX"
								placeholder="Máx"
								value={infoHolder.monetario[score].max}
								handleChange={(value) => handleValueChange("monetario", score, "max", value)}
								width="100%"
							/>
						</div>
					</div>
				</div>
			))}
		</div>
	);
}
