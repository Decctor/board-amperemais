import assert from "node:assert/strict";
import test from "node:test";
import { parseJsonRpcMessage } from "./protocol";

test("classifies valid JSON-RPC requests, notifications, and responses", () => {
	assert.equal(parseJsonRpcMessage({ jsonrpc: "2.0", id: 1, method: "ping" }).kind, "request");
	assert.equal(parseJsonRpcMessage({ jsonrpc: "2.0", method: "notifications/initialized" }).kind, "notification");
	assert.equal(parseJsonRpcMessage({ jsonrpc: "2.0", id: 1, result: {} }).kind, "response");
	assert.equal(parseJsonRpcMessage({ jsonrpc: "2.0", id: 1, error: { code: -32600, message: "invalid" } }).kind, "response");
});

test("rejects malformed JSON-RPC envelopes", () => {
	const malformed = [
		{},
		{ jsonrpc: "1.0", id: 1, method: "ping" },
		{ jsonrpc: "2.0", id: {}, method: "ping" },
		{ jsonrpc: "2.0", id: 1, method: "ping", params: [] },
		{ jsonrpc: "2.0", id: 1, method: "ping", result: {} },
		{ jsonrpc: "2.0", id: 1, result: {}, error: {} },
		{ jsonrpc: "2.0", id: 1 },
	];

	for (const message of malformed) assert.equal(parseJsonRpcMessage(message).kind, "invalid", JSON.stringify(message));
});
