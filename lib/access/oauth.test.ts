import assert from "node:assert/strict";
import test from "node:test";
import { isValidOauthRedirectUri, OAUTH_SUPPORTED_SCOPES, resolveAccessClientCodigoForRedirectUris, verifyPkceS256Challenge } from "./oauth";

test("redirect uri validation requires https except loopback and rejects fragments", () => {
	assert.ok(isValidOauthRedirectUri("https://claude.ai/api/mcp/auth_callback"));
	assert.ok(isValidOauthRedirectUri("http://localhost:33418/callback"));
	assert.ok(isValidOauthRedirectUri("http://127.0.0.1:8080/callback"));
	assert.ok(!isValidOauthRedirectUri("http://example.com/callback"));
	assert.ok(!isValidOauthRedirectUri("https://example.com/callback#fragment"));
	assert.ok(!isValidOauthRedirectUri("custom-scheme://callback"));
	assert.ok(!isValidOauthRedirectUri("not a url"));
});

test("known redirect hosts map to catalog applications, everything else falls back to the generic client", () => {
	assert.equal(resolveAccessClientCodigoForRedirectUris(["https://claude.ai/api/mcp/auth_callback"]), "AGENT_CLAUDE");
	assert.equal(resolveAccessClientCodigoForRedirectUris(["https://claude.com/api/callback"]), "AGENT_CLAUDE");
	assert.equal(resolveAccessClientCodigoForRedirectUris(["https://chatgpt.com/connector_platform_oauth_redirect"]), "AGENT_CHATGPT");
	assert.equal(resolveAccessClientCodigoForRedirectUris(["https://cursor.com/oauth/callback"]), "AGENT_MCP");
	assert.equal(resolveAccessClientCodigoForRedirectUris(["http://localhost:3000/callback"]), "AGENT_MCP");
	// A sub-host of a known domain still counts; a lookalike suffix does not.
	assert.equal(resolveAccessClientCodigoForRedirectUris(["https://connectors.claude.ai/callback"]), "AGENT_CLAUDE");
	assert.equal(resolveAccessClientCodigoForRedirectUris(["https://evilclaude.ai/callback"]), "AGENT_MCP");
});

test("pkce s256 verification matches the RFC 7636 appendix B vector and rejects a wrong verifier", () => {
	const codeVerifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
	const codeChallenge = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";
	assert.ok(verifyPkceS256Challenge({ codeVerifier, codeChallenge }));
	assert.ok(!verifyPkceS256Challenge({ codeVerifier: `${codeVerifier}x`, codeChallenge }));
});

test("oauth self-service never offers pii or platform scopes", () => {
	assert.ok(OAUTH_SUPPORTED_SCOPES.length > 0);
	assert.ok(OAUTH_SUPPORTED_SCOPES.every((scope) => scope !== "agent:clients:pii" && !scope.startsWith("platform:")));
});
