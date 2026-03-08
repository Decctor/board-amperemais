type CampaignFlowRunInput = {
	executionId: string;
	campanhaId: string;
	organizacaoId: string;
	clienteId: string;
	eventoMetadados?: Record<string, unknown> | null;
};

export async function startCampaignFlowRun(input: CampaignFlowRunInput): Promise<{ runId: string | null }> {
	const endpoint = new URL("/api/workflows/campaign-flow", getBaseAppUrl()).toString();

	const response = await fetch(endpoint, {
		method: "POST",
		headers: {
			"content-type": "application/json",
		},
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const body = await response.text().catch(() => "");
		throw new Error(`Falha ao iniciar workflow de campaign flow (${response.status}): ${body || "sem detalhes"}`);
	}

	const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
	const runId =
		typeof payload?.workflowRunId === "string"
			? payload.workflowRunId
			: typeof payload?.runId === "string"
				? payload.runId
				: typeof payload?.id === "string"
					? payload.id
					: null;

	return { runId };
}

function getBaseAppUrl(): string {
	if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
	if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
	return "http://localhost:3000";
}

export type { CampaignFlowRunInput };
