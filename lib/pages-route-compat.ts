import { NextRequest, NextResponse } from "next/server";

export type PagesRouteRequest = {
	method?: string;
	url?: string;
	query: Record<string, string | string[]>;
	body?: unknown;
	cookies: Record<string, string>;
	headers: Record<string, string>;
};

export type PagesRouteResponse<T = unknown> = {
	status: (statusCode: number) => PagesRouteResponse<T>;
	json: (body: T) => NextResponse;
	send: (body: T) => NextResponse;
	redirect: (url: string) => NextResponse;
	setHeader: (name: string, value: string | string[]) => void;
	end: (body?: T) => NextResponse;
};

export type PagesRouteHandler<T = unknown> = (req: PagesRouteRequest, res: PagesRouteResponse<T>) => Promise<unknown> | unknown;

function searchParamsToQuery(searchParams: URLSearchParams) {
	const query: Record<string, string | string[]> = {};
	for (const key of searchParams.keys()) {
		const values = searchParams.getAll(key);
		query[key] = values.length > 1 ? values : (values[0] ?? "");
	}
	return query;
}

async function getRequestBody(request: NextRequest, bodyFromSearchParam?: string) {
	if (bodyFromSearchParam) {
		const payload = request.nextUrl.searchParams.get(bodyFromSearchParam);
		if (!payload) return undefined;
		return JSON.parse(payload);
	}

	if (request.method === "GET" || request.method === "HEAD") return undefined;

	const contentType = request.headers.get("content-type") ?? "";
	if (contentType.includes("application/json")) return await request.json();
	if (contentType.includes("form")) return Object.fromEntries(await request.formData());
	return undefined;
}

export async function runPagesRouteHandler<T = unknown>({
	request,
	handler,
	bodyFromSearchParam,
}: {
	request: NextRequest;
	handler: PagesRouteHandler<T>;
	bodyFromSearchParam?: string;
}) {
	const responseHeaders = new Headers();
	let statusCode = 200;
	let sentResponse: NextResponse | null = null;

	const req: PagesRouteRequest = {
		method: request.method,
		url: request.nextUrl.pathname + request.nextUrl.search,
		query: searchParamsToQuery(request.nextUrl.searchParams),
		body: await getRequestBody(request, bodyFromSearchParam),
		cookies: Object.fromEntries(request.cookies.getAll().map((cookie) => [cookie.name, cookie.value])),
		headers: Object.fromEntries(request.headers.entries()),
	};

	const createJsonResponse = (body: T) => {
		sentResponse = NextResponse.json(body, { status: statusCode, headers: responseHeaders });
		return sentResponse;
	};
	const res: PagesRouteResponse<T> = {
		status(nextStatusCode) {
			statusCode = nextStatusCode;
			return res;
		},
		json: createJsonResponse,
		send: createJsonResponse,
		redirect(url) {
			sentResponse = NextResponse.redirect(url, { status: statusCode >= 300 && statusCode < 400 ? statusCode : 307, headers: responseHeaders });
			return sentResponse;
		},
		setHeader(name, value) {
			if (Array.isArray(value)) {
				responseHeaders.delete(name);
				for (const item of value) responseHeaders.append(name, item);
				return;
			}
			responseHeaders.set(name, value);
		},
		end(body) {
			if (body === undefined) {
				sentResponse = new NextResponse(null, { status: statusCode, headers: responseHeaders });
				return sentResponse;
			}
			return createJsonResponse(body);
		},
	};

	const result = await handler(req, res);
	if (result instanceof NextResponse) return result;
	if (sentResponse) return sentResponse;
	return new NextResponse(null, { status: statusCode, headers: responseHeaders });
}
