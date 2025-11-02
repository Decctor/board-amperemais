import { v } from "convex/values";

// Pagination constants
export const CHATS_PAGE_SIZE = 20;
export const MESSAGES_PAGE_SIZE = 50;
export const MESSAGES_INITIAL_LOAD = 30;

// Pagination options validator for Convex queries
export const paginationOptsValidator = v.object({
	cursor: v.union(v.string(), v.null()),
	numItems: v.number(),
});

// Type for pagination options
export type PaginationOptions = {
	cursor: string | null;
	numItems: number;
};

// Type for paginated results
export type PaginatedResult<T> = {
	items: T[];
	hasMore: boolean;
	nextCursor: string | null;
	total?: number;
};

// Helper to create cursor from timestamp and ID
export function createCursor(timestamp: number, id: string): string {
	return `${timestamp}_${id}`;
}

// Helper to parse cursor
export function parseCursor(cursor: string): { timestamp: number; id: string } | null {
	try {
		const [timestamp, id] = cursor.split("_");
		return {
			timestamp: Number(timestamp),
			id,
		};
	} catch {
		return null;
	}
}

// Helper to create default pagination options
export function getDefaultPaginationOpts(numItems: number = CHATS_PAGE_SIZE): PaginationOptions {
	return {
		cursor: null,
		numItems,
	};
}
