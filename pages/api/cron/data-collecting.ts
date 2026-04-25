import { runDataCollectingV2 } from "@/lib/data-collecting-v2";
import type { NextApiHandler } from "next";

export const config = {
	maxDuration: 300,
};

const handleDataCollecting: NextApiHandler = async (req, res) => {
	const authHeader = req.headers.authorization;
	if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
		return res.status(401).json({ message: "Unauthorized" });
	}

	console.log("[INFO] [DATA_COLLECTING_V2] Starting data collecting cron job");

	const result = await runDataCollectingV2();

	console.log("[INFO] [DATA_COLLECTING_V2] Processing concluded", {
		summaries: result.summaries.length,
		immediateInteractions: result.immediateProcessingDataList.length,
		errors: result.errors.length,
	});

	return res.status(200).json({
		data: result,
		message:
			result.errors.length > 0
				? "Coleta de dados concluída com erros em algumas organizações."
				: "Coleta de dados executada com sucesso.",
	});
};

export default handleDataCollecting;
