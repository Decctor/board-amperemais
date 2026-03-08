import { type NextRequest, NextResponse } from "next/server";

type WorkflowContext<TPayload> = {
	requestPayload: TPayload;
	sleep: (label: string, durationMs: number) => Promise<void>;
};

export function serve<TPayload>(handler: (context: WorkflowContext<TPayload>) => Promise<unknown>) {
	return async function workflowHandler(request: NextRequest) {
		const requestPayload = (await request.json()) as TPayload;

		const data = await handler({
			requestPayload,
			sleep: async (_label, durationMs) => {
				if (!Number.isFinite(durationMs) || durationMs <= 0) return;
				await new Promise((resolve) => setTimeout(resolve, Math.min(durationMs, 2_147_483_647)));
			},
		});

		return NextResponse.json(data);
	};
}

export type { WorkflowContext };
