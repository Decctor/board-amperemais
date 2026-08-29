import assert from "node:assert/strict";
import test from "node:test";
import { assertAgentTemplateMediaPath, getAgentTemplateMediaPrefix } from "./agent-media";

test("o prefixo de mídia é isolado por organização", () => {
	assert.equal(getAgentTemplateMediaPrefix("org-1"), "public/organizations/org-1/agent-message-template-media/");
	assert.doesNotThrow(() => assertAgentTemplateMediaPath("org-1", "public/organizations/org-1/agent-message-template-media/upload-1/header.png"));
});

test("caminho de outra organização, traversal e barra invertida são recusados", () => {
	assert.throws(
		() => assertAgentTemplateMediaPath("org-1", "public/organizations/org-2/agent-message-template-media/upload/header.png"),
		/organização/,
	);
	assert.throws(() => assertAgentTemplateMediaPath("org-1", "public/organizations/org-1/agent-message-template-media/../segredo"), /organização/);
	assert.throws(
		() => assertAgentTemplateMediaPath("org-1", "public/organizations/org-1/agent-message-template-media/upload\\header.png"),
		/organização/,
	);
});
