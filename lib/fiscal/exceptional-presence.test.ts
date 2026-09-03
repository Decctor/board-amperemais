import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getExceptionalPresenceRestriction } from "./exceptional-presence";

const allowedInput = {
  origem: "MANUAL" as const,
  habilitada: true,
  podeConfigurarFiscal: true,
  entregaModalidade: "ENTREGA",
};

describe("getExceptionalPresenceRestriction", () => {
  it("allows a configured manual delivery emission by a fiscal configurator", () => {
    assert.equal(getExceptionalPresenceRestriction(allowedInput), null);
  });

  it("never allows the declaration in automatic emission", () => {
    assert.equal(
      getExceptionalPresenceRestriction({
        ...allowedInput,
        origem: "AUTOMATICA",
      })?.code,
      "AUTOMATIC_EMISSION",
    );
  });

  it("requires the organization flag and fiscal configuration permission", () => {
    assert.equal(
      getExceptionalPresenceRestriction({ ...allowedInput, habilitada: false })
        ?.code,
      "DISABLED",
    );
    assert.equal(
      getExceptionalPresenceRestriction({
        ...allowedInput,
        podeConfigurarFiscal: false,
      })?.code,
      "MISSING_PERMISSION",
    );
  });

  it("is restricted to delivery sales", () => {
    assert.equal(
      getExceptionalPresenceRestriction({
        ...allowedInput,
        entregaModalidade: "RETIRADA",
      })?.code,
      "NOT_DELIVERY",
    );
  });
});
